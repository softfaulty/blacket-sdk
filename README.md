# blacket-sdk

small typescript sdk for the blacket web api.

bun package. oop client. cookies in, typed responses out. no dependency pile, no factory labyrinth, no architecture pretending it pays rent.

## install

```bash
bun add blacket-sdk
```

local dev:

```bash
bun install
```

## auth

blacket uses a session cookie. this sdk does not log in for you.

grab a valid cookie from your app/browser context and pass it in:

```ts
import { BlacketClient } from "blacket-sdk";

const cookie = process.env.COOKIES;

if (!cookie) {
    throw new Error("Missing COOKIES env var");
}

const client = new BlacketClient({ cookie });
```

yes, the env var is named `COOKIES` in the examples. no, this is not spiritually elegant. it works.

## basic use

most api methods return blacket's normal response shape:

```ts
const res = await client.users.me();

if (res.error) {
    throw new Error(res.reason ?? "failed to get current user");
}

console.log(res.user.username);
```

same thing for clans:

```ts
import { BlacketClient, type BlacketClan } from "blacket-sdk";

const client = new BlacketClient({ cookie });
const res = await client.clans.mine();

if (res.error) {
    throw new Error(res.reason ?? "failed to get clan");
}

const clan: BlacketClan = res.clan;

console.log(clan.color);
```

the error check matters. typescript is not being dramatic there. the response can actually be an error-shaped little brick.

## categories

the client is split by the same rough areas as the site:

```ts
client.data.index();
client.account.currentUser();
client.users.get("softfault");
client.friends.request("user-id");
client.settings.color("#ff00ff");
client.cosmetics.avatar("Blook Name");
client.store.startPurchase("plus", 1, "https://blacket.org/");
client.market.openPack("Pack Name");
client.clans.mine();
client.trades.sendRequest("user-id");
client.messages.list(0);
```

each category is just a small class. no registries. no adapters. no fake enterprise fog machine.

## raw requests

if the sdk does not have a named method yet, use the raw helpers:

```ts
const data = await client.get("/data/index.json");

const result = await client.post("/worker/friends/request", {
    user: "user-id",
});
```

you can pass a generic if you know the shape:

```ts
const res = await client.get<{ emojis: string[] }>("/content/emojis.json");
```

## sockets

create and connect the socket:

```ts
const socket = client.connectSocket();

await socket.waitUntilOpen();
```

reply to heartbeats:

```ts
client.account.replyToHeartbeat();
```

listen for messages:

```ts
client.messages.onCreate((event) => {
    console.log(event.data.author.username, event.data.message.content);
});
```

send a message:

```ts
await client.messages.send(0, "hello world");
```

trade events are typed too:

```ts
client.trades.onRequestReceived(async (event) => {
    if (event.data.user.username !== "Unblooked") {
        return;
    }

    const accepted = await client.trades.acceptRequest();

    if (accepted.error) {
        throw new Error(accepted.reason ?? "failed to accept trade");
    }

    client.trades.sendTokens("200");
    client.trades.acceptOngoing();
});
```

## uploads

uploads follow blacket's signed upload flow:

```ts
const file = Bun.file("./avatar.png");
const res = await client.account.upload(file);

if (res.error) {
    throw new Error(res.reason ?? "upload failed");
}

console.log(res.url);
```

## scripts

```bash
bun run typecheck
bun run build
```

`bun run build` writes `dist/`. git ignores it because generated files love lying about what changed.

## project shape

```txt
src/types.ts   shared public types
src/http.ts    fetch wrapper, cookies, uploads, socket url helpers
src/socket.ts  websocket wrapper and event maps
src/client.ts  the public sdk client and categories
src/index.ts   package exports
```

## what this does not do

- ZERO event stuff
- no runtime validation layer
- no retry strategy beyond the tiny 503 retry in `BlacketHttp`

the sdk is intentionally boring. boring survives production. flashy abstractions usually just leave fingerprints on the crash report.

## publishing

before publishing:

```bash
bun run build
npm publish
```

`prepublishOnly` runs the build too, because forgetting generated declarations is a classic way to ruin your own afternoon.
