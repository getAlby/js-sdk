
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


export type GenerateAuthUrlOptions =
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
    };

export abstract class OAuthClient implements AuthClient {
  abstract token?: Token;
  abstract generateAuthURL(options: GenerateAuthUrlOptions): string;
  abstract requestAccessToken(code?: string): Promise<{ token: Token }>
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
  description?: string,
  description_hash?: string,
  amount: number,
}

export type KeysendRequestParams = {
  amount: number,
  destination: string,
  memo?: string,
  customRecords?: Record<string, string>
}

export type SendPaymentRequestParams = {
  invoice: string,
  amount?: number,
}

export type SendBoostagramRequestParams = {
  recipient: {
    address: string,
    customKey?: string,
    customValue?: string,
  },
  boostagram: unknown,
  amount: number,
}

