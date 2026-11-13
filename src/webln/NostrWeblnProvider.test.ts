import { jest } from "@jest/globals";
import { NWCClient } from "../nwc/NWCClient";
import { Nip47GetInfoResponse } from "../nwc/types";
import { NostrWebLNProvider } from "./NostrWeblnProvider";

test("getInfo skips NIP-47 methods without a WebLN equivalent", async () => {
  const client = new NWCClient({
    relayUrls: ["wss://relay.example.com"],
    walletPubkey:
      "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
  });
  jest.spyOn(client, "getInfo").mockResolvedValue({
    methods: ["get_info", "make_hold_invoice", "pay_invoice"],
  } as Nip47GetInfoResponse);
  const provider = new NostrWebLNProvider({ client });
  await provider.enable();

  const info = await provider.getInfo();
  expect(info.methods).toEqual(["getInfo", "sendPayment"]);
});
