import {
    cleanNumber,
    timestampToTime,
    timeToTimestamp,
    validate24HourTime,
    validateIpAddress,
    validateMin,
    validatePort
} from "../../utils";
import StringConnectionsFilter from "./StringConnectionsFilter";
import React from "react";
import RulesConnectionsFilter from "./RulesConnectionsFilter";
import BooleanConnectionsFilter from "./BooleanConnectionsFilter";

export const filtersNames = ["service_port", "matched_rules", "client_address", "client_port",
    "min_duration", "max_duration", "min_bytes", "max_bytes", "started_after",
    "started_before", "closed_after", "closed_before", "marked", "hidden"];

export const filtersDefinitions = {
    service_port: <StringConnectionsFilter filterName="service_port"
                                           defaultFilterValue="all_ports"
                                           replaceFunc={cleanNumber}
                                           validateFunc={validatePort}
                                           key="service_port_filter"
                                           width={200} />,
    matched_rules: <RulesConnectionsFilter />,
    client_address: <StringConnectionsFilter filterName="client_address"
                                             defaultFilterValue="all_addresses"
                                             validateFunc={validateIpAddress}
                                             key="client_address_filter"
                                             width={320} />,
    client_port: <StringConnectionsFilter filterName="client_port"
                                          defaultFilterValue="all_ports"
                                          replaceFunc={cleanNumber}
                                          validateFunc={validatePort}
                                          key="client_port_filter"
                                          width={200} />,
    min_duration: <StringConnectionsFilter filterName="min_duration"
                                           defaultFilterValue="0"
                                           replaceFunc={cleanNumber}
                                           validateFunc={validateMin(0)}
                                           key="min_duration_filter"
                                           width={200} />,
    max_duration: <StringConnectionsFilter filterName="max_duration"
                                           defaultFilterValue="∞"
                                           replaceFunc={cleanNumber}
                                           key="max_duration_filter"
                                           width={200} />,
    min_bytes: <StringConnectionsFilter filterName="min_bytes"
                                        defaultFilterValue="0"
                                        replaceFunc={cleanNumber}
                                        validateFunc={validateMin(0)}
                                        key="min_bytes_filter"
                                        width={200} />,
    max_bytes: <StringConnectionsFilter filterName="max_bytes"
                                        defaultFilterValue="∞"
                                        replaceFunc={cleanNumber}
                                        key="max_bytes_filter"
                                        width={200} />,
    started_after: <StringConnectionsFilter filterName="started_after"
                                            defaultFilterValue="00:00:00"
                                            validateFunc={validate24HourTime}
                                            encodeFunc={timeToTimestamp}
                                            decodeFunc={timestampToTime}
                                            key="started_after_filter"
                                            width={200} />,
    started_before: <StringConnectionsFilter filterName="started_before"
                                             defaultFilterValue="00:00:00"
                                             validateFunc={validate24HourTime}
                                             encodeFunc={timeToTimestamp}
                                             decodeFunc={timestampToTime}
                                             key="started_before_filter"
                                             width={200} />,
    closed_after: <StringConnectionsFilter filterName="closed_after"
                                           defaultFilterValue="00:00:00"
                                           validateFunc={validate24HourTime}
                                           encodeFunc={timeToTimestamp}
                                           decodeFunc={timestampToTime}
                                           key="closed_after_filter"
                                           width={200} />,
    closed_before: <StringConnectionsFilter filterName="closed_before"
                                            defaultFilterValue="00:00:00"
                                            validateFunc={validate24HourTime}
                                            encodeFunc={timeToTimestamp}
                                            decodeFunc={timestampToTime}
                                            key="closed_before_filter"
                                            width={200} />,
    marked: <BooleanConnectionsFilter filterName={"marked"} />,
    hidden: <BooleanConnectionsFilter filterName={"hidden"} />
};
