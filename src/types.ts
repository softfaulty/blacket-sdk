/**
 * a json primitive value
 */
export type BlacketPrimitive = string | number | boolean | null;

/**
 * json-safe data accepted by the http helper
 */
export type BlacketJson = BlacketPrimitive | BlacketJson[] | { [key: string]: BlacketJson };

/**
 * unknown api object with string keys
 */
export type BlacketRecord = Record<string, unknown>;

/**
 * ids are usually strings from the api, but route helpers also accept numbers
 */
export type BlacketId = string | number;

/**
 * standard api error response
 */
export type BlacketErrorResponse = {
    error: true;
    reason?: string;
    status?: number;
    [key: string]: unknown;
};

/**
 * standard api response wrapper
 */
export type BlacketResponse<T extends BlacketRecord = BlacketRecord> =
    | ({ error?: false } & T)
    | BlacketErrorResponse;

/**
 * login/session settings stored on a user
 */
export type BlacketUserSettings = {
    requests?: RequestSetting;
    friends?: FriendRequestSetting;
    [key: string]: unknown;
};

/**
 * a user's blook inventory, keyed by blook name
 */
export type BlacketBlookInventory = Record<string, number>;

/**
 * public user object returned by user, friend, message, trade, and clan endpoints
 */
export type BlacketUser = {
    id: BlacketId;
    username: string;
    role?: string;
    color?: string;
    avatar?: string;
    banner?: string;
    tokens?: number;
    blooks?: BlacketBlookInventory;
    badges?: string[];
    perms?: string[];
    clan?: BlacketClan | BlacketId | null;
    settings?: BlacketUserSettings;
    createdAt?: string | number;
    updatedAt?: string | number;
    [key: string]: unknown;
};

/**
 * static blook metadata from the data endpoint
 */
export type BlacketBlook = {
    name?: string;
    rarity?: string;
    image?: string;
    price?: number;
    chance?: number;
    [key: string]: unknown;
};

/**
 * static rarity metadata from the data endpoint
 */
export type BlacketRarity = {
    name?: string;
    color?: string;
    animation?: string;
    [key: string]: unknown;
};

/**
 * static pack metadata from the data endpoint
 */
export type BlacketPack = {
    name?: string;
    price?: number;
    image?: string;
    blooks?: string[];
    [key: string]: unknown;
};

/**
 * main static data payload
 */
export type BlacketDataIndex = {
    blooks?: Record<string, BlacketBlook>;
    rarities?: Record<string, BlacketRarity>;
    packs?: Record<string, BlacketPack>;
    config?: BlacketRecord;
    [key: string]: unknown;
};

/**
 * static emoji list payload
 */
export type BlacketEmojis = {
    emojis: string[];
    [key: string]: unknown;
};

/**
 * current user or single user lookup response
 */
export type BlacketUserResponse = BlacketResponse<{
    user: BlacketUser;
}>;

/**
 * multi-user lookup response
 */
export type BlacketUsersResponse = BlacketResponse<{
    users: BlacketUser[];
}>;

/**
 * friend list response grouped by relationship state
 */
export type BlacketFriendListResponse = BlacketResponse<{
    friends: BlacketUser[];
    sending: BlacketUser[];
    receiving: BlacketUser[];
}>;

/**
 * clan member object
 */
export type BlacketClanMember = BlacketUser & {
    rank?: string;
    joinedAt?: string | number;
};

/**
 * clan inventory item count map
 */
export type BlacketClanInventory = Record<string, number>;

/**
 * clan investment state
 */
export type BlacketClanInvestment = {
    level?: number;
    tokens?: number;
    users?: Record<string, number>;
    [key: string]: unknown;
};

/**
 * clan object returned by clan endpoints and events
 */
export type BlacketClan = {
    id: BlacketId;
    name: string;
    description?: string;
    image?: string;
    color?: string;
    owner?: BlacketUser;
    members?: BlacketClanMember[];
    inventory?: BlacketClanInventory;
    investments?: BlacketClanInvestment;
    safeMode?: boolean;
    requests?: boolean;
    createdAt?: string | number;
    updatedAt?: string | number;
    [key: string]: unknown;
};

/**
 * single clan response
 */
export type BlacketClanResponse = BlacketResponse<{
    clan: BlacketClan;
}>;

/**
 * clan discovery/list response
 */
export type BlacketClansResponse = BlacketResponse<{
    clans: BlacketClan[];
    page?: number;
    pages?: number;
}>;

/**
 * pending clan join request
 */
export type BlacketClanRequest = {
    id?: BlacketId;
    user: BlacketUser;
    clan?: BlacketClan;
    createdAt?: string | number;
    [key: string]: unknown;
};

/**
 * clan join requests response
 */
export type BlacketClanRequestsResponse = BlacketResponse<{
    requests: BlacketClanRequest[];
}>;

/**
 * clan event data
 */
