import "websocket-polyfill";
import { NWCClient } from "./NWCClient";

// create an isolated connection in Alby Hub and top it up with 100 sats
// set process.env.NWC_URL to the connection secret.

describe("NWCClient E2E", () => {
  test("get wallet service info", async () => {
    expect(process.env.NWC_URL).toBeTruthy();
    const client = new NWCClient({
      nostrWalletConnectUrl: process.env.NWC_URL!,
    });
    const info = await client.getWalletServiceInfo();
    expect(info.encryptions.includes("nip44_v2"));
    expect(info.notifications.includes("payment_received"));
    expect(info.capabilities.includes("pay_invoice"));
    expect(info.capabilities.includes("notifications"));
    client.close();
  });
  test("get_info", async () => {
    expect(process.env.NWC_URL).toBeTruthy();
    const client = new NWCClient({
      nostrWalletConnectUrl: process.env.NWC_URL!,
    });
    const info = await client.getInfo();
    expect(info.methods.includes("get_info"));
    client.close();
  });
  test("get_balance", async () => {
    expect(process.env.NWC_URL).toBeTruthy();
    const client = new NWCClient({
      nostrWalletConnectUrl: process.env.NWC_URL!,
    });
    const balance = await client.getBalance();
    expect(balance.balance).toBe(100_000);
    client.close();
  });
  test("self payments", async () => {
    const startTimestamp = Date.now() / 1000;
    expect(process.env.NWC_URL).toBeTruthy();
    const client = new NWCClient({
      nostrWalletConnectUrl: process.env.NWC_URL!,
    });
    const transaction = await client.makeInvoice({
      amount: 1000,
    });
    expect(transaction.invoice).toBeTruthy();

    const payInvoiceResponse = await client.payInvoice({
      invoice: transaction.invoice,
    });
    expect(payInvoiceResponse.preimage).toBeTruthy();
    const paidTransaction = await client.lookupInvoice({
      payment_hash: transaction.payment_hash,
    });
    expect(paidTransaction.settled_at).toBeGreaterThan(startTimestamp);
    client.close();
  });
});
