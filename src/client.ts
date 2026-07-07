// TODO: add deeper jsdoc examples later
// TODO: modularize/refactor this
import { BlacketHttp, type BlacketClientOptions } from "./http";
import {
    BlacketSocket,
    type BlacketSocketCallback,
    type BlacketSocketEmitEvents,
    type BlacketSocketEvents,
    type BlacketSocketOptions,
} from "./socket";
import type {
    BlacketClanEventsResponse,
    BlacketClanRequestsResponse,
    BlacketClanResponse,
    BlacketClansResponse,
    BlacketDataIndex,
    BlacketEmojis,
    BlacketFriendListResponse,
    BlacketId,
    BlacketMessageResponse,
    BlacketMessagesResponse,
    BlacketPackOpenResponse,
    BlacketPurchaseResponse,
    BlacketRecord,
    BlacketResponse,
    BlacketTradeResponse,
    BlacketUploadFile,
    BlacketUploadResponse,
    BlacketUser,
    BlacketUserResponse,
    FriendRequestSetting,
    RequestSetting,
    StoreItem,
} from "./types";

const pathValue = (value: BlacketId) => encodeURIComponent(String(value));

type SocketProvider = () => BlacketSocket;

/**
 * main sdk client. create one of these and use the category properties
 */
export class BlacketClient {
    /**
     * raw http helper for custom routes
     */
    readonly http: BlacketHttp;
    /**
     * static data routes
     */
    readonly data: BlacketData;
    /**
     * current account routes and account socket events
     */
    readonly account: BlacketAccount;
    /**
     * user lookup routes
     */
    readonly users: BlacketUsers;
    /**
     * friend routes and friend socket events
     */
    readonly friends: BlacketFriends;
    /**
     * account settings routes
     */
    readonly settings: BlacketSettings;
    /**
     * avatar/banner routes
     */
    readonly cosmetics: BlacketCosmetics;
    /**
     * store checkout routes
     */
    readonly store: BlacketStore;
    /**
     * pack/shop routes and bazaar socket events
     */
    readonly market: BlacketMarket;
    /**
     * clan routes and clan socket events
     */
    readonly clans: BlacketClans;
    /**
     * trade routes and trade socket events
     */
    readonly trades: BlacketTrades;
    /**
     * message routes and message socket events
     */
    readonly messages: BlacketMessages;
    private socket?: BlacketSocket;

    constructor(options: BlacketClientOptions = {}) {
        this.http = new BlacketHttp(options);
        this.data = new BlacketData(this.http);
        this.account = new BlacketAccount(this.http, () => this.currentSocket());
        this.users = new BlacketUsers(this.http);
        this.friends = new BlacketFriends(this.http, () => this.currentSocket());
        this.settings = new BlacketSettings(this.http);
        this.cosmetics = new BlacketCosmetics(this.http);
        this.store = new BlacketStore(this.http);
        this.market = new BlacketMarket(this.http, () => this.currentSocket());
        this.clans = new BlacketClans(this.http, () => this.currentSocket());
        this.trades = new BlacketTrades(this.http, () => this.currentSocket());
        this.messages = new BlacketMessages(this.http, () => this.currentSocket());
    }

    /**
     * sends a custom get request through the configured blacket http client
     */
    get<T = unknown>(path: string): Promise<T> {
        return this.http.get<T>(path);
    }

    /**
     * sends a custom json post request through the configured blacket http client
     */
    post<T = unknown>(path: string, body: BlacketRecord = {}): Promise<T> {
        return this.http.post<T>(path, body);
    }

    /**
     * uploads a file through blacket's signed upload flow
     */
    upload<T extends BlacketUploadResponse = BlacketUploadResponse>(
        path: string,
        file: BlacketUploadFile,
    ): Promise<T> {
        return this.http.upload<T>(path, file);
    }

    /**
     * creates a socket instance without waiting for it to open
     */
    createSocket(options?: BlacketSocketOptions): BlacketSocket {
        this.socket = new BlacketSocket(this.http.socketUrl(), {
            ...options,
            headers: this.http.socketHeaders(options?.headers),
        });
        return this.socket;
    }

    /**
     * creates and opens the blacket websocket
     */
    connectSocket(options?: BlacketSocketOptions): BlacketSocket {
        return this.createSocket(options).connect();
    }