export type BlacketClanEvent = {
    id?: BlacketId;
    clan?: BlacketClan;
    user?: BlacketUser;
    item?: string;
    tokens?: number;
    startedAt?: string | number;
    endsAt?: string | number;
    [key: string]: unknown;
};

/**
 * ongoing clan events response
 */
export type BlacketClanEventsResponse = BlacketResponse<{
    events: BlacketClanEvent[];
}>;

/**
 * a chat room
 */
export type BlacketRoom = {
    id: BlacketId;
    name?: string;
    type?: string;
    [key: string]: unknown;
};

/**
 * a chat message
 */
export type BlacketMessage = {
    id: BlacketId;
    content: string;
    author?: BlacketUser;
    user?: BlacketUser;
    room?: BlacketRoom;
    createdAt?: string | number;
    updatedAt?: string | number;
    [key: string]: unknown;
};

/**
 * message list response
 */
export type BlacketMessagesResponse = BlacketResponse<{
    messages: BlacketMessage[];
    room?: BlacketRoom;
}>;

/**
 * single message response
 */
export type BlacketMessageResponse = BlacketResponse<{
    message: BlacketMessage;
}>;

/**
 * user state inside an ongoing trade
 */
export type BlacketTradeUserState = {
    user?: BlacketUser;
    tokens: number;
    blooks: BlacketBlookInventory;
    accepted: boolean;
    [key: string]: unknown;
};

/**
 * ongoing trade state, keyed by user id
 */
export type BlacketTrade = {
    users: Record<string, BlacketTradeUserState>;
    [key: string]: unknown;
};

/**
 * ongoing trade response
 */
export type BlacketTradeResponse = BlacketResponse<BlacketTrade>;

/**
 * rewards returned when a trade completes
 */
export type BlacketTradeRewards = {
    tokens: number;
    blooks: BlacketBlookInventory;
    [key: string]: unknown;
};

/**
 * notification socket payload
 */
export type BlacketNotification = {
    title?: string;
    message?: string;
    icon?: string;
    time?: number;
    [key: string]: unknown;
};

/**
 * bazaar purchase socket payload
 */
export type BlacketBazaarPurchaseEvent = {
    user?: BlacketUser;
    item?: string;
    blook?: string;
    price?: number;
    [key: string]: unknown;
};

/**
 * friend request socket payload
 */
export type BlacketFriendRequestEvent = {
    user: BlacketUser;
    [key: string]: unknown;
};

/**
 * friend relationship removal socket payload
 */
export type BlacketFriendRemovedEvent = {
    user: BlacketUser;
    [key: string]: unknown;
};

/**
 * trade request socket payload
 */
export type BlacketTradeRequestEvent = {
    user: BlacketUser;
    [key: string]: unknown;
};

/**
 * ongoing trade token update socket payload
 */
export type BlacketTradeTokensEvent = {
    tokens: number;
    user?: BlacketUser;
    [key: string]: unknown;
};

/**
 * ongoing trade blook update socket payload
 */
export type BlacketTradeBlooksEvent = {
    blooks: BlacketBlookInventory;
    user?: BlacketUser;
    [key: string]: unknown;
};

/**
 * ongoing trade ready/cancel/decline socket payload
 */
export type BlacketTradeStateEvent = {
    user?: BlacketUser;
    [key: string]: unknown;
};

/**
 * ongoing trade completion socket payload
 */
export type BlacketTradeCompleteEvent = {
    rewards: BlacketTradeRewards;
    [key: string]: unknown;
};

/**
 * clan attack socket payload
 */
export type BlacketClanAttackEvent = {
    clan?: BlacketClan;
    user?: BlacketUser;
    tokens?: number;
    [key: string]: unknown;
};

/**
 * message create socket payload
 */
export type BlacketMessageCreateEvent = {
    message: BlacketMessage;
    author: BlacketUser;
    room: BlacketRoom;
    [key: string]: unknown;
};

/**
 * message edit/delete socket payload
 */
export type BlacketMessageEvent = {
    message: BlacketMessage;
    author?: BlacketUser;
    room?: BlacketRoom;
    [key: string]: unknown;
};

/**
 * bun/dom blob shape accepted by upload endpoints
 */
export type BlacketUploadFile = Blob & {
    name?: string;
    type: string;
};

/**
 * upload response containing the public url
 */
export type BlacketUploadResponse = BlacketResponse<{
    url: string;
}>;

/**
 * trade request visibility setting
 */
export type RequestSetting = "on" | "off" | "friends";

/**
 * friend request visibility setting
 */
export type FriendRequestSetting = "on" | "off" | "mutual";

/**
 * store purchase item id
 */
export type StoreItem = "plus" | "1hBooster" | "3hBooster" | "rbpaintbucket" | string;

/**
 * stripe/legacy purchase response
 */
export type BlacketPurchaseResponse = BlacketResponse<{
    url: string;
}>;

/**
 * pack opening response
 */
export type BlacketPackOpenResponse = BlacketResponse<{
    blook: string;
}>;
