import { generateSecretKey, getPublicKey, Event, Filter } from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  NWCWalletService,
  NWCWalletServiceKeyPair,
  NWCWalletServiceSubscribeFilter,
} from "./NWCWalletService";
import { NWCWalletServiceRequestHandler } from "./NWCWalletServiceRequestHandler";
import { Nip47GetInfoResponse } from "./types";

type SubscribeParams = {
  onevent: (event: Event) => Promise<void> | void;
};

async function setupSubscribedWalletService(
  handler: NWCWalletServiceRequestHandler,
  filter?: NWCWalletServiceSubscribeFilter,
) {
  const walletSecret = bytesToHex(generateSecretKey());
  const clientSecret = generateSecretKey();
  const keypair = new NWCWalletServiceKeyPair(
    walletSecret,
    getPublicKey(clientSecret),
  );

  // the relay is never actually connected to: the pool is mocked below
  const service = new NWCWalletService({
    relayUrls: ["wss://relay.getalby.com/v1"],
  });

  let subscribeParams: SubscribeParams | undefined;
  let subscribeFilter: Filter | undefined;
  service.pool.subscribe = (_relayUrls, poolFilter, params) => {
    subscribeFilter = poolFilter;
    subscribeParams = params as SubscribeParams;
    return { close: () => {} } as ReturnType<typeof service.pool.subscribe>;
  };
  service.pool.publish = () => [Promise.resolve("")];
  (
    service as unknown as { _checkConnected: () => Promise<void> }
  )._checkConnected = () => Promise.resolve();

  const unsubscribe = await service.subscribe(keypair, handler, filter);
  if (!subscribeParams || !subscribeFilter) {
    throw new Error("subscribe was not called on the pool");
  }

  // a valid get_info request event as the client would publish it
  const requestEvent = await service.signEvent(
    {
      kind: 23194,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["p", keypair.walletPubkey],
        ["encryption", "nip44_v2"],
      ],
      content: await service.encrypt(
        keypair,
        JSON.stringify({ method: "get_info", params: {} }),
        "nip44_v2",
      ),
    },
    bytesToHex(clientSecret),
  );

  return {
    service,
    subscribeParams,
    subscribeFilter,
    requestEvent,
    unsubscribe,
    keypair,
  };
}

const getInfoResponse = {
  result: {
    alias: "test",
    methods: ["get_info"],
  } as Nip47GetInfoResponse,
  error: undefined,
};

describe("recordEvent", () => {
  test("handles the request when recordEvent does not skip it", async () => {
    const recordedIds: string[] = [];
    let getInfoCalls = 0;
    const getInfo = async () => {
      getInfoCalls++;
      return getInfoResponse;
    };
    const { subscribeParams, requestEvent } =
      await setupSubscribedWalletService({
        recordEvent: (eventId) => {
          recordedIds.push(eventId);
          return undefined;
        },
        getInfo,
      });

    await subscribeParams.onevent(requestEvent);

    expect(recordedIds).toEqual([requestEvent.id]);
    expect(getInfoCalls).toBe(1);
  });

  test("skips events that were already processed", async () => {
    let getInfoCalls = 0;
    const getInfo = async () => {
      getInfoCalls++;
      return getInfoResponse;
    };
    const { subscribeParams, requestEvent } =
      await setupSubscribedWalletService({
        recordEvent: () => "ALREADY_PROCESSED",
        getInfo,
      });

    await subscribeParams.onevent(requestEvent);

    expect(getInfoCalls).toBe(0);
  });

  test("serializes recordEvent calls so concurrent duplicates cannot both pass", async () => {
    const recordedIds: string[] = [];
    let getInfoCalls = 0;
    const getInfo = async () => {
      getInfoCalls++;
      return getInfoResponse;
    };
    const { subscribeParams, requestEvent } =
      await setupSubscribedWalletService({
        // an async check-then-record, as an app backed by a database would do.
        // without serialization, two concurrent calls would both pass the check.
        recordEvent: async (eventId) => {
          const alreadyProcessed = recordedIds.includes(eventId);
          await new Promise((resolve) => setTimeout(resolve, 10));
          if (alreadyProcessed) {
            return "ALREADY_PROCESSED";
          }
          recordedIds.push(eventId);
          return undefined;
        },
        getInfo,
      });

    await Promise.all([
      subscribeParams.onevent(requestEvent),
      subscribeParams.onevent(requestEvent),
    ]);

    expect(getInfoCalls).toBe(1);
  });
});

describe("response publishing", () => {
  test("retries failed publishes with exponential backoff", async () => {
    const { service, subscribeParams, requestEvent } =
      await setupSubscribedWalletService({
        getInfo: async () => getInfoResponse,
      });

    let publishCalls = 0;
    service.pool.publish = () => {
      publishCalls++;
      return [
        publishCalls < 2
          ? Promise.reject(new Error("publish failed"))
          : Promise.resolve(""),
      ];
    };

    await subscribeParams.onevent(requestEvent);

    // the first attempt happens immediately and fails
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(publishCalls).toBe(1);

    // the second attempt happens after a 1s backoff and succeeds
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(publishCalls).toBe(2);
  }, 10_000);

  test("stops retrying after unsubscribing", async () => {
    const { service, subscribeParams, requestEvent, unsubscribe } =
      await setupSubscribedWalletService({
        getInfo: async () => getInfoResponse,
      });

    let publishCalls = 0;
    service.pool.publish = () => {
      publishCalls++;
      return [Promise.reject(new Error("publish failed"))];
    };

    await subscribeParams.onevent(requestEvent);
    unsubscribe();

    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(publishCalls).toBe(1);
  }, 10_000);

  test("stops retrying after the service is closed", async () => {
    const { service, subscribeParams, requestEvent } =
      await setupSubscribedWalletService({
        getInfo: async () => getInfoResponse,
      });

    let publishCalls = 0;
    service.pool.publish = () => {
      publishCalls++;
      return [Promise.reject(new Error("publish failed"))];
    };

    await subscribeParams.onevent(requestEvent);
    service.close();

    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(publishCalls).toBe(1);
  }, 10_000);
});

describe("subscribe filter", () => {
  test("omits since and until when no filter is provided", async () => {
    const { subscribeFilter, keypair } = await setupSubscribedWalletService({});

    expect(subscribeFilter).toEqual({
      kinds: [23194],
      authors: [keypair.clientPubkey],
      "#p": [keypair.walletPubkey],
    });
    expect(subscribeFilter).not.toHaveProperty("since");
    expect(subscribeFilter).not.toHaveProperty("until");
  });

  test("includes since and until when provided", async () => {
    const since = 1_700_000_000;
    const until = 1_800_000_000;
    const { subscribeFilter, keypair } = await setupSubscribedWalletService(
      {},
      { since, until },
    );

    expect(subscribeFilter).toEqual({
      kinds: [23194],
      authors: [keypair.clientPubkey],
      "#p": [keypair.walletPubkey],
      since,
      until,
    });
  });

  test("includes only the bounds that are set", async () => {
    const since = 1_700_000_000;
    const { subscribeFilter } = await setupSubscribedWalletService(
      {},
      { since },
    );

    expect(subscribeFilter.since).toBe(since);
    expect(subscribeFilter).not.toHaveProperty("until");
  });
});