    /**
     * uses an existing socket instance. useful for tests or advanced control
     */
    useSocket(socket: BlacketSocket): this {
        this.socket = socket;
        return this;
    }

    /**
     * closes the current socket
     */
    closeSocket(code?: number, reason?: string): void {
        this.currentSocket().close(code, reason);
    }

    /**
     * registers a listener on the current socket
     */
    onSocket<K extends keyof BlacketSocketEvents>(
        event: K,
        callback: BlacketSocketCallback<BlacketSocketEvents[K]>,
    ): () => void;
    onSocket<T = unknown>(event: string, callback: BlacketSocketCallback<T>): () => void;
    onSocket<T = unknown>(event: string, callback: BlacketSocketCallback<T>): () => void {
        return this.currentSocket().on(event, callback);
    }

    /**
     * emits an event on the current socket
     */
    emitSocket<K extends keyof BlacketSocketEmitEvents>(
        event: K,
        ...args: BlacketSocketEmitEvents[K] extends undefined
            ? [] | [undefined]
            : [BlacketSocketEmitEvents[K]]
    ): void;
    emitSocket(event: string, data?: unknown): void;
    emitSocket(event: string, data?: unknown): void {
        this.currentSocket().emit(event, data);
    }

    private currentSocket(): BlacketSocket {
        if (!this.socket) {
            throw new Error("Blacket socket is not created. Call client.connectSocket() first");
        }

        return this.socket;
    }
}

/**
 * static blacket data routes
 */
export class BlacketData {
    constructor(private readonly http: BlacketHttp) {}

    /**
     * fetches the static game data index
     */
    index<T = BlacketDataIndex>(): Promise<T> {
        return this.http.get<T>("/data/index.json");
    }

    /**
     * fetches the emoji list
     */
    emojis<T = BlacketEmojis>(): Promise<T> {
        return this.http.get<T>("/content/emojis.json");
    }
}

/**
 * current account routes and account-level socket helpers
 */
export class BlacketAccount {
    constructor(
        private readonly http: BlacketHttp,
        private readonly socket: SocketProvider,
    ) {}

    /**
     * gets the authenticated user
     */
    currentUser<T = BlacketUserResponse>(): Promise<T> {
        return this.http.get<T>("/worker2/user");
    }

    /**
     * claims the daily reward for the authenticated user
     */
    claimDaily<T = BlacketResponse<{ reward: number }>>(): Promise<T> {
        return this.http.get<T>("/worker/claim");
    }

    /**
     * pings the blacket worker
     */
    ping<T = BlacketResponse<{ up: boolean }>>(): Promise<T> {
        return this.http.get<T>("/worker/ping");
    }

    /**
     * gets giveaway count since a timestamp/id
     */
    giveawaysSince<T = BlacketResponse<{ count: number }>>(since: number | string): Promise<T> {
        return this.http.get<T>(`/worker/giveaways/since?since=${pathValue(since)}`);
    }

    /**
     * marks an inbox item as read
     */
    markInboxRead<T = BlacketResponse>(id: BlacketId): Promise<T> {
        return this.http.post<T>("/worker/inbox/read", { id });
    }

    /**
     * sends a presence/status payload
     */
    status<T = BlacketResponse>(body: { di?: string; ua?: string; op?: string }): Promise<T> {
        return this.http.post<T>("/worker/status", body);
    }

    /**
     * uploads a file using the account upload endpoint
     */
    upload<T extends BlacketUploadResponse = BlacketUploadResponse>(
        file: BlacketUploadFile,
    ): Promise<T> {
        return this.http.upload<T>("/worker/upload", file);
    }

    /**
     * sends a heartbeat reply over the socket
     */
    heartbeat(): void {
        this.socket().emit("heartbeat");
    }

    /**
     * automatically replies to heartbeat events. returns an unsubscribe function
     */
    replyToHeartbeat(): () => void {
        return this.onHeartbeat(() => this.heartbeat());
    }

    /**
     * listens for heartbeat events
     */
    onHeartbeat(callback: BlacketSocketCallback<BlacketSocketEvents["heartbeat"]>): () => void {
        return this.socket().on("heartbeat", callback);
    }

    /**
     * listens for notification events
     */
    onNotification(
        callback: BlacketSocketCallback<BlacketSocketEvents["notification"]>,
    ): () => void {
        return this.socket().on("notification", callback);
    }

