import { Client, GetInvoicesRequestParams } from "@getalby/sdk/oauth";
import { getAuthClient } from "./helper";

const userAgent = "AlbySDK-Example/0.1 (invoices-demo)";

const auth = await getAuthClient(userAgent);

const client = new Client(auth);

const params: GetInvoicesRequestParams = {
  page: 1,
  items: 5,
};
const response = await client.incomingInvoices(params);

console.log(JSON.stringify(response, null, 2));

if (response[0]) {
  const invoice = await client.getInvoice(response[0].r_hash_str);
  console.log(JSON.stringify(invoice, null, 2));
}
