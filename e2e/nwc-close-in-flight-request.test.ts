import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils.js";
import { NWCClient } from "../src/nwc/NWCClient";
import {
  NWCWalletService,
  NWCWalletServiceKeyPair,
} from "../src/nwc/NWCWalletService";

const RELAY_URL = "wss://relay.getalby.com/v1";

function getOpenTlsSockets(): number {
  const handles = (
    process as unknown as { _getActiveHandles: () => unknown[] }
  )._getActiveHandles();
  return handles.filter(
    (h) =>
      (h as object).constructor.name === "TLSSocket" &&
      (h as { readyState?: string }).readyState === "open",
  ).length;
}

test("closing a client with an in-flight request leaks no socket", async () => {
  const walletSecret = bytesToHex(generateSecretKey());
  const clientSecret = generateSecretKey();
  const keypair = new NWCWalletServiceKeyPair(
    walletSecret,
    getPublicKey(clientSecret),
  );

  const service = new NWCWalletService({ relayUrls: [RELAY_URL] });
  await service.publishWalletServiceInfoEvent(walletSecret, ["get_info"], []);
  const unsubscribe = await service.subscribe(keypair, {
    // never respond, so the client's request stays in flight
    getInfo: () => new Promise(() => {}),
  });

  const client = new NWCClient({
    nostrWalletConnectUrl: `nostr+walletconnect://${
      keypair.walletPubkey
    }?relay=${encodeURIComponent(RELAY_URL)}&secret=${bytesToHex(
      clientSecret,
    )}`,
  });

  const getInfoPromise = client.getInfo().catch(() => "error");
  // give the request time to be published and reach the wallet service
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // close everything while the request is still awaiting a reply
  client.close();
  unsubscribe();
  service.close();

  // previously the in-flight request's subscription would reconnect
  // ~1s after close and leave the new socket open forever
  await new Promise((resolve) => setTimeout(resolve, 12000));
  expect(getOpenTlsSockets()).toBe(0);
  await getInfoPromise;
}, 40_000);
