import { createContext, useContext } from "react";
import type { BlockPyApiClient } from "./client";
import type { EventLog } from "./endpoints/events";

export interface ApiContextValue {
    client: BlockPyApiClient;
    events: EventLog;
}

export const ApiContext = createContext<ApiContextValue | null>(null);

export function useApi(): ApiContextValue {
    const value = useContext(ApiContext);
    if (!value) {
        throw new Error("useApi must be used within an ApiProvider");
    }
    return value;
}
