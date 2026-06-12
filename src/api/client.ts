import type { RequestEnvelope } from './types';

export type ApiErrorKind = 'http' | 'server' | 'network' | 'auth';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly route: string;
  readonly status: number | null;

  constructor(kind: ApiErrorKind, route: string, message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  }

  async post(route: string, params: Record<string, string>): Promise<unknown> {
    const body = new URLSearchParams(params);
    let response: Response;
    try {
      response = await fetch(new URL(route, this.baseUrl), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (cause) {
      throw new ApiError('network', route, cause instanceof Error ? cause.message : 'fetch failed');
    }
    if (response.status === 401 || response.status === 403) {
      throw new ApiError('auth', route, `Not authorized (${response.status})`, response.status);
    }
    if (!response.ok) {
      throw new ApiError('http', route, `HTTP ${response.status}`, response.status);
    }
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new ApiError('http', route, 'Response was not valid JSON', response.status);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function encodeParams(params: RequestParams): Record<string, string> {
  const encoded: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }
    encoded[key] = typeof value === 'string' ? value : String(value);
  }
  return encoded;
}

export type EnvelopeProvider = () => Omit<RequestEnvelope, 'timestamp' | 'timezone'>;

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
      throw new ApiError('server', route, 'Malformed response body');
    }
    if (body.success !== true) {
      const message =
        typeof body.message === 'string' ? body.message : 'The server reported a failure';
      throw new ApiError('server', route, message);
    }
    return body;
  }
}
