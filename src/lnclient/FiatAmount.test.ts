import { resolveAmount } from "./Amount";
import { USD } from "./FiatAmount";

describe("FiatAmount", () => {
  test("interoperable with Amount", async () => {
    const fiatAmount = USD(1);
    const resolved = await resolveAmount(fiatAmount);
    expect(resolved.satoshi).toBeGreaterThan(0);
  });
});
