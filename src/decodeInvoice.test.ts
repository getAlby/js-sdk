import { decodeInvoice } from "./decodeInvoice";

const invoice =
  "lnbc10n1pj4xmazpp5ns890al37jpreen4rlpl6fsw2hlp9n9hm0ts4dvwvcxq8atf4v6qhp50kncf9zk35xg4lxewt4974ry6mudygsztsz8qn3ar8pn3mtpe50scqzzsxqyz5vqsp5k508kdmvfpuac6lvn9wumr9x4mcpnh2t6jyp5kkxcjhueq4xjxqq9qyyssq0m88mwgknhkqfsa9u8e9dp8v93xlm0lqggslzj8mpsnx3mdzm8z5k9ns7g299pfm9zwm4crs00a364cmpraxr54jw5cf2qx9vycucggqz2ggul";

describe("decodeInvoice", () => {
  test("get amount from invoice", () => {
    const decodedInvoice = decodeInvoice(invoice);
    const amountSection = decodedInvoice.sections.find(
      (section) => section.name === "amount",
    );
    if (amountSection?.name !== "amount") {
      throw new Error("did not find amount section");
    }
    const value = amountSection.value as string;
    expect(value).toEqual("1000");
  });

  test("get payment hash from invoice", () => {
    const decodedInvoice = decodeInvoice(invoice);
    const paymentHashSection = decodedInvoice.sections.find(
      (section) => section.name === "payment_hash",
    );
    if (paymentHashSection?.name !== "payment_hash") {
      throw new Error("did not find payment_hash section");
    }
    const value = paymentHashSection.value as string;
    expect(value).toEqual(
      "9c0e57f7f1f4823ce6751fc3fd260e55fe12ccb7dbd70ab58e660c03f569ab34",
    );
  });
});