    /**
     * listens for session destroy events
     */
    onDestroySession(
        callback: BlacketSocketCallback<BlacketSocketEvents["destroy-session"]>,
    ): () => void {
        return this.socket().on("destroy-session", callback);
    }
}

/**
 * user lookup routes
 */
export class BlacketUsers {
    constructor(private readonly http: BlacketHttp) {}

    /**
     * gets the authenticated user. same as `client.account.currentUser()`
     */
    me<T = BlacketUserResponse>(): Promise<T> {
        return this.http.get<T>("/worker2/user");
    }

    /**
     * gets a user by id or username
     */
    get<T = BlacketUserResponse>(user: BlacketId): Promise<T> {
        return this.http.get<T>(`/worker2/user/${pathValue(user)}`);
    }

    /**
     * gets the authenticated user's friends and pending friend requests
     */
    friends<T = BlacketFriendListResponse>(): Promise<T> {
        return this.http.get<T>("/worker2/friends");
    }
}

/**
 * friend routes and friend socket helpers
 */
export class BlacketFriends {
    constructor(
        private readonly http: BlacketHttp,
        private readonly socket: SocketProvider,
    ) {}

    /**
     * sends a friend request
     */
    request<T = BlacketResponse>(user: string): Promise<T> {
        return this.http.post<T>("/worker/friends/request", { user });
    }

    /**
     * removes a friend
     */
    remove<T = BlacketResponse>(user: string): Promise<T> {
        return this.http.post<T>("/worker/friends/remove", { user });
    }

    /**
     * blocks a user
     */
    block<T = BlacketResponse>(user: string): Promise<T> {
        return this.http.post<T>("/worker/friends/block", { user });
    }

    /**
     * unblocks a user
     */
    unblock<T = BlacketResponse>(user: string): Promise<T> {
        return this.http.post<T>("/worker/friends/unblock", { user });
    }

    /**
     * cancels a sent friend request
     */
    cancel<T = BlacketResponse>(user: string): Promise<T> {
        return this.http.post<T>("/worker/friends/cancel", { user });
    }

    /**
     * accepts a received friend request
     */
    accept<T = BlacketResponse>(user: string): Promise<T> {
        return this.http.post<T>("/worker/friends/accept", { user });
    }

    /**
     * declines a received friend request
     */
    decline<T = BlacketResponse>(user: string): Promise<T> {
        return this.http.post<T>("/worker/friends/decline", { user });
    }

    /**
     * listens for received friend requests
     */
    onRequestReceived(
        callback: BlacketSocketCallback<BlacketSocketEvents["friends-requests-received"]>,
    ): () => void {
        return this.socket().on("friends-requests-received", callback);
    }

    /**
     * listens for accepted friend requests
     */
    onRequestAccepted(
        callback: BlacketSocketCallback<BlacketSocketEvents["friends-requests-accepted"]>,
    ): () => void {
        return this.socket().on("friends-requests-accepted", callback);
    }

    /**
     * listens for declined friend requests
     */
    onRequestDeclined(
        callback: BlacketSocketCallback<BlacketSocketEvents["friends-requests-declined"]>,
    ): () => void {
        return this.socket().on("friends-requests-declined", callback);
    }

    /**
     * listens for cancelled friend requests
     */
    onRequestCancelled(
        callback: BlacketSocketCallback<BlacketSocketEvents["friends-requests-cancelled"]>,
    ): () => void {
        return this.socket().on("friends-requests-cancelled", callback);
    }

    /**
     * listens for removed friend relationships
     */
    onRemoved(
        callback: BlacketSocketCallback<BlacketSocketEvents["friends-relationships-removed"]>,
    ): () => void {
        return this.socket().on("friends-relationships-removed", callback);
    }
}

/**
 * account settings routes
 */
export class BlacketSettings {
    constructor(private readonly http: BlacketHttp) {}

    /**
     * updates trade request visibility
     */
    tradeRequests<T = BlacketResponse>(value: RequestSetting): Promise<T> {
        return this.http.post<T>("/worker/settings/requests", { value });
    }

    /**
     * updates friend request visibility
     */
    friendRequests<T = BlacketResponse>(value: FriendRequestSetting): Promise<T> {
        return this.http.post<T>("/worker/settings/friends", { value });
    }

