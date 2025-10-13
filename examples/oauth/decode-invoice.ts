import { getAuthClient } from "./helper";

const userAgent = "AlbySDK-Example/0.1 (decode_invoice-demo)"
const paymentRequest =
  "lnbc10u1pj4t6w0pp54wm83znxp8xly6qzuff2z7u6585rnlcw9uduf2haa42qcz09f5wqdq023jhxapqd4jk6mccqzzsxqyz5vqsp5mlvjs8nktpz98s5dcrhsuelrz94kl2vjukvu789yzkewast6m00q9qyyssqupynqdv7e5y8nlul0trva5t97g7v3gwx7akhu2dvu4pn66eu2pr5zkcnegp8myz3wrpj9ht06pwyfn4dvpmnr96ejq6ygex43ymaffqq3gud4d";

const client = await getAuthClient(userAgent);
const response = await client.decodeInvoice(paymentRequest);

console.log(JSON.stringify(response, null, 2));
