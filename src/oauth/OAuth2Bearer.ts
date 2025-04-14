import { AuthClient, AuthHeader } from "./types";

export class OAuth2Bearer implements AuthClient {
  private bearer_token: string;

  constructor(bearer_token: string) {
    this.bearer_token = bearer_token;
  }

  getAuthHeader(): AuthHeader {
    return {
      Authorization: `Bearer ${this.bearer_token}`,
    };
  }
}
