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
  oauth: boolean;
  subscribers: Record<string, (payload: any) => void>;
  isExecuting: boolean;

  constructor(options: { auth: OAuthClient }) {
    this.auth = options.auth;
    this.client = new Client(options.auth);
    this.oauth = true;
    this.subscribers = {};
    this.isExecuting = false;
  }

  on(name: string, callback: () => void) {
    this.subscribers[name] = callback;
  }

  notify(name: string, payload?: any) {
    const callback = this.subscribers[name];
    if (callback) {
      callback(payload);
    }
  }

  async enable() {
    if (this.isExecuting) { return; }
    if (this.auth.token?.access_token) {
      return { enabled: true };
    }
    if (isBrowser()) {
      try {
        this.isExecuting = true;
        const result = await this.openAuthorization();
      } finally {
        this.isExecuting = false;
      }
    } else {
      throw new Error("Missing access token");
    }
  }

  async sendPayment(invoice: string) {
    if (this.isExecuting) { return; }
    try {
      this.isExecuting = true;
      const result = await this.client.sendPayment({ invoice });
      if (result.error) {
        throw new Error(result.message);
      }
      this.notify('sendPayment', result);
      return {
        preimage: result.payment_preimage
      }
    } catch(error) {
      let message = 'Unknown Error'
      if (error instanceof Error) message = error.message
      throw new Error(message);
    } finally {
      this.isExecuting = false;
    }
  }

  async keysend(params: KeysendRequestParams) {
    if (this.isExecuting) { return; }
    try {
      this.isExecuting = true;
      const result = await this.client.keysend(params);
      if (result.error) {
        throw new Error(result.message);
      }
      this.notify('keysend', result);
      return {
        preimage: result.payment_preimage
      }
    } catch(error) {
      let message = 'Unknown Error'
      if (error instanceof Error) message = error.message
      throw new Error(message);
    } finally {
      this.isExecuting = false;
    }
  }

  async getInfo() {
    return {
      alias: "Alby"
    };
  }

  async makeInvoice(params: RequestInvoiceArgs) {
    if (this.isExecuting) { return; }
    try {
      this.isExecuting = true;
      const result = await this.client.createInvoice({
        amount: parseInt(params.amount.toString()),
        description: params.defaultMemo
      });
      this.notify('makeInvoice', result);
      return {
        paymentRequest: result.payment_request
      }
    } catch(error) {
      let message = 'Unknown Error'
      if (error instanceof Error) message = error.message
      throw new Error(message);
    } finally {
      this.isExecuting = false;
    }
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
      let processingCode = false;
      window.addEventListener('message', async (message) => {
        console.log(message);
        const data = message.data;
        if (data && data.type === 'alby:oauth:success' && message.origin === `${document.location.protocol}//${document.location.host}` && !processingCode) {
          processingCode = true; // make sure we request the access token only once
          console.info("Processing OAuth code response");
          const code = data.payload.code;
          try {
            await this.auth.requestAccessToken(code);
            this.client = new Client(this.auth); // just to make sure we got a client with the correct auth and not the access token
            if (popup) {
              popup.close();
            }
            this.notify('enable');
            resolve({ enabled: true });
          } catch(e) {
            console.error(e);
            reject({ enabled: false });
          }
        }
      });
    });
  }
}
