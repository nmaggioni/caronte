import React, {Component} from 'react';
import './PcapPane.scss';
import './common.scss';
import Table from "react-bootstrap/Table";
import backend from "../../backend";
import {createCurlCommand, dateTimeToTime, durationBetween, formatSize} from "../../utils";
import InputField from "../fields/InputField";
import CheckField from "../fields/CheckField";
import TextField from "../fields/TextField";
import ButtonField from "../fields/ButtonField";
import LinkPopover from "../objects/LinkPopover";

class PcapPane extends Component {

    constructor(props) {
        super(props);

        this.state = {
            sessions: [],
            isUploadFileValid: true,
            isUploadFileFocused: false,
            uploadFlushAll: false,
            isFileValid: true,
            isFileFocused: false,
            fileValue: "",
            processFlushAll: false,
            deleteOriginalFile: false
        };
    }

    componentDidMount() {
        this.loadSessions();
    }

    loadSessions = () => {
        backend.get("/api/pcap/sessions")
            .then(res => this.setState({sessions: res.json, sessionsStatusCode: res.status}))
            .catch(res => this.setState({
                sessions: res.json, sessionsStatusCode: res.status,
                sessionsResponse: JSON.stringify(res.json)
            }));
    };

    uploadPcap = () => {
        if (this.state.uploadSelectedFile == null || !this.state.isUploadFileValid) {
            this.setState({isUploadFileFocused: true});
            return;
        }

        const formData = new FormData();
        formData.append("file", this.state.uploadSelectedFile);
        formData.append("flush_all", this.state.uploadFlushAll);
        backend.postFile("/api/pcap/upload", formData).then(res => {
            this.setState({
                uploadStatusCode: res.status,
                uploadResponse: JSON.stringify(res.json)
            });
            this.resetUpload();
            this.loadSessions();
        }).catch(res => this.setState({
                uploadStatusCode: res.status,
                uploadResponse: JSON.stringify(res.json)
            })
        );
    };

    processPcap = () => {
        if (this.state.fileValue === "" || !this.state.isFileValid) {
            this.setState({isFileFocused: true});
            return;
        }

        backend.post("/api/pcap/file", {
            file: this.state.fileValue,
            flush_all: this.state.processFlushAll,
            delete_original_file: this.state.deleteOriginalFile
        }).then(res => {
            this.setState({
                processStatusCode: res.status,
                processResponse: JSON.stringify(res.json)
            });
            this.resetProcess();
            this.loadSessions();
        }).catch(res => this.setState({
                processStatusCode: res.status,
                processResponse: JSON.stringify(res.json)
            })
        );
    };

    resetUpload = () => {
        this.setState({
            isUploadFileValid: true,
            isUploadFileFocused: false,
            uploadFlushAll: false,
            uploadSelectedFile: null
        });
    };

    resetProcess = () => {
        this.setState({
            isFileValid: true,
            isFileFocused: false,
            fileValue: "",
            processFlushAll: false,
            deleteOriginalFile: false,
        });
    };

