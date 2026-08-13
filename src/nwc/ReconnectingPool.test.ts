import { Relay } from "nostr-tools";
import { ReconnectingPool } from "./ReconnectingPool";

type FakeSubscriptionParams = {
  onclose?: (reason: string) => void;
};

// replaces pool.ensureRelay with a fake so no network is involved.
// returns helpers to count connections and simulate relay disconnects.
function mockEnsureRelay(pool: ReconnectingPool) {
  const ensureRelayCalls: string[] = [];
  const subscriptionParams = new Map<string, FakeSubscriptionParams>();

  pool.ensureRelay = async (url: string) => {
    ensureRelayCalls.push(url);
    return {
      subscribe: (
        _filters: unknown,
        params: FakeSubscriptionParams,
      ): unknown => {
        subscriptionParams.set(url, params);
        return {
          close: (reason?: string) =>
            params.onclose?.(reason || "closed by caller"),
        };
      },
      close: () => {},
    } as unknown as Relay;
  };

  return {
    ensureRelayCalls,
    disconnect: (url: string) => {
      subscriptionParams.get(url)?.onclose?.("relay connection closed");
    },
  };
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RELAY_URL = "wss://relay.getalby.com/v1";

describe("ReconnectingPool.close", () => {
  test("stops subscription reconnect loops so closed relays are not re-opened", async () => {
    const pool = new ReconnectingPool();
    const { ensureRelayCalls, disconnect } = mockEnsureRelay(pool);

    pool.subscribe([RELAY_URL], { kinds: [23194] }, {});
    await flushMicrotasks();
    expect(ensureRelayCalls).toEqual([RELAY_URL]);

    // relay disconnects; the subscription now waits 1s to reconnect
    disconnect(RELAY_URL);
    await flushMicrotasks();

    // closing the pool during that wait must stop the reconnect loop -
    // previously the loop reconnected after the backoff, opening a new
    // socket that nothing ever closed
    pool.close([RELAY_URL]);
    await sleep(1200);
    expect(ensureRelayCalls).toEqual([RELAY_URL]);
  }, 10_000);

  test("closing while the subscription is connected does not reconnect", async () => {
    const pool = new ReconnectingPool();
    const { ensureRelayCalls, disconnect } = mockEnsureRelay(pool);

    pool.subscribe([RELAY_URL], { kinds: [23194] }, {});
    await flushMicrotasks();

    // pool.close closes the relay, which disconnects the inner
    // subscription - the loop must treat this as final
    pool.close([RELAY_URL]);
    disconnect(RELAY_URL);
    await sleep(1200);
    expect(ensureRelayCalls).toEqual([RELAY_URL]);
  }, 10_000);

  test("destroy stops subscription reconnect loops", async () => {
    const pool = new ReconnectingPool();
    const { ensureRelayCalls, disconnect } = mockEnsureRelay(pool);

    pool.subscribe([RELAY_URL], { kinds: [23194] }, {});
    await flushMicrotasks();

    disconnect(RELAY_URL);
    await flushMicrotasks();
    pool.destroy();
    await sleep(1200);
    expect(ensureRelayCalls).toEqual([RELAY_URL]);
  }, 10_000);

  test("closing the subscription itself still stops reconnects", async () => {
    const pool = new ReconnectingPool();
    const { ensureRelayCalls, disconnect } = mockEnsureRelay(pool);

    const sub = pool.subscribe([RELAY_URL], { kinds: [23194] }, {});
    await flushMicrotasks();

    disconnect(RELAY_URL);
    await flushMicrotasks();
    sub.close();
    await sleep(1200);
    expect(ensureRelayCalls).toEqual([RELAY_URL]);
  }, 10_000);

  test("a closed pool cannot open new connections", async () => {
    const pool = new ReconnectingPool();
    pool.close([RELAY_URL]);

    await expect(pool.ensureRelay(RELAY_URL)).rejects.toThrow("pool is closed");
    await expect(pool.publish([RELAY_URL], {} as never)[0]).rejects.toThrow(
      "pool is closed",
    );
  });
});
