import { AlbyResponseError } from "./AlbyResponseError";

export type SuccessStatus = 200 | 201;
export type ResponseType = "application/json";

export interface AuthHeader {
  Authorization: string;
}

export interface GetTokenResponse {
  /** Allows an application to obtain a new access token without prompting the user via the refresh token flow. */
  refresh_token?: string;
  /** Access tokens are the token that applications use to make API requests on behalf of a user.  */
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  /** Comma-separated list of scopes for the token  */
  scope?: string;
}

export interface Token extends Omit<GetTokenResponse, "expires_in"> {
  /** Date that the access_token will expire at.  */
  expires_at?: number;
}

export type GenerateAuthUrlOptions = { authorizeUrl?: string } & (
  | {
      code_challenge_method?: string;
      code_challenge?: string;
    }
  | {
      /** A random string you provide to verify against CSRF attacks.  The length of this string can be up to 500 characters. */
      state?: string;
      /** Specifies the method you are using to make a request (S256 OR plain). */
      code_challenge_method: "S256";
    }
  | {
      /** A random string you provide to verify against CSRF attacks.  The length of this string can be up to 500 characters. */
      state: string;
      /** A PKCE parameter, a random secret for each request you make. */
      code_challenge: string;
      /** Specifies the method you are using to make a request (S256 OR plain). */
      code_challenge_method?: "plain";
    }
);

export abstract class OAuthClient implements AuthClient {
  abstract token?: Token;
  abstract generateAuthURL(options: GenerateAuthUrlOptions): string;
  abstract requestAccessToken(code?: string): Promise<{ token: Token }>;
  abstract getAuthHeader(
    url?: string,
    method?: string
  ): Promise<AuthHeader> | AuthHeader;
}

export abstract class AuthClient {
  abstract getAuthHeader(
    url?: string,
    method?: string
  ): Promise<AuthHeader> | AuthHeader;
}

// https://stackoverflow.com/a/50375286
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type GetSuccess<T> = {
  [K in SuccessStatus & keyof T]: GetContent<T[K]>;
}[SuccessStatus & keyof T];

export type AlbyResponse<T> = UnionToIntersection<ExtractAlbyResponse<T>>;

export type GetContent<T> = "content" extends keyof T
  ? ResponseType extends keyof T["content"]
    ? T["content"][ResponseType]
    : never
  : never;

export type ExtractAlbyResponse<T> = "responses" extends keyof T
  ? GetSuccess<T["responses"]>
  : never;

export type InvoiceRequestParams = {
  description?: string;
  description_hash?: string;
  amount: number;
};

export type KeysendRequestParams = {
  amount: number;
  destination: string;
  memo?: string;
  customRecords?: Record<string, string>;
};

export type SendPaymentRequestParams = {
  invoice: string;
  amount?: number;
};

export type SendBoostagramRequestParams = {
  recipient: {
    address: string;
    customKey?: string;
    customValue?: string;
  };
  boostagram: unknown;
  amount: number;
};

export type SendToAlbyRequestParams = {
  account: string;
  amount: number;
  memo?: string;
};

export type CreateWebhookEndpointParams = {
  url: string;
  description?: string;
  filter_types: string[];
};

export type BaseWebhookEndpointResponse = {
  url: string;
  description?: string;
  filter_types: string[];
  created_at: string;
  id: string;
};

export type SwapInfoResponse = {
  service_fee_percentage: number;
  network_fee: number;
  sats_per_vbyte: number;
};

export type CreateSwapParams = {
  amount: number;
  address: string;
  sats_per_vbyte: number;
};

export type CreateSwapResponse = {
  address: string;
  service_fee: number;
  network_fee: number;
  amount: number;
  total: number;
  payment_request: string;
};

export type CreateWebhookEndpointResponse = BaseWebhookEndpointResponse & {
  endpoint_secret: string;
};

export type Invoice = {
  amount: number;
  boostagram?: {
    podcast: string;
    feedID?: number;
    itemID: number;
    episode: string;
    ts: number;
    action: string;
    app_name: string;
    app_version: string;
    value_msat: number;
    value_msat_total: number;
    name: string;
    message: string;
    sender_name: string;
    episode_guid?: string;
    boost_link?: string;
    url?: string;
    guid?: string;
  } & Record<string, unknown>;
  comment?: string;
  created_at: string;
  creation_date: number;
  currency: string;
  custom_records: Record<string, string>;
  description_hash: null;
  expires_at: string;
  expiry: number;
  fiat_currency: string;
  fiat_in_cents: number;
  identifier: string;
  keysend_message?: string;
  memo: string;
  payer_name: string;
  payer_pubkey?: string;
  payment_hash: string;
  payment_request: string;
  r_hash_str: string;
  settled: boolean;
  settled_at: string;
  state: string;
  type: string;
  value: number;
  metadata?: {
    // TODO: add typings
    payer_data?: unknown;
    zap_request?: unknown;
  };
} & Record<string, unknown>;

export type GetNWCAuthorizationUrlOptions = {
  name?: string;
  returnTo?: string;
  expiresAt?: Date;
  maxAmount?: number;
  budgetRenewal?: "never" | "daily" | "weekly" | "monthly" | "yearly";
  editable?: boolean;
};

export type SendPaymentResponse = {
  amount: number;
  description: string;
  destination: string;
  fee: number;
  payment_hash: string;
  payment_preimage: string;
  payment_request: string;
};

export type GetAccountBalanceResponse = {
  balance: number;
  currency: string;
  unit: string;
};

export type GetAccountInformationResponse = {
  identifier: string;
  email: string;
  name?: string;
  avatar?: string;
  keysend_custom_key: string;
  keysend_custom_value: string;
  keysend_pubkey: string;
  lightning_address?: string;
  nostr_pubkey?: string;
};

export { AlbyResponseError };
