import { LightningAddress } from "@getalby/lightning-tools";
import { getAuthClient } from "./helper";

const userAgent = "AlbySDK-Example/0.1 (send_to_ln_address-demo)";

const client = await getAuthClient(userAgent, ["payments:send"]);
const ln = new LightningAddress("hello@getalby.com");
// fetch the LNURL data
await ln.fetch();

const invoice = await ln.requestInvoice({ satoshi: 1000 });

const response = await client.sendPayment({ invoice: invoice.paymentRequest });

console.log(JSON.stringify(response, null, 2));
