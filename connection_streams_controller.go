package main

import (
	"bytes"
	"context"
	"github.com/eciavatta/caronte/parsers"
	log "github.com/sirupsen/logrus"
	"time"
)

const InitialPayloadsSize = 1024
const DefaultQueryFormatLimit = 8024
const InitialRegexSlicesCount = 8

type ConnectionStream struct {
	ID               RowID                   `bson:"_id"`
	ConnectionID     RowID                   `bson:"connection_id"`
	FromClient       bool                    `bson:"from_client"`
	DocumentIndex    int                     `bson:"document_index"`
	Payload          []byte                  `bson:"payload"`
	BlocksIndexes    []int                   `bson:"blocks_indexes"`
	BlocksTimestamps []time.Time             `bson:"blocks_timestamps"`
	BlocksLoss       []bool                  `bson:"blocks_loss"`
	PatternMatches   map[uint][]PatternSlice `bson:"pattern_matches"`
}

type PatternSlice [2]uint64

type Payload struct {
	FromClient             bool             `json:"from_client"`
	Content                string           `json:"content"`
	Metadata               parsers.Metadata `json:"metadata"`
	IsMetadataContinuation bool             `json:"is_metadata_continuation"`
	Index                  int              `json:"index"`
	Timestamp              time.Time        `json:"timestamp"`
	IsRetransmitted        bool             `json:"is_retransmitted"`
	RegexMatches           []RegexSlice     `json:"regex_matches"`
}

type RegexSlice struct {
	From uint64 `json:"from"`
	To   uint64 `json:"to"`
}

type QueryFormat struct {
	Format string `form:"format"`
	Skip   uint64 `form:"skip"`
	Limit  uint64 `form:"limit"`
}

type ConnectionStreamsController struct {
	storage Storage
}

func NewConnectionStreamsController(storage Storage) ConnectionStreamsController {
	return ConnectionStreamsController{
		storage: storage,
	}
}