    render() {
        let sessions = this.state.sessions.map(s =>
            <tr key={s.id} className="table-row">
                <td>{s["id"].substring(0, 8)}</td>
                <td>{dateTimeToTime(s["started_at"])}</td>
                <td>{durationBetween(s["started_at"], s["completed_at"])}</td>
                <td>{formatSize(s["size"])}</td>
                <td>{s["processed_packets"]}</td>
                <td>{s["invalid_packets"]}</td>
                <td><LinkPopover text={Object.keys(s["packets_per_service"]).length + " services"}
                                 content={JSON.stringify(s["packets_per_service"])}
                                 placement="left"/></td>
                <td className="table-cell-action"><a href={"/api/pcap/sessions/" + s["id"] + "/download"}>download</a>
                </td>
            </tr>
        );

        const handleUploadFileChange = (file) => {
            this.setState({
                isUploadFileValid: file == null || (file.type.endsWith("pcap") || file.type.endsWith("pcapng")),
                isUploadFileFocused: false,
                uploadSelectedFile: file,
                uploadStatusCode: null,
                uploadResponse: null
            });
        };

        const handleFileChange = (file) => {
            this.setState({
                isFileValid: (file.endsWith("pcap") || file.endsWith("pcapng")),
                isFileFocused: false,
                fileValue: file,
                processStatusCode: null,
                processResponse: null
            });
        };

        const uploadCurlCommand = createCurlCommand("pcap/upload", "POST", null, {
            file: "@" + ((this.state.uploadSelectedFile != null && this.state.isUploadFileValid) ?
                this.state.uploadSelectedFile.name : "invalid.pcap"),
            flush_all: this.state.uploadFlushAll
        });

        const fileCurlCommand = createCurlCommand("pcap/file", "POST", {
            file: this.state.fileValue,
            flush_all: this.state.processFlushAll,
            delete_original_file: this.state.deleteOriginalFile
        });

        return (
            <div className="pane-container pcap-pane">
                <div className="pane-section pcap-list">
                    <div className="section-header">
                        <span className="api-request">GET /api/pcap/sessions</span>
                        <span className="api-response"><LinkPopover text={this.state.sessionsStatusCode}
                                                                    content={this.state.sessionsResponse}
                                                                    placement="left"/></span>
                    </div>

                    <div className="section-content">
                        <div className="section-table">
                            <Table borderless size="sm">
                                <thead>
                                <tr>
                                    <th>id</th>
                                    <th>started_at</th>
                                    <th>duration</th>
                                    <th>size</th>
                                    <th>processed_packets</th>
                                    <th>invalid_packets</th>
                                    <th>packets_per_service</th>
                                    <th>actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {sessions}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                </div>

                <div className="double-pane-container">
                    <div className="pane-section">
                        <div className="section-header">
                            <span className="api-request">POST /api/pcap/upload</span>
                            <span className="api-response"><LinkPopover text={this.state.uploadStatusCode}
                                                                        content={this.state.uploadResponse}
                                                                        placement="left"/></span>
                        </div>

                        <div className="section-content">
                            <InputField type={"file"} name={"file"} invalid={!this.state.isUploadFileValid}
                                        active={this.state.isUploadFileFocused}
                                        onChange={handleUploadFileChange} value={this.state.uploadSelectedFile}
                                        placeholder={"no .pcap[ng] selected"}/>
                            <div className="upload-actions">
                                <div className="upload-options">
                                    <span>options:</span>
                                    <CheckField name="flush_all" checked={this.state.uploadFlushAll}
                                                onChange={v => this.setState({uploadFlushAll: v})}/>
                                </div>
                                <ButtonField variant="green" bordered onClick={this.uploadPcap} name="upload"/>
                            </div>

                            <TextField value={uploadCurlCommand} rows={4} readonly small={true}/>
                        </div>
                    </div>

                    <div className="pane-section">
                        <div className="section-header">
                            <span className="api-request">POST /api/pcap/file</span>
                            <span className="api-response"><LinkPopover text={this.state.processStatusCode}
                                                                        content={this.state.processResponse}
                                                                        placement="left"/></span>
                        </div>

                        <div className="section-content">
                            <InputField name="file" active={this.state.isFileFocused} invalid={!this.state.isFileValid}
                                        onChange={handleFileChange} value={this.state.fileValue}
                                        placeholder={"local .pcap[ng] path"} inline/>

                            <div className="upload-actions" style={{"marginTop": "11px"}}>
                                <div className="upload-options">
                                    <CheckField name="flush_all" checked={this.state.processFlushAll}
                                                onChange={v => this.setState({processFlushAll: v})}/>
                                    <CheckField name="delete_original_file" checked={this.state.deleteOriginalFile}
                                                onChange={v => this.setState({deleteOriginalFile: v})}/>
                                </div>
                                <ButtonField variant="blue" bordered onClick={this.processPcap} name="process"/>
                            </div>

                            <TextField value={fileCurlCommand} rows={4} readonly small={true}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default PcapPane;
