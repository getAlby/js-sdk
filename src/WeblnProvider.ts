import { Client } from './client';
import {
  OAuthClient,
  KeysendRequestParams,
} from "./types";

interface RequestInvoiceArgs {
  amount: string | number;
  defaultMemo?: string;
}

const isBrowser = () => typeof window !== "undefined" && typeof window.document !== "undefined";

export class WebLNProvider {
  client: Client;
  auth: OAuthClient;

  constructor(auth: OAuthClient) {
    this.auth = auth;
    this.client = new Client(auth);
  }

  openAuthorization() {
    const height = 700;
    const width = 600;
    const top = window.outerHeight / 2 + window.screenY - height / 2;
    const left = window.outerWidth / 2 + window.screenX - width / 2;
    const url = this.auth.generateAuthURL({ code_challenge_method: "S256" });

    return new Promise((resolve, reject) => {
      const popup = window.open(
        url,
        `${document.title} - WebLN enable`,
        `height=${height},width=${width},top=${top},left=${left}`
      );
      window.addEventListener('message', async (message) => {
        const data = message.data;
        if (data && data.type === 'alby:oauth:success' && message.origin === `${document.location.protocol}//${document.location.host}`) {
          const code = data.payload.code;
          try {
            this.auth.requestAccessToken(code);
            this.client = new Client(this.auth);
            if (popup) {
              popup.close();
            }
            resolve({ enabled: true });
          } catch(e) {
            console.error(e);
            reject({ enabled: false });
          }
        }
      });
    });
  }


  async enable() {
    if (this.auth.token?.access_token) {
      return { enabled: true };
    }
    if (isBrowser()) {
      return this.openAuthorization();
    } else {
      throw new Error("Missing access token");
    }
  }

  async sendPayment(invoice: string) {
    try {
      const result = await this.client.sendPayment({ invoice });
      if (result.error) {
        throw new Error(result.message);
      }
      return {
        preimage: result.payment_preimage
      }
    } catch(error) {
      let message = 'Unknown Error'
      if (error instanceof Error) message = error.message
      throw new Error(message);
    }
  }

  async keysend(params: KeysendRequestParams) {
    try {
      const result = await this.client.keysend(params);
      if (result.error) {
        throw new Error(result.message);
      }
      return {
        preimage: result.payment_preimage
      }
    } catch(error) {
      let message = 'Unknown Error'
      if (error instanceof Error) message = error.message
      throw new Error(message);
    }
  }

  async getInfo() {
    return {
      alias: "Alby"
    };
  }

  async makeInvoice(params: RequestInvoiceArgs) {
    const result = await this.client.createInvoice({
      amount: parseInt(params.amount.toString()),
      description: params.defaultMemo
    });
    return {
      paymentRequest: result.payment_request
    }
  }
}
