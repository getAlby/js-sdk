import { Filter, Relay, Event } from "nostr-tools";

function normalizeURL(url: string): string {
  try {
    if (url.indexOf("://") === -1) url = "wss://" + url;
    const p = new URL(url);
    if (p.protocol === "http:") p.protocol = "ws:";
    else if (p.protocol === "https:") p.protocol = "wss:";
    p.pathname = p.pathname.replace(/\/+/g, "/");
    if (p.pathname.endsWith("/")) p.pathname = p.pathname.slice(0, -1);
    if (
      (p.port === "80" && p.protocol === "ws:") ||
      (p.port === "443" && p.protocol === "wss:")
    )
      p.port = "";
    p.searchParams.sort();
    p.hash = "";
    return p.toString();
  } catch (e) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

export type SubCloser = { close: (reason?: string) => void };

type SubscribeManyParams = {
  onevent?: (evt: Event) => void;
  onconnect?: (url: string) => void;
  ondisconnect?: (url: string, reason: string) => void;
  abort?: AbortSignal;
};

// First reconnect waits 1s; each subsequent attempt doubles, capped at 5 minutes.
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 5 * 60 * 1000;

export class ReconnectingPool {
  protected relays: Map<string, Relay> = new Map();

  public enablePing: boolean | undefined;
  public maxWaitForConnection: number;

  constructor() {
    this.enablePing = false;
    this.maxWaitForConnection = 3000;
  }

  async ensureRelay(
    url: string,
    params?: {
      connectionTimeout?: number;
      abort?: AbortSignal;
    },
  ): Promise<Relay> {
    url = normalizeURL(url);

    let relay = this.relays.get(url);
    if (!relay) {
      // enableReconnect is false because reconnects are managed by subscribe()
      // below; with it on, nostr-tools silently re-fires subscriptions on
      // disconnect without firing the subscription onclose we depend on.
      relay = new Relay(url, {
        enablePing: this.enablePing,
        enableReconnect: false,
      });
      relay.onclose = () => {
        this.relays.delete(url);
      };
      this.relays.set(url, relay);
    }

    try {
      await relay.connect({
        timeout: params?.connectionTimeout,
        abort: params?.abort,
      });
    } catch (err) {
      this.relays.delete(url);
      throw err;
    }

    return relay;
  }

  close(relays: string[]) {
    relays.map(normalizeURL).forEach((url) => {
      this.relays.get(url)?.close();
      this.relays.delete(url);
    });
  }

  subscribe(
    relays: string[],
    filter: Filter,
    params: SubscribeManyParams,
  ): SubCloser {
    const uniqueUrls: string[] = [];
    const seen = new Set<string>();
    for (const raw of relays) {
      const url = normalizeURL(raw);
      if (seen.has(url)) continue;
      seen.add(url);
      uniqueUrls.push(url);
    }

    type Subscription = ReturnType<Relay["subscribe"]>;
    let closed = false;
    const activeSubs = new Map<string, Subscription>();
    const pendingWaits = new Set<() => void>();
    const knownIds = new Set<string>();
    const alreadyHaveEvent = (id: string) => {
      if (knownIds.has(id)) return true;
      knownIds.add(id);
      return false;
    };

    const waitForReconnect = (attempt: number): Promise<void> => {
      if (closed) return Promise.resolve();
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * 2 ** attempt,
        MAX_RECONNECT_DELAY_MS,
      );
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          pendingWaits.delete(cancel);
          resolve();
        }, delay);
        const cancel = () => {
          clearTimeout(timer);
          pendingWaits.delete(cancel);
          resolve();
        };
        pendingWaits.add(cancel);
      });
    };

    const runRelay = async (url: string) => {
      let attempt = 0;
      while (!closed) {
        let relay: Relay;
        try {
          relay = await this.ensureRelay(url, {
            connectionTimeout: this.maxWaitForConnection,
            abort: params.abort,
          });
        } catch (err) {
          if (closed) return;
          const reason = (err as { message?: string })?.message || String(err);
          params.ondisconnect?.(url, reason);
          await waitForReconnect(attempt++);
          continue;
        }

        if (closed) return;
        params.onconnect?.(url);
        attempt = 0;

        const closeReason = await new Promise<string>((resolve) => {
          const innerSub: Subscription = relay.subscribe([filter], {
            eoseTimeout: 1, // 1ms (if 0 is provided, uses default of 4400ms)
            onevent: params.onevent,
            onclose: resolve,
            abort: params.abort,
            alreadyHaveEvent,
          });
          activeSubs.set(url, innerSub);
        });

        activeSubs.delete(url);
        if (closed) return;
        params.ondisconnect?.(url, closeReason);
        await waitForReconnect(attempt++);
      }
    };

    uniqueUrls.forEach((url) => {
      runRelay(url);
    });

    return {
      close(reason?: string) {
        if (closed) return;
        closed = true;
        pendingWaits.forEach((cancel) => cancel());
        pendingWaits.clear();
        activeSubs.forEach((sub) => sub.close(reason));
        activeSubs.clear();
      },
    };
  }

  publish(
    relays: string[],
    event: Event,
    params?: {
      abort?: AbortSignal;
    },
  ): Promise<string>[] {
    return relays.map(normalizeURL).map(async (url, i, arr) => {
      if (arr.indexOf(url) !== i) {
        return Promise.reject("duplicate url");
      }

      let r: Relay;
      try {
        r = await this.ensureRelay(url, {
          connectionTimeout: this.maxWaitForConnection,
          abort: params?.abort,
        });
      } catch (err) {
        return String("connection failure: " + String(err));
      }

      return r.publish(event);
    });
  }

  listConnectionStatus(): Map<string, boolean> {
    const map = new Map<string, boolean>();
    this.relays.forEach((relay, url) => map.set(url, relay.connected));

    return map;
  }

  destroy(): void {
    this.relays.forEach((conn) => conn.close());
    this.relays = new Map();
  }
}
