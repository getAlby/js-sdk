import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";
dotenv.config();
import { Client, OAuth2Scopes, OAuth2User } from "@getalby/sdk/oauth";

async function getAuthClient(user_agent: string, scopes: OAuth2Scopes[]) {
  if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
    const rl = readline.createInterface({ input, output });

    console.log("🔑 Using OAuth2 flow with CLIENT_ID and CLIENT_SECRET...");
    const authClient = new OAuth2User({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      callback: "http://localhost:8080",
      scopes,
      user_agent,
      token: {
        access_token: undefined,
        refresh_token: undefined,
        expires_at: undefined,
      }, // initialize with existing token
    });

    console.log(`Open the following URL and authenticate the app:`);
    console.log(await authClient.generateAuthURL());
    console.log("----\n");

    const code = await rl.question("Code: (localhost:8080?code=[THIS CODE]: ");
    rl.close();

    await authClient.requestAccessToken(code);
    console.log(authClient.token);

    return new Client(authClient);
  } else if (process.env.ACCESS_TOKEN) {
    console.log("🔒 Using direct Access Token from environment...");
    return new Client(process.env.ACCESS_TOKEN);
  } else {
    throw new Error(
      "Missing environment variables: provide CLIENT_ID & CLIENT_SECRET or ACCESS_TOKEN.",
    );
  }
}

export { getAuthClient };
