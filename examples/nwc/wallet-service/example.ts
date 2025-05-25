import "websocket-polyfill"; // required in node.js

import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

const walletServiceSecretKey = bytesToHex(generateSecretKey());
const walletServicePubkey = getPublicKey(hexToBytes(walletServiceSecretKey));

const clientSecretKey = bytesToHex(generateSecretKey());
const clientPubkey = getPublicKey(hexToBytes(clientSecretKey));

const relayUrl = "wss://relay.getalby.com/v1";

const nwcUrl = `nostr+walletconnect://${walletServicePubkey}?relay=${relayUrl}&secret=${clientSecretKey}`;

console.info("enter this NWC URL in a client: ", nwcUrl);

import { nwc } from "../../../dist/index.module.js";
import type {nwc as NWC} from "../../../dist/index"



const walletService = new nwc.NWCWalletService({
  relayUrl,
}) as NWC.NWCWalletService;

await walletService.publishWalletServiceInfoEvent(
  walletServiceSecretKey,
  ["get_info"],
  [],
);

// TODO: fix errors for example to work
// const keypair = new nwc.NWCWalletServiceKeyPair(
//   walletServiceSecretKey,
//   clientPubkey,
// ) ;

// const unsub = await walletService.subscribe(keypair, {
//   getInfo: () => {
//     return Promise.resolve({
//       result: {
//         methods: ["get_info"],
//         alias: "Alby Hub",
//         //... add other fields here
//       },
//       error: undefined,
//     });
//   },
//   // ... handle other NIP-47 methods here
// });

// console.info("Waiting for events...");
// process.on("SIGINT", function () {
//   console.info("Caught interrupt signal");

//   unsub();
//   walletService.close();

//   process.exit();
// });
