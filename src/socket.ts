import type {
    BlacketBazaarPurchaseEvent,
    BlacketClanAttackEvent,
    BlacketId,
    BlacketFriendRemovedEvent,
    BlacketFriendRequestEvent,
    BlacketMessageCreateEvent,
    BlacketMessageEvent,
    BlacketNotification,
    BlacketTradeBlooksEvent,
    BlacketTradeCompleteEvent,
    BlacketTradeRequestEvent,
    BlacketTradeStateEvent,
    BlacketTradeTokensEvent,
} from "./types";

/**
 * raw socket message from blacket
 */
export type BlacketSocketMessage<T = unknown> = {
    event: string;
    data: T;
    [key: string]: unknown;
};

/**
 * socket listener callback
 */
export type BlacketSocketCallback<T = unknown> = (message: BlacketSocketMessage<T>) => void;

/**
 * known blacket socket events and their payloads
 */
export type BlacketSocketEvents = {
    heartbeat: unknown;
    notification: BlacketNotification;
    "destroy-session": unknown;
    "bazaar-purchase": BlacketBazaarPurchaseEvent;
    "trading-requests-received": BlacketTradeRequestEvent;
    "trading-requests-accepted": BlacketTradeRequestEvent;
    "trading-requests-declined": BlacketTradeRequestEvent;
    "trading-requests-cancelled": BlacketTradeRequestEvent;
    "trading-ongoing-tokens": BlacketTradeTokensEvent;
    "trading-ongoing-blooks": BlacketTradeBlooksEvent;
    "trading-ongoing-accept": BlacketTradeStateEvent;
    "trading-ongoing-cancel": BlacketTradeStateEvent;
    "trading-ongoing-decline": BlacketTradeStateEvent;
    "trading-ongoing-complete": BlacketTradeCompleteEvent;
    "friends-requests-received": BlacketFriendRequestEvent;
    "friends-requests-accepted": BlacketFriendRequestEvent;
    "friends-requests-declined": BlacketFriendRequestEvent;
    "friends-requests-cancelled": BlacketFriendRequestEvent;
    "friends-relationships-removed": BlacketFriendRemovedEvent;
    "clans-attacks-started": BlacketClanAttackEvent;
    "clans-attacks-attacked": BlacketClanAttackEvent;
    "clans-attacks-attempted": BlacketClanAttackEvent;
    "clans-attacks-rob": BlacketClanAttackEvent;
    "messages-create": BlacketMessageCreateEvent;
    "messages-edit": BlacketMessageEvent;
    "messages-delete": BlacketMessageEvent;
};

/**
 * known socket events the sdk can emit
 */
export type BlacketSocketEmitEvents = {
    heartbeat: undefined;
    "trading-ongoing-blooks": Record<string, number | string>;
    "trading-ongoing-tokens": number | string;
    "trading-ongoing-accept": undefined;
    "trading-ongoing-cancel": undefined;
    "trading-ongoing-decline": undefined;
    "clans-attacks-rob": undefined;
    "messages-create": {
        room: BlacketId;
        content: string;
    };
};

/**
 * socket connection options
 */
export type BlacketSocketOptions = {
    /**
     * extra headers passed to bun's websocket constructor
     */
    headers?: HeadersInit;
    /**
     * reconnect after unexpected closes. defaults to true
     */
    reconnect?: boolean;
    /**
     * custom websocket implementation for tests or non-bun runtimes
     */
    WebSocket?: typeof WebSocket;
};

/**
 * small evented wrapper around blacket's websocket. cursed, but contained
 */
export class BlacketSocket {
    private readonly listeners = new Map<string, Set<BlacketSocketCallback>>();
    private readonly headers?: HeadersInit;
    private readonly reconnect: boolean;
    private readonly WebSocketImpl: typeof WebSocket;
    private socket?: WebSocket;
    private manuallyClosed = false;

    constructor(
        readonly url: string,
        options: BlacketSocketOptions = {},
    ) {
        this.headers = options.headers;
        this.reconnect = options.reconnect ?? true;
        this.WebSocketImpl = options.WebSocket ?? WebSocket;
    }

