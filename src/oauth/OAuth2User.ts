import { EventEmitter } from "./eventEmitter/EventEmitter";
import { RequestOptions, rest } from "./request";
import {
  AuthHeader,
  EventName,
  EventListener,
  GenerateAuthUrlOptions,
  GetTokenResponse,
  OAuthClient,
  Token,
} from "./types";
import { basicAuthHeader, buildQueryString } from "./utils";
import { toHexString } from "../utils";

const AUTHORIZE_URL = "https://getalby.com/oauth";

export type OAuth2Scopes =
  | "account:read"
  | "invoices:create"
  | "invoices:read"
  | "transactions:read"
  | "balance:read"
  | "payments:send";

export interface OAuth2UserOptions {
  client_id: string;
  client_secret?: string;
  callback: string;
  scopes: OAuth2Scopes[];
  request_options?: Partial<RequestOptions>;
  user_agent: string;
  token?: Token;
}

function processTokenResponse(token: GetTokenResponse): Token {
  const { expires_in, ...rest } = token;
  return {
    ...rest,
    ...(!!expires_in && {
      expires_at: Date.now() + expires_in * 1000,
    }),
  };
}

export class OAuth2User implements OAuthClient {
  token?: Token;
  options: OAuth2UserOptions;
  code_verifier?: string;
  code_challenge?: string;
  private _refreshAccessTokenPromise: Promise<{ token: Token }> | null;
  private _tokenEvents: EventEmitter;

  constructor(options: OAuth2UserOptions) {
    this._tokenEvents = new EventEmitter();
    const { token, ...defaultOptions } = options;
    this.options = { client_secret: "", ...defaultOptions };
    this.token = token;
    this._refreshAccessTokenPromise = null;
  }

  /**
   * Subscribe to the events
   */
  on(eventName: EventName, listener: EventListener): void {
    this._tokenEvents.on(eventName, listener);
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken(): Promise<{ token: Token }> {
    if (this._refreshAccessTokenPromise) {
      return this._refreshAccessTokenPromise;
    }
    // eslint-disable-next-line no-async-promise-executor
    this._refreshAccessTokenPromise = new Promise(async (resolve, reject) => {
      try {
        const refresh_token = this.token?.refresh_token;
        const { client_id, client_secret, request_options, user_agent } =
          this.options;
        if (!client_id) {
          throw new Error("client_id is required");
        }
        if (!refresh_token) {
          throw new Error("refresh_token is required");
        }
        const data = await rest<GetTokenResponse>({
          ...request_options,
          endpoint: `/oauth/token`,
          params: {
            client_id,
            grant_type: "refresh_token",
            refresh_token,
          },
          user_agent,
          method: "POST",
          headers: {
            ...request_options?.headers,
            "Content-type": "application/x-www-form-urlencoded",
            ...{
              Authorization: basicAuthHeader(client_id, client_secret),
            },
          },
        });
        const token = processTokenResponse(data);
        this.token = token;
        resolve({ token });
        this._tokenEvents.emit("tokenRefreshed", this.token);
      } catch (error) {
        console.error(error);
        reject(error);
        this._tokenEvents.emit("tokenRefreshFailed", error as Error);
      } finally {
        this._refreshAccessTokenPromise = null;
      }
    });
    return this._refreshAccessTokenPromise;
  }

  /**
   * Check if an access token is expired
   */
  isAccessTokenExpired(): boolean {
    const refresh_token = this.token?.refresh_token;
    const expires_at = this.token?.expires_at;
    if (!expires_at) return true;
    return !!refresh_token && expires_at <= Date.now() + 1000;
  }

  /**
   * Request an access token
   */
  async requestAccessToken(code?: string): Promise<{ token: Token }> {
    const { client_id, client_secret, callback, request_options, user_agent } =
      this.options;
    const code_verifier = this.code_verifier;
    if (!client_id) {
      throw new Error("client_id is required");
    }
    if (!client_secret && !code_verifier) {
      throw new Error(
        "either client_secret is required, or code should be generated using a challenge",
      );
    }
    if (!callback) {
      throw new Error("callback is required");
    }
    const params = {
      code,
      grant_type: "authorization_code",
      code_verifier,
      client_id,
      redirect_uri: callback,
    };
    const data = await rest<GetTokenResponse>({
      ...request_options,
      endpoint: `/oauth/token`,
      params,
      user_agent,
      method: "POST",
      headers: {
        ...request_options?.headers,
        "Content-Type": "application/x-www-form-urlencoded",
        ...{
          Authorization: basicAuthHeader(client_id, client_secret),
        },
      },
    });
    const token = processTokenResponse(data);
    this.token = token;
    return { token };
  }

  async generateAuthURL(options?: GenerateAuthUrlOptions): Promise<string> {
    if (!options) {
      options = {};
    }
    const { client_id, callback, scopes } = this.options;
    if (!callback) throw new Error("callback required");
    if (!scopes) throw new Error("scopes required");
    let code_challenge_method;
    if (options.code_challenge_method === "S256") {
      await this._generateS256Challenge();
      code_challenge_method = "S256";
    } else if (
      options.code_challenge_method === "plain" &&
      options.code_challenge
    ) {
      this.code_challenge = options.code_challenge;
      this.code_verifier = options.code_challenge;
      code_challenge_method = "plain";
    }
    const code_challenge = this.code_challenge;
    const url = new URL(options.authorizeUrl || AUTHORIZE_URL);
    url.search = buildQueryString({
      ...options,
      client_id,
      scope: scopes.join(" "),
      response_type: "code",
      redirect_uri: callback,
      code_challenge_method,
      code_challenge,
    });
    return url.toString();
  }

  async getAuthHeader(): Promise<AuthHeader> {
    if (!this.token?.access_token) throw new Error("access_token is required");
    if (this.isAccessTokenExpired()) {
      await this.refreshAccessToken();
    }
    return {
      Authorization: `Bearer ${this.token.access_token}`,
    };
  }

  private async _generateS256Challenge() {
    const codeVerifierBytes = crypto.getRandomValues(new Uint8Array(64));
    this.code_verifier = toHexString(codeVerifierBytes);

    // from https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(this.code_verifier),
    );
    const hashArray = new Uint8Array(hashBuffer);

    // from https://stackoverflow.com/a/45313868
    // TODO: consider using Buffer.from(hashBuffer).toString("base64") in NodeJS
    this.code_challenge = btoa(String.fromCharCode(...hashArray))
      // from https://gist.github.com/jhurliman/1250118?permalink_comment_id=3194799
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}
