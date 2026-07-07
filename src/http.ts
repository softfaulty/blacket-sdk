import type { BlacketJson, BlacketRecord, BlacketUploadFile, BlacketUploadResponse } from "./types";

/**
 * options for {@link BlacketClient} and the low-level http helper
 */
export type BlacketClientOptions = {
    /**
     * api origin (defaults to `https://blacket.org`)
     */
    baseUrl?: string;
    /**
     * raw cookie header value used for authenticated requests
     */
    cookie?: string;
    /**
     * extra headers added to every http and socket request
     */
    headers?: HeadersInit;
    /**
     * request timeout in milliseconds. defaults to 10000 (10s)
     */
    timeoutMs?: number;
    /**
     * number of times to retry 503 responses. defaults to 2
     */
    retry503?: number;
    /**
     * custom fetch implementation for tests or alternate runtimes
     */
    fetch?: typeof fetch;
};

type RequestOptions = {
    method: "GET" | "POST";
    body?: BlacketJson | BlacketRecord;
    headers?: HeadersInit;
};

/**
 * thrown when blacket returns a non-json or otherwise unwrapped failed response
 */
export class BlacketHttpError extends Error {
    /**
     * http response status
     */
    readonly status: number;
    /**
     * parsed response body, or text when json parsing failed
     */
    readonly body: unknown;

    constructor(status: number, body: unknown) {
        super(`Blacket request failed with status ${status}`);
        this.name = "BlacketHttpError";
        this.status = status;
        this.body = body;
    }
}

/**
 * minimal http client used by the sdk categories
 */
export class BlacketHttp {
    /**
     * normalized base api url
     */
    readonly baseUrl: string;

    private readonly cookie?: string;
    private readonly headers?: HeadersInit;
    private readonly timeoutMs: number;
    private readonly retry503: number;
    private readonly fetchFn: typeof fetch;

    constructor(options: BlacketClientOptions = {}) {
        this.baseUrl = (options.baseUrl ?? "https://blacket.org").replace(/\/+$/, "");
        this.cookie = options.cookie;
        this.headers = options.headers;
        this.timeoutMs = options.timeoutMs ?? 10000;
        this.retry503 = options.retry503 ?? 2;
        this.fetchFn = options.fetch ?? fetch;
    }

    /**
     * sends a get request and parses the response
     */
    async get<T = unknown>(path: string): Promise<T> {
        return this.request<T>(path, { method: "GET" });
    }

    /**
     * sends a json post request and parses the response
     */
    async post<T = unknown>(path: string, body: BlacketJson | BlacketRecord = {}): Promise<T> {
        return this.request<T>(path, { method: "POST", body });
    }

    /**
     * runs blacket's signed upload flow and returns the public url
     */
    async upload<T extends BlacketUploadResponse = BlacketUploadResponse>(
        path: string,
        file: BlacketUploadFile,
    ): Promise<T> {
        const filename = file.name ?? "upload";
        const contentType = file.type || "application/octet-stream";

        const signedUpload = await this.post<{
            error?: boolean;
            reason?: string;
            data?: {
                url: string;
                publicUrl: string;
            };
        }>(path, { filename, contentType });

        if (signedUpload.error || !signedUpload.data) {
            return signedUpload as T;
        }

        const uploadResponse = await this.fetchFn(signedUpload.data.url, {
            method: "PUT",
            headers: {
                "Content-Type": contentType,
            },
            body: file,
        });

        if (!uploadResponse.ok) {
            return {
                error: true,
                reason: "Upload failed",
                status: uploadResponse.status,
            } as T;
        }

        return {
            error: false,
            url: signedUpload.data.publicUrl,
        } as T;
    }

    /**
     * builds a websocket url for the configured base url
     */
    socketUrl(path = "/worker/socket"): string {
        const url = new URL(path, `${this.baseUrl}/`);
        url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
        return url.toString();
    }

    /**
     * builds websocket headers, including the configured cookie
     */
    socketHeaders(headers?: HeadersInit): Headers {
        const socketHeaders = new Headers(this.headers);

        new Headers(headers).forEach((value, key) => {
            socketHeaders.set(key, value);
        });

        if (this.cookie) {
            socketHeaders.set("Cookie", this.cookie);
        }

        return socketHeaders;
    }

    private async request<T>(path: string, options: RequestOptions): Promise<T> {
        let attempts = 0;

        while (true) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                const response = await this.fetchFn(this.url(path), {
                    method: options.method,
                    headers: this.requestHeaders(options),
                    body: options.body === undefined ? undefined : JSON.stringify(options.body),
                    signal: controller.signal,
                });

                const data = await this.readBody(response);

                if (response.status === 503 && attempts < this.retry503) {
                    attempts++;
                    await this.wait(2000);
                    continue;
                }

                if (!response.ok) {
                    if (this.isRecord(data)) {
                        return {
                            status: response.status,
                            ...data,
                        } as T;
                    }

                    throw new BlacketHttpError(response.status, data);
                }

                return data as T;
            } finally {
                clearTimeout(timeout);
            }
        }
    }

    private requestHeaders(options: RequestOptions): Headers {
        const headers = new Headers(this.headers);
        headers.set("Accept", "application/json");

        if (options.method === "POST") {
            headers.set("Content-Type", "application/json");
        }

        new Headers(options.headers).forEach((value, key) => {
            headers.set(key, value);
        });

        if (this.cookie) {
            headers.set("Cookie", this.cookie);
        }

        return headers;
    }

    private url(path: string): string {
        if (/^https?:\/\//.test(path)) {
            return path;
        }

        return new URL(path, `${this.baseUrl}/`).toString();
    }

    private async readBody(response: Response): Promise<unknown> {
        const text = await response.text();

        if (!text) {
            return {};
        }

        try {
            return JSON.parse(text) as unknown;
        } catch {
            return text;
        }
    }

    private isRecord(value: unknown): value is BlacketRecord {
        return typeof value === "object" && value !== null && !Array.isArray(value);
    }

    private wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
