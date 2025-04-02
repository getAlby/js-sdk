import { fiat } from "@getalby/lightning-tools";
import { Amount } from "./Amount";

// TODO: move this to Lightning Tools
export class FiatAmount implements Amount {
  satoshi: Promise<{ satoshi: number }>;
  constructor(amount: number, currency: string) {
    this.satoshi = this._fetchSatoshi(amount, currency);
  }
  private async _fetchSatoshi(
    amount: number,
    currency: string,
  ): Promise<{ satoshi: number }> {
    const satoshi = await fiat.getSatoshiValue({
      amount,
      currency,
    });
    return { satoshi };
  }
}

// Most popular fiat currencies
export const USD = (amount: number) => new FiatAmount(amount, "USD");
export const EUR = (amount: number) => new FiatAmount(amount, "EUR");
export const JPY = (amount: number) => new FiatAmount(amount, "JPY");
export const GBP = (amount: number) => new FiatAmount(amount, "GBP");
export const CHF = (amount: number) => new FiatAmount(amount, "CHF");
