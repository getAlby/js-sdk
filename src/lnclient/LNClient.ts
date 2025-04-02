import { Invoice, LightningAddress } from "@getalby/lightning-tools";
import { Nip47MakeInvoiceRequest, Nip47PayInvoiceRequest } from "../nwc/types";
import { NewNWCClientOptions, NWCClient } from "../nwc/NWCClient";
import { ReceiveInvoice } from "./ReceiveInvoice";
import { Amount, resolveAmount } from "./Amount";

type LNClientCredentials = string | NWCClient | NewNWCClientOptions;

export class LNClient {
  readonly nwcClient: NWCClient;

  constructor(credentials: LNClientCredentials) {
    if (typeof credentials === "string") {
      this.nwcClient = new NWCClient({
        nostrWalletConnectUrl: credentials,
      });
    } else if (credentials instanceof NWCClient) {
      this.nwcClient = credentials;
    } else {
      this.nwcClient = new NWCClient(credentials);
    }
  }

  async pay(
    recipient: string,
    amount?: Amount,
    args?: Omit<Nip47PayInvoiceRequest, "invoice" | "amount">,
  ) {
    let invoice = recipient;
    const parsedAmount = amount ? await resolveAmount(amount) : undefined;
    if (invoice.indexOf("@") > -1) {
      if (!parsedAmount) {
        throw new Error(
          "Amount must be provided when paying to a lightning address",
        );
      }
      const ln = new LightningAddress(recipient);
      await ln.fetch();
      const invoiceObj = await ln.requestInvoice({
        satoshi: parsedAmount.satoshi,
      });
      invoice = invoiceObj.paymentRequest;
    }

    const result = await this.nwcClient.payInvoice({
      ...(args || {}),
      invoice,
      amount: parsedAmount?.millisat,
    });
    return {
      ...result,
      invoice: new Invoice({ pr: invoice }),
    };
  }

  async receive(
    amount: Amount,
    args?: Omit<Nip47MakeInvoiceRequest, "amount">,
  ) {
    const parsedAmount = await resolveAmount(amount);
    const transaction = await this.nwcClient.makeInvoice({
      ...(args || {}),
      amount: parsedAmount.millisat,
    });

    return new ReceiveInvoice(this.nwcClient, transaction);
  }

  close() {
    this.nwcClient.close();
  }
}

export { LNClient as LN };