    /**
     * changes the username
     */
    username<T = BlacketResponse>(username: string, password: string): Promise<T> {
        return this.http.post<T>("/worker/settings/username", { username, password });
    }

    /**
     * changes the password
     */
    password<T = BlacketResponse>(oldPassword: string, newPassword: string): Promise<T> {
        return this.http.post<T>("/worker/settings/password", { oldPassword, newPassword });
    }

    /**
     * starts otp setup and returns a qr code payload
     */
    generateOtp<T = BlacketResponse<{ qr: string }>>(): Promise<T> {
        return this.http.get<T>("/worker/otp/generate");
    }

    /**
     * enables otp with a code
     */
    enableOtp<T = BlacketResponse>(code: string): Promise<T> {
        return this.http.post<T>("/worker/otp/enable", { code });
    }

    /**
     * disables otp with a code
     */
    disableOtp<T = BlacketResponse>(code: string): Promise<T> {
        return this.http.post<T>("/worker/otp/disable", { code });
    }

    /**
     * updates the profile color
     */
    color<T = BlacketResponse>(color: string): Promise<T> {
        return this.http.post<T>("/worker/settings/color", { color });
    }
}

/**
 * cosmetic profile routes
 */
export class BlacketCosmetics {
    constructor(private readonly http: BlacketHttp) {}

    /**
     * sets the avatar blook
     */
    avatar<T = BlacketResponse>(blook: string): Promise<T> {
        return this.http.post<T>("/worker/cosmetics/avatar", { blook });
    }

    /**
     * sets the profile banner
     */
    banner<T = BlacketResponse>(banner: string): Promise<T> {
        return this.http.post<T>("/worker/cosmetics/banner", { banner });
    }
}

/**
 * store checkout routes
 */
export class BlacketStore {
    constructor(private readonly http: BlacketHttp) {}

    /**
     * starts a checkout purchase
     */
    startPurchase<T = BlacketPurchaseResponse>(
        item: StoreItem,
        quantity: number,
        origin: string,
    ): Promise<T> {
        return this.http.post<T>("/worker/start-purchase", { item, quantity, origin });
    }

    /**
     * starts a legacy checkout purchase
     */
    legacyPurchase<T = BlacketPurchaseResponse>(item: StoreItem): Promise<T> {
        return this.http.get<T>(`/worker/purchase?item=${pathValue(item)}`);
    }
}

/**
 * pack/shop routes and market socket helpers
 */
export class BlacketMarket {
    constructor(
        private readonly http: BlacketHttp,
        private readonly socket: SocketProvider,
    ) {}

    /**
     * opens a pack
     */
    openPack<T = BlacketPackOpenResponse>(pack: string): Promise<T> {
        return this.http.post<T>("/worker3/open", { pack });
    }

    /**
     * buys an item from the token shop
     */
    buyShopItem<T = BlacketResponse>(item: string): Promise<T> {
        return this.http.post<T>("/worker/shop/buy", { item });
    }

    /**
     * listens for bazaar purchase events
     */
    onBazaarPurchase(
        callback: BlacketSocketCallback<BlacketSocketEvents["bazaar-purchase"]>,
    ): () => void {
        return this.socket().on("bazaar-purchase", callback);
    }
}

/**
 * clan routes and clan socket helpers
 */
export class BlacketClans {
    constructor(
        private readonly http: BlacketHttp,
        private readonly socket: SocketProvider,
    ) {}

    /**
     * gets the authenticated user's clan
     */
    mine<T = BlacketClanResponse>(): Promise<T> {
        return this.http.get<T>("/worker/clans");
    }

    /**
     * gets a clan discovery page
     */
    discoverPage<T = BlacketClansResponse>(page: number): Promise<T> {
        return this.http.get<T>(`/worker/clans/discover/page/${pathValue(page)}`);
    }

    /**
     * searches clans by name
     */
    discoverByName<T = BlacketClansResponse>(name: BlacketId): Promise<T> {
        return this.http.get<T>(`/worker/clans/discover/name/${pathValue(name)}`);
    }

    /**
     * gets pending join requests for the authenticated user's clan
     */
    pendingRequests<T = BlacketClanRequestsResponse>(): Promise<T> {
        return this.http.get<T>("/worker/clans/requests/pending");
    }

    /**
     * gets pending clan requests sent by the authenticated user
     */
    myPendingRequests<T = BlacketClanRequestsResponse>(): Promise<T> {
        return this.http.get<T>("/worker/clans/requests/pending/me");
    }