    /**
     * opens the websocket connection
     */
    connect(): this {
        this.manuallyClosed = false;
        this.socket = this.createWebSocket();

        this.socket.onmessage = (event) => this.handleMessage(event.data);
        this.socket.onclose = () => {
            if (!this.manuallyClosed && this.reconnect) {
                this.connect();
            }
        };

        return this;
    }

    /**
     * closes the websocket and disables automatic reconnect for this close
     */
    close(code?: number, reason?: string): void {
        this.manuallyClosed = true;
        this.socket?.close(code, reason);
    }

    /**
     * resolves once the current websocket connection is open
     */
    waitUntilOpen(): Promise<void> {
        if (!this.socket) {
            throw new Error("Blacket socket is not created");
        }

        if (this.socket.readyState === this.WebSocketImpl.OPEN) {
            return Promise.resolve();
        }

        if (this.socket.readyState !== this.WebSocketImpl.CONNECTING) {
            throw new Error("Blacket socket is not connecting");
        }

        return new Promise((resolve, reject) => {
            const socket = this.socket;

            if (!socket) {
                reject(new Error("Blacket socket is not created"));
                return;
            }

            socket.addEventListener("open", () => resolve(), { once: true });
            socket.addEventListener(
                "error",
                () => reject(new Error("Blacket socket failed to open")),
                {
                    once: true,
                },
            );
        });
    }

    /**
     * registers a listener for a known or custom socket event
     */
    on<K extends keyof BlacketSocketEvents>(
        event: K,
        callback: BlacketSocketCallback<BlacketSocketEvents[K]>,
    ): () => void;
    on<T = unknown>(event: string, callback: BlacketSocketCallback<T>): () => void;
    on<T = unknown>(event: string, callback: BlacketSocketCallback<T>): () => void {
        const callbacks = this.listeners.get(event) ?? new Set<BlacketSocketCallback>();

        callbacks.add(callback as BlacketSocketCallback);
        this.listeners.set(event, callbacks);

        return () => this.off(event, callback);
    }

    /**
     * removes a socket listener
     */
    off<K extends keyof BlacketSocketEvents>(
        event: K,
        callback: BlacketSocketCallback<BlacketSocketEvents[K]>,
    ): void;
    off<T = unknown>(event: string, callback: BlacketSocketCallback<T>): void;
    off<T = unknown>(event: string, callback: BlacketSocketCallback<T>): void {
        this.listeners.get(event)?.delete(callback as BlacketSocketCallback);
    }

    /**
     * emits a known or custom socket event
     */
    emit<K extends keyof BlacketSocketEmitEvents>(
        event: K,
        ...args: BlacketSocketEmitEvents[K] extends undefined
            ? [] | [undefined]
            : [BlacketSocketEmitEvents[K]]
    ): void;
    emit(event: string, data?: unknown): void;
    emit(event: string, data?: unknown): void {
        if (!this.socket || this.socket.readyState !== this.WebSocketImpl.OPEN) {
            throw new Error("Blacket socket is not open");
        }

        const msg = data === undefined ? { event } : { event, data };

        this.socket.send(JSON.stringify(msg));
    }

    private handleMessage(raw: unknown): void {
        const message = this.parseMessage(raw);
        const callbacks = this.listeners.get(message.event);

        if (!callbacks) {
            return;
        }

        for (const callback of callbacks) {
            callback(message);
        }
    }

    private parseMessage(raw: unknown): BlacketSocketMessage {
        if (typeof raw !== "string") {
            throw new Error("Blacket socket received a non-string message");
        }

        const parsed = JSON.parse(raw) as Partial<BlacketSocketMessage>;

        if (!parsed.event) {
            throw new Error("Blacket socket message is missing an event");
        }

        return {
            data: {},
            ...parsed,
            event: parsed.event,
        };
    }

    private createWebSocket(): WebSocket {
        if (!this.headers) {
            return new this.WebSocketImpl(this.url);
        }

        const WebSocketImpl = this.WebSocketImpl as typeof WebSocket & {
            new (url: string, options: { headers: HeadersInit }): WebSocket;
        };

        return new WebSocketImpl(this.url, { headers: this.headers });
    }
}
