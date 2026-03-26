import { NWCClient } from "../src/nwc/NWCClient";
import { Nip47WalletError } from "../src/nwc/types";
import { createTestWallet } from "./helpers";

/**
 * E2E test for multi_pay_keysend using the NWC faucet.
 * Requires network access.
 */
describe("NWC multi_pay_keysend", () => {
  const AMOUNT_MSATS = 50_000; // 50 sats
  const BALANCE_SATS = 10_000;

  let sender: { nwcUrl: string };
  let receiver: { nwcUrl: string };

  beforeAll(async () => {
    receiver = await createTestWallet(BALANCE_SATS);
    sender = await createTestWallet(BALANCE_SATS);
  }, 60_000);

  test(
    "sends multiple keysends when supported, otherwise returns NOT_IMPLEMENTED",
    async () => {
      const receiverClient = new NWCClient({
        nostrWalletConnectUrl: receiver.nwcUrl,
      });
      const senderClient = new NWCClient({ nostrWalletConnectUrl: sender.nwcUrl });

      try {
        const senderInfo = await senderClient.getInfo();

        if (!senderInfo.methods.includes("multi_pay_keysend")) {
          await expect(
            senderClient.multiPayKeysend({
              keysends: [{ amount: AMOUNT_MSATS, pubkey: "invalidpubkey" }],
            }),
          ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
          return;
        }

        const receiverInfo = await receiverClient.getInfo();
        expect(receiverInfo.pubkey).toBeDefined();

        const multiPayResult = await senderClient.multiPayKeysend({
          keysends: [
            { amount: AMOUNT_MSATS, pubkey: receiverInfo.pubkey },
            { amount: AMOUNT_MSATS, pubkey: receiverInfo.pubkey },
          ],
        });

        expect(Array.isArray(multiPayResult.keysends)).toBe(true);
        expect(multiPayResult.keysends.length).toBe(2);
        expect(multiPayResult.errors).toEqual([]);
        expect(multiPayResult.keysends[0].preimage).toBeDefined();
        expect(multiPayResult.keysends[1].preimage).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Nip47WalletError);
        expect((error as Nip47WalletError).code).toBe("NOT_IMPLEMENTED");
      } finally {
        receiverClient.close();
        senderClient.close();
      }
    },
    90_000,
  );
});