func (csc ConnectionStreamsController) GetConnectionPayload(c context.Context, connectionID RowID,
	format QueryFormat) []*Payload {
	payloads := make([]*Payload, 0, InitialPayloadsSize)
	var clientIndex, serverIndex, globalIndex uint64

	if format.Limit <= 0 {
		format.Limit = DefaultQueryFormatLimit
	}

	var clientBlocksIndex, serverBlocksIndex int
	var clientDocumentIndex, serverDocumentIndex int
	clientStream := csc.getConnectionStream(c, connectionID, true, clientDocumentIndex)
	serverStream := csc.getConnectionStream(c, connectionID, false, serverDocumentIndex)

	hasClientBlocks := func() bool {
		return clientBlocksIndex < len(clientStream.BlocksIndexes)
	}
	hasServerBlocks := func() bool {
		return serverBlocksIndex < len(serverStream.BlocksIndexes)
	}

	var payload *Payload
	payloadsBuffer := make([]*Payload, 0, 16)
	contentChunkBuffer := new(bytes.Buffer)
	var lastContentSlice []byte
	var sideChanged, lastClient, lastServer bool
	for !clientStream.ID.IsZero() || !serverStream.ID.IsZero() {
		if hasClientBlocks() && (!hasServerBlocks() || // next payload is from client
			clientStream.BlocksTimestamps[clientBlocksIndex].UnixNano() <=
				serverStream.BlocksTimestamps[serverBlocksIndex].UnixNano()) {
			start := clientStream.BlocksIndexes[clientBlocksIndex]
			end := 0
			if clientBlocksIndex < len(clientStream.BlocksIndexes)-1 {
				end = clientStream.BlocksIndexes[clientBlocksIndex+1]
			} else {
				end = len(clientStream.Payload)
			}
			size := uint64(end - start)

			payload = &Payload{
				FromClient:      true,
				Content:         DecodeBytes(clientStream.Payload[start:end], format.Format),
				Index:           start,
				Timestamp:       clientStream.BlocksTimestamps[clientBlocksIndex],
				IsRetransmitted: clientStream.BlocksLoss[clientBlocksIndex],
				RegexMatches:    findMatchesBetween(clientStream.PatternMatches, clientIndex, clientIndex+size),
			}
			clientIndex += size
			globalIndex += size
			clientBlocksIndex++

			lastContentSlice = clientStream.Payload[start:end]
			sideChanged, lastClient, lastServer = lastServer, true, false
		} else { // next payload is from server
			start := serverStream.BlocksIndexes[serverBlocksIndex]
			end := 0
			if serverBlocksIndex < len(serverStream.BlocksIndexes)-1 {
				end = serverStream.BlocksIndexes[serverBlocksIndex+1]
			} else {
				end = len(serverStream.Payload)
			}
			size := uint64(end - start)

			payload = &Payload{
				FromClient:      false,
				Content:         DecodeBytes(serverStream.Payload[start:end], format.Format),
				Index:           start,
				Timestamp:       serverStream.BlocksTimestamps[serverBlocksIndex],
				IsRetransmitted: serverStream.BlocksLoss[serverBlocksIndex],
				RegexMatches:    findMatchesBetween(serverStream.PatternMatches, serverIndex, serverIndex+size),
			}
			serverIndex += size
			globalIndex += size
			serverBlocksIndex++

			lastContentSlice = serverStream.Payload[start:end]
			sideChanged, lastClient, lastServer = lastClient, false, true
		}

		if !hasClientBlocks() {
			clientDocumentIndex++
			clientBlocksIndex = 0
			clientStream = csc.getConnectionStream(c, connectionID, true, clientDocumentIndex)
		}
		if !hasServerBlocks() {
			serverDocumentIndex++
			serverBlocksIndex = 0
			serverStream = csc.getConnectionStream(c, connectionID, false, serverDocumentIndex)
		}

		updateMetadata := func() {
			metadata := parsers.Parse(contentChunkBuffer.Bytes())
			var isMetadataContinuation bool
			for _, elem := range payloadsBuffer {
				elem.Metadata = metadata
				elem.IsMetadataContinuation = isMetadataContinuation
				isMetadataContinuation = true
			}

			payloadsBuffer = payloadsBuffer[:0]
			contentChunkBuffer.Reset()
		}

		if sideChanged {
			updateMetadata()
		}
		payloadsBuffer = append(payloadsBuffer, payload)
		contentChunkBuffer.Write(lastContentSlice)

		if clientStream.ID.IsZero() && serverStream.ID.IsZero() {
			updateMetadata()
		}

		if globalIndex > format.Skip {
			// problem: waste of time if the payload is discarded
			payloads = append(payloads, payload)
		}
		if globalIndex > format.Skip+format.Limit {
			// problem: the last chunk is not parsed, but can be ok because it is not finished
			updateMetadata()
			return payloads
		}
	}

	return payloads
}

func (csc ConnectionStreamsController) getConnectionStream(c context.Context, connectionID RowID, fromClient bool,
	documentIndex int) ConnectionStream {
	var result ConnectionStream
	if err := csc.storage.Find(ConnectionStreams).Filter(OrderedDocument{
		{"connection_id", connectionID},
		{"from_client", fromClient},
		{"document_index", documentIndex},
	}).Context(c).First(&result); err != nil {
		log.WithError(err).WithField("connection_id", connectionID).Panic("failed to get a ConnectionStream")
	}
	return result
}

func findMatchesBetween(patternMatches map[uint][]PatternSlice, from, to uint64) []RegexSlice {
	regexSlices := make([]RegexSlice, 0, InitialRegexSlicesCount)
	for _, slices := range patternMatches {
		for _, slice := range slices {
			if from > slice[1] || to <= slice[0] {
				continue
			}

			log.Info(slice[0], slice[1], from, to)
			var start, end uint64
			if from > slice[0] {
				start = 0
			} else {
				start = slice[0] - from
			}

			if to <= slice[1] {
				end = to - from
			} else {
				end = slice[1] - from
			}

			regexSlices = append(regexSlices, RegexSlice{From: start, To: end})
		}
	}
	return regexSlices
}
