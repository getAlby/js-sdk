import { getAuthClient } from "./helper";

const userAgent = "AlbySDK-Example/0.1 (keysends-demo)"

const client = await getAuthClient(userAgent);

const response = client.keysend([
  {
    amount: 10,
    destination:
      "03006fcf3312dae8d068ea297f58e2bd00ec1ffe214b793eda46966b6294a53ce6",
    customRecords: { 34349334: "I love amboss" },
  },
  {
    amount: 11,
    destination:
      "03006fcf3312dae8d068ea297f58e2bd00ec1ffe214b793eda46966b6294a53ce6",
    customRecords: { 34349334: "I love amboss" },
  },
]);

console.log(JSON.stringify(response));
