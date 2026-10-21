import { jest } from "@jest/globals";
import crypto from "node:crypto";
import http from "node:http";
import net from "node:net";
import {
  Event,
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip44,
} from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils.js";
import { NWCClient } from "./NWCClient";
import { Nip47NetworkError } from "./types";

const walletSecretKey = generateSecretKey();
const walletPubkey = getPublicKey(walletSecretKey);
const clientSecretKey = generateSecretKey();
const clientPubkey = getPublicKey(clientSecretKey);

const GET_INFO_RESULT = {
  alias: "test wallet",
  color: "#000000",
  pubkey: "b".repeat(64),
  network: "regtest",
  block_height: 1,
  block_hash: "c".repeat(64),
  methods: ["get_info"],
};

type Filter = {
  kinds?: number[];
  authors?: string[];
  "#e"?: string[];
};

function matches(filter: Filter, event: Event) {
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if (filter.authors && !filter.authors.includes(event.pubkey)) return false;
  if (
    filter["#e"] &&
    !event.tags.some((t) => t[0] === "e" && filter["#e"]!.includes(t[1]))
  )
    return false;
  return true;
}

// accepts TCP connections but never completes the WebSocket handshake
// (e.g. a relay behind a stuck proxy or load balancer)
async function startHalfOpenRelay() {
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as net.AddressInfo;
  return {
    url: `ws://127.0.0.1:${port}`,
    connectionCount: () => sockets.size,
    close: () =>
      new Promise<void>((r) => {
        sockets.forEach((s) => s.destroy());
        server.close(() => r());
      }),
  };
}

function sendText(socket: net.Socket, text: string) {
  const payload = Buffer.from(text, "utf8");
  let header: Buffer;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

// minimal nostr relay over a hand-rolled WebSocket server, with a built-in
// NWC wallet service that publishes its info event and answers get_info
async function startWorkingRelayWithWallet() {
  const events: Event[] = [
    finalizeEvent(
      {
        kind: 13194,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["encryption", "nip44_v2"]],
        content: "get_info",
      },
      walletSecretKey,
    ),
  ];
  const subs = new Map<net.Socket, Map<string, Filter[]>>();
  const received: unknown[][] = [];

  const broadcast = (event: Event) => {
    subs.forEach((socketSubs, socket) => {
      socketSubs.forEach((filters, subId) => {
        if (filters.some((f) => matches(f, event))) {
          sendText(socket, JSON.stringify(["EVENT", subId, event]));
        }
      });
    });
  };

  const handleWalletRequest = (request: Event) => {
    const key = nip44.getConversationKey(walletSecretKey, request.pubkey);
    const { method } = JSON.parse(nip44.decrypt(request.content, key));
    const response = finalizeEvent(
      {
        kind: 23195,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["p", request.pubkey],
          ["e", request.id],
        ],
        content: nip44.encrypt(
          JSON.stringify({ result_type: method, result: GET_INFO_RESULT }),
          key,
        ),
      },
      walletSecretKey,
    );
    events.push(response);
    broadcast(response);
  };

  const handleMessage = (socket: net.Socket, message: unknown[]) => {
    received.push(message);
    const socketSubs = subs.get(socket)!;
    if (message[0] === "REQ") {
      const [, subId, ...filters] = message as [string, string, ...Filter[]];
      socketSubs.set(subId, filters);
      events
        .filter((e) => filters.some((f) => matches(f, e)))
        .forEach((e) => sendText(socket, JSON.stringify(["EVENT", subId, e])));
      sendText(socket, JSON.stringify(["EOSE", subId]));
    } else if (message[0] === "CLOSE") {
      socketSubs.delete(message[1] as string);
    } else if (message[0] === "EVENT") {
      const event = message[1] as Event;
      sendText(socket, JSON.stringify(["OK", event.id, true, ""]));
      events.push(event);
      broadcast(event);
      if (event.kind === 23194) handleWalletRequest(event);
    }
  };

  const server = http.createServer();
  server.on("upgrade", (req, rawSocket) => {
    const socket = rawSocket as net.Socket;
    subs.set(socket, new Map());
    socket.on("close", () => subs.delete(socket));
    socket.on("error", () => {});
    const accept = crypto
      .createHash("sha1")
      .update(
        req.headers["sec-websocket-key"] +
          "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      )
      .digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );

    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      // client frames are always masked; fragmentation is not supported
      while (buffer.length >= 2) {
        const opcode = buffer[0] & 0x0f;
        let length = buffer[1] & 0x7f;
        let offset = 2;
        if (length === 126) {
          if (buffer.length < 4) return;
          length = buffer.readUInt16BE(2);
          offset = 4;
        } else if (length === 127) {
          if (buffer.length < 10) return;
          length = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }
        if (buffer.length < offset + 4 + length) return;
        const mask = buffer.subarray(offset, offset + 4);
        const payload = Buffer.from(
          buffer.subarray(offset + 4, offset + 4 + length),
        );
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
        buffer = buffer.subarray(offset + 4 + length);
        if (opcode === 0x1) {
          handleMessage(socket, JSON.parse(payload.toString("utf8")));
        } else if (opcode === 0x8) {
          socket.end();
        }
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as net.AddressInfo;
  return {
    url: `ws://127.0.0.1:${port}`,
    received,
    close: () =>
      new Promise<void>((r) => {
        subs.forEach((_, s) => s.destroy());
        server.close(() => r());
      }),
  };
}

function createClient(relayUrls: string[]) {
  return new NWCClient({
    nostrWalletConnectUrl: `nostr+walletconnect://${walletPubkey}?${relayUrls
      .map((url) => `relay=${encodeURIComponent(url)}`)
      .join("&")}&secret=${bytesToHex(clientSecretKey)}`,
  });
}

function settleWithin<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise.then(
      (value) => ({ status: "resolved" as const, value }),
      (error) => ({ status: "rejected" as const, error }),
    ),
    new Promise<{ status: "pending" }>((r) =>
      setTimeout(() => r({ status: "pending" }), ms),
    ),
  ]);
}

