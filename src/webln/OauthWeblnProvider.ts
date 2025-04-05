import { Client } from "../client";
import { OAuthClient, KeysendRequestParams } from "../types";

interface RequestInvoiceArgs {
  amount: string | number;
  defaultMemo?: string;
}

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.document !== "undefined";

export class OauthWeblnProvider {
  client: Client;
  auth: OAuthClient;
  oauth: boolean;
  subscribers: Record<string, (payload: unknown) => void>;
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

  notify(name: string, payload?: unknown) {
    const callback = this.subscribers[name];
    if (callback) {
      callback(payload);
    }
  }

  private async execute<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (this.isExecuting) return;
    this.isExecuting = true;
    try {
      return await fn();
    } catch (error) {
      let message = "Unknown Error";
      if (error instanceof Error) {
        message = error.message;
      }
      throw new Error(message);
    } finally {
      this.isExecuting = false;
    }
  }

  async enable() {
    if (this.auth.token?.access_token) {
      return { enabled: true };
    }
    if (!isBrowser()) {
      throw new Error("Missing access token");
    }
    await this.execute(() => this.openAuthorization());
  }

  async sendPayment(invoice: string) {
    return this.execute(async () => {
      const result = await this.client.sendPayment({ invoice });
      this.notify("sendPayment", result);
      return { preimage: result.payment_preimage };
    });
  }

  async keysend(params: KeysendRequestParams) {
    return this.execute(async () => {
      const result = await this.client.keysend(params);
      this.notify("keysend", result);
      return { preimage: result.payment_preimage };
    });
  }

  async getInfo() {
    return {
      alias: "Alby",
    };
  }

  async makeInvoice(params: RequestInvoiceArgs) {
    return this.execute(async () => {
      const result = await this.client.createInvoice({
        amount: parseInt(params.amount.toString()),
        description: params.defaultMemo,
      });
      this.notify("makeInvoice", result);
      return { paymentRequest: result.payment_request };
    });
  }

  async openAuthorization() {
    const height = 700;
    const width = 600;
    const top = window.outerHeight / 2 + window.screenY - height / 2;
    const left = window.outerWidth / 2 + window.screenX - width / 2;
    const url = await this.auth.generateAuthURL({
      code_challenge_method: "S256",
    });

    return new Promise((resolve, reject) => {
      const popup = window.open(
        url,
        `${document.title} - WebLN enable`,
        `height=${height},width=${width},top=${top},left=${left}`,
      );

      if (!popup) {
        reject(new Error("Popup blocked"));
        return;
      }

      let processingCode = false;
      const timeoutId = setTimeout(
        () => {
          if (popup && !popup.closed) popup.close();
          reject(new Error("OAuth authorization timed out"));
        },
        2 * 60 * 1000,
      ); // 2 minutes

      const messageHandler = async (message: MessageEvent) => {
        const data = message.data;
        if (
          data &&
          data.type === "alby:oauth:success" &&
          message.origin ===
            `${document.location.protocol}//${document.location.host}` &&
          !processingCode
        ) {
          processingCode = true;
          clearTimeout(timeoutId);
          window.removeEventListener("message", messageHandler);

          try {
            const code = data.payload.code;
            await this.auth.requestAccessToken(code);
            this.client = new Client(this.auth);
            if (popup && !popup.closed) popup.close();
            this.notify("enable");
            resolve({ enabled: true });
          } catch (e) {
            console.error(e);
            if (popup && !popup.closed) popup.close();
            reject(new Error("Failed to complete OAuth"));
          }
        }
      };

      window.addEventListener("message", messageHandler);
    });
  }
}
