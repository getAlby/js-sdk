import { NWCClient } from "../src/nwc/NWCClient";
import { createTestWallet } from "./helpers";

/**
 * E2E test for pay_keysend using the NWC faucet.
 * Requires network access.
 */
describe("NWC pay_keysend", () => {
  const AMOUNT_MSATS = 100_000; // 100 sats
  const BALANCE_SATS = 10_000;

  let sender: { nwcUrl: string };
  let receiver: { nwcUrl: string };

  beforeAll(async () => {
    receiver = await createTestWallet(BALANCE_SATS);
    sender = await createTestWallet(BALANCE_SATS);
  }, 60_000);

  test(
    "sends keysend payment to receiver pubkey",
    async () => {
      const receiverClient = new NWCClient({ nostrWalletConnectUrl: receiver.nwcUrl });
      const senderClient = new NWCClient({ nostrWalletConnectUrl: sender.nwcUrl });

      try {
        const receiverInfoResult = await receiverClient.getInfo();
        expect(receiverInfoResult.pubkey).toBeDefined();

        const keysendResult = await senderClient.payKeysend({
          amount: AMOUNT_MSATS,
          pubkey: receiverInfoResult.pubkey,
        });
        expect(keysendResult.preimage).toBeDefined();
        expect(typeof keysendResult.preimage).toBe("string");
      } finally {
        receiverClient.close();
        senderClient.close();
      }
    },
    60_000,
  );
});
