import * as crypto from "node:crypto"; // required in node.js < 20
if (!global.crypto) {
  global.crypto = crypto;
}