async function waitFor(condition: () => boolean, ms: number) {
  const started = Date.now();
  while (!condition()) {
    if (Date.now() - started > ms) return false;
    await new Promise((r) => setTimeout(r, 50));
  }
  return true;
}

describe("NWCClient relay connection", () => {
  let consoleError: ReturnType<typeof jest.spyOn>;
  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleError.mockRestore();
  });

  test("request fails when the only relay never completes the handshake", async () => {
    const halfOpen = await startHalfOpenRelay();
    const client = createClient([halfOpen.url]);
    try {
      const started = Date.now();
      const outcome = await settleWithin(client.getInfo(), 8000);
      expect(outcome.status).toBe("rejected");
      if (outcome.status === "rejected") {
        expect(outcome.error).toBeInstanceOf(Nip47NetworkError);
      }
      expect(Date.now() - started).toBeLessThan(5000);
    } finally {
      client.close();
      await halfOpen.close();
    }
  }, 15000);

  test("request succeeds via the working relay when the other relay is half-open", async () => {
    const halfOpen = await startHalfOpenRelay();
    const working = await startWorkingRelayWithWallet();
    const client = createClient([halfOpen.url, working.url]);
    try {
      const outcome = await settleWithin(client.getInfo(), 8000);
      expect(outcome.status).toBe("resolved");
      if (outcome.status === "resolved") {
        expect(outcome.value.alias).toBe(GET_INFO_RESULT.alias);
      }
      expect(
        working.received.some(
          (m) => m[0] === "EVENT" && (m[1] as Event).pubkey === clientPubkey,
        ),
      ).toBe(true);
    } finally {
      client.close();
      await working.close();
      await halfOpen.close();
    }
  }, 15000);

  test("half-open relay is retried instead of staying stuck in its first connection attempt", async () => {
    const halfOpen = await startHalfOpenRelay();
    const working = await startWorkingRelayWithWallet();
    const client = createClient([halfOpen.url, working.url]);
    const disconnects: string[] = [];
    try {
      // a request first opens a connection attempt to every relay
      await client.getInfo();
      // a subscription to the half-open relay must not just join that attempt
      const sub = client.pool.subscribe(
        [halfOpen.url, working.url],
        { kinds: [23196] },
        { ondisconnect: (url) => disconnects.push(url) },
      );
      // the connection attempt times out after maxWaitForConnection (3s) and
      // the reconnect loop opens a new connection after its 1s backoff
      const retried = await waitFor(
        () => disconnects.some((url) => url.startsWith(halfOpen.url)),
        6000,
      );
      sub.close();
      expect(retried).toBe(true);
    } finally {
      client.close();
      await working.close();
      await halfOpen.close();
    }
  }, 15000);
});
