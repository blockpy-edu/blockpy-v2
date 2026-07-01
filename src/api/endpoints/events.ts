import type { BlockPyApiClient } from "../client";
import type { LogEventEntry } from "../types";

const MAX_QUEUE_LENGTH = 100;

/**
 * Fire-and-forget event logging (docs/architecture/01 §3 rule 3).
 * Events are queued and flushed sequentially via blockpy/log_event;
 * failures never reject into UI code paths. The queue is bounded: under a
 * persistent outage the oldest events are dropped.
 */
export class EventLog {
    private readonly client: BlockPyApiClient;
    private readonly queue: LogEventEntry[] = [];
    private inFlight: Promise<void> | null = null;

    constructor(client: BlockPyApiClient) {
        this.client = client;
    }

    log(entry: LogEventEntry): void {
        this.queue.push(entry);
        if (this.queue.length > MAX_QUEUE_LENGTH) {
            this.queue.splice(0, this.queue.length - MAX_QUEUE_LENGTH);
        }
        void this.flush();
    }

    /** Drains the queue; resolves when it is empty or a send fails. */
    flush(): Promise<void> {
        this.inFlight ??= this.drain().finally(() => {
            this.inFlight = null;
        });
        return this.inFlight;
    }

    private async drain(): Promise<void> {
        while (this.queue.length > 0) {
            const entry = this.queue[0];
            try {
                await this.client.post("blockpy/log_event", {
                    event_type: entry.event_type,
                    file_path: entry.file_path,
                    category: entry.category,
                    label: entry.label,
                    message: entry.message,
                    extended: entry.extended,
                });
            } catch {
                // Leave the entry queued; a later log()/flush() retries.
                return;
            }
            this.queue.shift();
        }
    }

    get pendingCount(): number {
        return this.queue.length;
    }
}