    /**
     * sends a request to join a clan
     */
    sendRequest<T = BlacketResponse>(clan: BlacketId): Promise<T> {
        return this.http.post<T>("/worker/clans/requests/send", { clan });
    }

    /**
     * joins a clan directly when requests are not required
     */
    join<T = BlacketResponse>(clan: BlacketId): Promise<T> {
        return this.http.post<T>("/worker/clans/join", { clan });
    }

    /**
     * accepts a user's clan join request
     */
    acceptRequest<T = BlacketResponse>(user: BlacketId): Promise<T> {
        return this.http.post<T>("/worker/clans/requests/accept", { user });
    }

    /**
     * rejects a user's clan join request
     */
    rejectRequest<T = BlacketResponse>(user: BlacketId): Promise<T> {
        return this.http.post<T>("/worker/clans/requests/reject", { user });
    }

    /**
     * creates a clan
     */
    create<T = BlacketResponse>(body: {
        name: string;
        image: string;
        description: string;
        color: string;
    }): Promise<T> {
        return this.http.post<T>("/worker/clans/create", body);
    }

    /**
     * leaves the current clan
     */
    leave<T = BlacketResponse>(password: string, code?: string): Promise<T> {
        return this.http.post<T>("/worker/clans/leave", { password, code });
    }

    /**
     * kicks a user from the current clan
     */
    kick<T = BlacketResponse>(user: BlacketId): Promise<T> {
        return this.http.post<T>("/worker/clans/kick", { user });
    }

    /**
     * gets ongoing clan events
     */
    ongoingEvents<T = BlacketClanEventsResponse>(): Promise<T> {
        return this.http.get<T>("/worker/clans/events/ongoing");
    }

    /**
     * adds tokens to clan investments
     */
    addInvestment<T = BlacketResponse>(tokens: number | string): Promise<T> {
        return this.http.post<T>("/worker/clans/investments/add", { tokens });
    }

    /**
     * removes tokens from clan investments
     */
    removeInvestment<T = BlacketResponse>(tokens: number | string): Promise<T> {
        return this.http.post<T>("/worker/clans/investments/remove", { tokens });
    }

    /**
     * upgrades the clan investment level
     */
    upgradeInvestment<T = BlacketResponse>(): Promise<T> {
        return this.http.post<T>("/worker/clans/investments/upgrade", {});
    }

    /**
     * adds an item to clan inventory
     */
    addInventoryItem<T = BlacketResponse>(item: string): Promise<T> {
        return this.http.post<T>("/worker/clans/inventory/add", { item });
    }

    /**
     * removes an item from clan inventory
     */
    removeInventoryItem<T = BlacketResponse>(item: string): Promise<T> {
        return this.http.post<T>("/worker/clans/inventory/remove", { item });
    }

    /**
     * uses an item on a clan
     */
    useItem<T = BlacketResponse>(item: string, clan: BlacketId): Promise<T> {
        return this.http.post<T>("/worker/use", { item, clan });
    }

    /**
     * updates the current clan name
     */
    setName<T = BlacketResponse>(name: string): Promise<T> {
        return this.http.post<T>("/worker/clans/settings/name", { name });
    }

    /**
     * updates the current clan description
     */
    setDescription<T = BlacketResponse>(description: string): Promise<T> {
        return this.http.post<T>("/worker/clans/settings/description", { description });
    }

    /**
     * updates the current clan image
     */
    setImage<T = BlacketResponse>(image: string): Promise<T> {
        return this.http.post<T>("/worker/clans/settings/image", { image });
    }

    /**
     * resets the current clan color
     */
    resetColor<T = BlacketResponse>(): Promise<T> {
        return this.http.post<T>("/worker/clans/settings/reset-color", {});
    }

    /**
     * toggles current clan safe mode
     */
    toggleSafeMode<T = BlacketResponse>(): Promise<T> {
        return this.http.post<T>("/worker/clans/settings/safe-mode", {});
    }

    /**
     * toggles current clan join requests
     */
    toggleRequests<T = BlacketResponse>(): Promise<T> {
        return this.http.post<T>("/worker/clans/settings/requests", {});
    }

