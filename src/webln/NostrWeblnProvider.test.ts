import { NostrWebLNProvider } from "./NostrWeblnProvider";
import "websocket-polyfill";

describe("isValidAmount", () => {
  test("getAuthorizationUrl generates correct url with budget and pubkey from custom secret", () => {
    expect(
      new NostrWebLNProvider({
        secret:
          "906d83543db6022b851f395ebbef055c980e5e1432bd54c30318a842fbaf84c3",
      })
        .getAuthorizationUrl({
          budgetRenewal: "weekly",
          editable: false,
          expiresAt: new Date("2023-07-21"),
          maxAmount: 100,
          name: "TestApp",
          returnTo: "https://example.com",
          requestMethods: ["pay_invoice", "get_balance"],
        })
        .toString(),
    ).toEqual(
      "https://nwc.getalby.com/apps/new?name=TestApp&pubkey=c5dc47856f533dad6c016b979ee3b21f83f88ae0f0058001b67a4b348339fe94&return_to=https%3A%2F%2Fexample.com&budget_renewal=weekly&expires_at=1689897600&max_amount=100&editable=false&request_methods=pay_invoice+get_balance",
    );
  });
});
