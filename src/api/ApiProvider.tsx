import { useMemo } from "react";
import type { ReactNode } from "react";
import { EventLog } from "./endpoints/events";
import { ApiContext } from "./useApi";
import type { BlockPyApiClient } from "./client";

interface ApiProviderProps {
    client: BlockPyApiClient;
    /** Optional shared EventLog; created from the client when omitted. */
    events?: EventLog;
    children: ReactNode;
}

export function ApiProvider({ client, events, children }: ApiProviderProps) {
    const value = useMemo(
        () => ({ client, events: events ?? new EventLog(client) }),
        [client, events],
    );
    return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}