    /**
     * transfers current clan ownership
     */
    transferOwnership<T = BlacketResponse>(
        user: BlacketId,
        password: string,
        code?: string,
    ): Promise<T> {
        return this.http.post<T>("/worker/clans/settings/transfer-ownership", {
            user,
            password,
            code,
        });
    }

    /**
     * disbands the current clan
     */
    disband<T = BlacketResponse>(password: string, code?: string): Promise<T> {
        return this.http.post<T>("/worker/clans/settings/disband", { password, code });
    }

    /**
     * emits the old clan rob event. disabled in v2, kept for compatibility
     */
    robAttack(): void {
        this.socket().emit("clans-attacks-rob");
    }

    /**
     * listens for clan attack start events
     */
    onAttackStarted(
        callback: BlacketSocketCallback<BlacketSocketEvents["clans-attacks-started"]>,
    ): () => void {
        return this.socket().on("clans-attacks-started", callback);
    }

    /**
     * listens for clan attacked events
     */
    onAttacked(
        callback: BlacketSocketCallback<BlacketSocketEvents["clans-attacks-attacked"]>,
    ): () => void {
        return this.socket().on("clans-attacks-attacked", callback);
    }

    /**
     * listens for clan attack attempt events
     */
    onAttackAttempted(
        callback: BlacketSocketCallback<BlacketSocketEvents["clans-attacks-attempted"]>,
    ): () => void {
        return this.socket().on("clans-attacks-attempted", callback);
    }

    /**
     * listens for clan rob events
     */
    onAttackRob(
        callback: BlacketSocketCallback<BlacketSocketEvents["clans-attacks-rob"]>,
    ): () => void {
        return this.socket().on("clans-attacks-rob", callback);
    }
}

/**
 * trade routes and trade socket helpers
 */
export class BlacketTrades {
    constructor(
        private readonly http: BlacketHttp,
        private readonly socket: SocketProvider,
    ) {}

    /**
     * gets the current ongoing trade
     */
    ongoing<T = BlacketTradeResponse>(): Promise<T> {
        return this.http.get<T>("/worker/trades/ongoing");
    }

    /**
     * sends a trade request to a user
     */
    sendRequest<T = BlacketResponse>(user: BlacketId): Promise<T> {
        return this.http.post<T>("/worker/trades/requests/send", { user: String(user) });
    }

    /**
     * cancels the current outgoing trade request
     */
    cancelRequest<T = BlacketResponse>(): Promise<T> {
        return this.http.post<T>("/worker/trades/requests/cancel", {});
    }

    /**
     * accepts the current incoming trade request
     */
    acceptRequest<T = BlacketResponse>(): Promise<T> {
        return this.http.post<T>("/worker/trades/requests/accept", {});
    }

    /**
     * declines the current incoming trade request
     */
    declineRequest<T = BlacketResponse>(): Promise<T> {
        return this.http.post<T>("/worker/trades/requests/decline", {});
    }

    /**
     * listens for incoming trade requests
     */
    onRequestReceived(
        callback: BlacketSocketCallback<BlacketSocketEvents["trading-requests-received"]>,
    ): () => void {
        return this.socket().on("trading-requests-received", callback);
    }

    /**
     * listens for accepted outgoing trade requests
     */
    onRequestAccepted(
        callback: BlacketSocketCallback<BlacketSocketEvents["trading-requests-accepted"]>,
    ): () => void {
        return this.socket().on("trading-requests-accepted", callback);
    }

    /**
     * listens for declined outgoing trade requests
     */
    onRequestDeclined(
        callback: BlacketSocketCallback<BlacketSocketEvents["trading-requests-declined"]>,
    ): () => void {
        return this.socket().on("trading-requests-declined", callback);
    }

    /**
     * listens for cancelled incoming trade requests
     */
    onRequestCancelled(
        callback: BlacketSocketCallback<BlacketSocketEvents["trading-requests-cancelled"]>,
    ): () => void {
        return this.socket().on("trading-requests-cancelled", callback);
    }

    /**
     * sends your selected blooks for the ongoing trade
     */
    sendBlooks(blooks: BlacketSocketEmitEvents["trading-ongoing-blooks"]): void {
        this.socket().emit("trading-ongoing-blooks", blooks);
    }

    /**
     * sends your selected token amount for the ongoing trade
     */
    sendTokens(tokens: number | string): void {
        this.socket().emit("trading-ongoing-tokens", tokens);
    }

