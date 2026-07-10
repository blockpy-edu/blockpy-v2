import type { RequestEnvelope } from "./types";

export type ApiErrorKind = "http" | "server" | "network" | "auth";

export class ApiError extends Error {
    readonly kind: ApiErrorKind;
    readonly route: string;
    readonly status: number | null;

    constructor(kind: ApiErrorKind, route: string, message: string, status: number | null = null) {
        super(message);
        this.name = "ApiError";
        this.kind = kind;
        this.route = route;
        this.status = status;
    }
}

/** Values accepted as request parameters; encoded as form fields. */
export type ParamValue = string | number | boolean | null | undefined;
export type RequestParams = Record<string, ParamValue>;

/**
 * Transports perform raw I/O for one form-encoded POST and return the parsed
 * JSON body. The offline transport implements routes locally
 * (docs/architecture/01 §3 rule 2).
 */
export interface Transport {
    post(route: string, params: Record<string, string>): Promise<unknown>;
}

export class HttpTransport implements Transport {
    private readonly baseUrl: string;
    private readonly accessToken: string;

    constructor(baseUrl: string, accessToken = "") {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
        this.accessToken = accessToken;
    }

    async post(route: string, params: Record<string, string>): Promise<unknown> {
        return postForm(String(new URL(route, this.baseUrl)), route, params, this.accessToken);
    }
}

/**
 * Maps internal route names to the legacy `$blockPyUrls` camelCase keys the
 * blockpy-server templates render (templates/blockpy/editor.html). Routes
 * without a key fall back to a base URL derived from `loadAssignment`.
 */
const LEGACY_URL_KEYS: Record<string, string> = {
    "blockpy/load_assignment": "loadAssignment",
    "blockpy/save_assignment": "saveAssignment",
    "blockpy/save_file": "saveFile",
    "blockpy/log_event": "logEvent",
    "blockpy/load_history": "loadHistory",
    "blockpy/update_submission": "updateSubmission",
    "blockpy/update_submission_status": "updateSubmissionStatus",
    "blockpy/upload_file": "uploadFile",
    "blockpy/download_file": "downloadFile",
    "blockpy/rename_file": "renameFile",
    "blockpy/list_files": "listUploadedFiles",
    "blockpy/save_image": "saveImage",
};

/**
 * Derives the server root from a legacy URL map so routes that have no
 * explicit entry (e.g. assignments/get_ids) can still be reached. The
 * loadAssignment URL always ends in "blockpy/load_assignment".
 */
export function deriveBaseUrl(urls: Record<string, string>): string | null {
    const known = urls.loadAssignment ?? urls.saveFile ?? urls.logEvent;
    if (!known) {
        return null;
    }
    const withoutQuery = known.split("?")[0];
    const marker = withoutQuery.indexOf("/blockpy/");
    if (marker === -1) {
        return null;
    }
    return withoutQuery.slice(0, marker + 1);
}

/**
 * Transport for legacy blockpy-server mounts: the template provides one URL
 * per endpoint instead of a base URL. Unmapped routes resolve against the
 * derived server root.
 */
export class UrlMapTransport implements Transport {
    private readonly urls: Record<string, string>;
    private readonly fallback: HttpTransport | null;
    private readonly accessToken: string;

    constructor(urls: Record<string, string>, accessToken = "") {
        this.urls = urls;
        const base = urls.base ?? deriveBaseUrl(urls);
        this.fallback = base ? new HttpTransport(base, accessToken) : null;
        this.accessToken = accessToken;
    }

    async post(route: string, params: Record<string, string>): Promise<unknown> {
        const key = LEGACY_URL_KEYS[route];
        const target = key ? this.urls[key] : undefined;
        if (!target) {
            if (!this.fallback) {
                throw new ApiError("network", route, `No URL configured for ${route}`);
            }
            return this.fallback.post(route, params);
        }
        return postForm(target, route, params, this.accessToken);
    }
}

async function postForm(
    url: string,
    route: string,
    params: Record<string, string>,
    accessToken: string,
): Promise<unknown> {
    const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
    };
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }
    let response: Response;
    try {
        response = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers,
            body: new URLSearchParams(params),
        });
    } catch (cause) {
        throw new ApiError(
            "network",
            route,
            cause instanceof Error ? cause.message : "fetch failed",
        );
    }
    if (response.status === 401 || response.status === 403) {
        throw new ApiError("auth", route, `Not authorized (${response.status})`, response.status);
    }
    if (!response.ok) {
        throw new ApiError("http", route, `HTTP ${response.status}`, response.status);
    }
    try {
        return (await response.json()) as unknown;
    } catch {
        throw new ApiError("http", route, "Response was not valid JSON", response.status);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encodeParams(params: RequestParams): Record<string, string> {
    const encoded: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined) {
            continue;
        }
        encoded[key] = typeof value === "string" ? value : String(value);
    }
    return encoded;
}

export type EnvelopeProvider = () => Omit<RequestEnvelope, "timestamp" | "timezone">;

/**
 * The single API entry point: injects the request envelope, form-encodes,
 * parses the `{success}` convention, and converts failures into ApiError
 * (docs/architecture/01 §3 rule 1).
 */
export class BlockPyApiClient {
    private readonly transport: Transport;
    private readonly getEnvelope: EnvelopeProvider;

    constructor(transport: Transport, getEnvelope: EnvelopeProvider) {
        this.transport = transport;
        this.getEnvelope = getEnvelope;
    }

    /**
     * POST with the session envelope merged in. Explicit params override
     * envelope fields, so endpoint wrappers can target other ids.
     */
    async post(route: string, params: RequestParams = {}): Promise<Record<string, unknown>> {
        const now = new Date();
        const envelope: RequestEnvelope = {
            ...this.getEnvelope(),
            timestamp: now.getTime(),
            timezone: now.getTimezoneOffset(),
        };
        const merged = encodeParams({ ...envelope, ...params });
        const body = await this.transport.post(route, merged);
        if (!isRecord(body)) {
            throw new ApiError("server", route, "Malformed response body");
        }
        if (body.success !== true) {
            const message =
                typeof body.message === "string" ? body.message : "The server reported a failure";
            throw new ApiError("server", route, message);
        }
        return body;
    }
}