    /**
     * readies up in the ongoing trade
     */
    acceptOngoing(): void {
        this.socket().emit("trading-ongoing-accept");
    }

    /**
     * unreadies/cancels ready state in the ongoing trade
     */
    cancelOngoing(): void {
        this.socket().emit("trading-ongoing-cancel");
    }

    /**
     * declines the ongoing trade
     */
    declineOngoing(): void {
        this.socket().emit("trading-ongoing-decline");
    }

    /**
     * listens for ongoing trade token updates
     */
    onTokens(
        callback: BlacketSocketCallback<BlacketSocketEvents["trading-ongoing-tokens"]>,
    ): () => void {
        return this.socket().on("trading-ongoing-tokens", callback);
    }

    /**
     * listens for ongoing trade blook updates
     */
    onBlooks(
        callback: BlacketSocketCallback<BlacketSocketEvents["trading-ongoing-blooks"]>,
    ): () => void {
        return this.socket().on("trading-ongoing-blooks", callback);
    }

    /**
     * listens for ongoing trade ready events
     */
    onAccepted(
        callback: BlacketSocketCallback<BlacketSocketEvents["trading-ongoing-accept"]>,
    ): () => void {
        return this.socket().on("trading-ongoing-accept", callback);
    }

    /**
     * listens for ongoing trade ready-cancel events
     */
    onCancelled(
        callback: BlacketSocketCallback<BlacketSocketEvents["trading-ongoing-cancel"]>,
    ): () => void {
        return this.socket().on("trading-ongoing-cancel", callback);
    }

    /**
     * listens for ongoing trade decline events
     */
    onDeclined(
        callback: BlacketSocketCallback<BlacketSocketEvents["trading-ongoing-decline"]>,
    ): () => void {
        return this.socket().on("trading-ongoing-decline", callback);
    }

    /**
     * listens for completed trades
     */
    onComplete(
        callback: BlacketSocketCallback<BlacketSocketEvents["trading-ongoing-complete"]>,
    ): () => void {
        return this.socket().on("trading-ongoing-complete", callback);
    }
}

/**
 * message routes and message socket helpers
 */
export class BlacketMessages {
    constructor(
        private readonly http: BlacketHttp,
        private readonly socket: SocketProvider,
    ) {}

    /**
     * gets recent messages in a room
     */
    list<T = BlacketMessagesResponse>(room: BlacketId, limit = 100): Promise<T> {
        return this.http.get<T>(`/worker2/messages/${pathValue(room)}?limit=${pathValue(limit)}`);
    }

    /**
     * edits a message
     */
    edit<T = BlacketMessageResponse>(message: BlacketId, content: string): Promise<T> {
        return this.http.post<T>(`/worker/messages/${pathValue(message)}/edit`, { content });
    }

    /**
     * deletes a message
     */
    delete<T = BlacketResponse>(message: BlacketId): Promise<T> {
        return this.http.post<T>(`/worker/messages/${pathValue(message)}/delete`, {});
    }

    /**
     * reports a message. disabled in v2, kept for compatibility
     */
    reportMessage<T = BlacketResponse>(message: BlacketId, reason: string): Promise<T> {
        return this.http.post<T>(`/worker/reports/messages/${pathValue(message)}/create`, {
            reason,
        });
    }

    /**
     * reports a user. disabled in v2, kept for compatibility
     */
    reportUser<T = BlacketResponse>(user: BlacketId, reason: string): Promise<T> {
        return this.http.post<T>(`/worker/reports/users/${pathValue(user)}/create`, { reason });
    }

    /**
     * sends a message over the socket
     */
    async send(room: BlacketId, content: string): Promise<void> {
        await this.socket().waitUntilOpen();
        this.socket().emit("messages-create", { room, content });
    }

    /**
     * listens for created messages
     */
    onCreate(callback: BlacketSocketCallback<BlacketSocketEvents["messages-create"]>): () => void {
        return this.socket().on("messages-create", callback);
    }

    /**
     * listens for edited messages
     */
    onEdit(callback: BlacketSocketCallback<BlacketSocketEvents["messages-edit"]>): () => void {
        return this.socket().on("messages-edit", callback);
    }

    /**
     * listens for deleted messages
     */
    onDelete(callback: BlacketSocketCallback<BlacketSocketEvents["messages-delete"]>): () => void {
        return this.socket().on("messages-delete", callback);
    }
}
