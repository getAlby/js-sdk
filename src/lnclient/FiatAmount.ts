import { getSatoshiValue } from "@getalby/lightning-tools";

// TODO: move to Lightning Tools
export class FiatAmount {
  satoshi: Promise<number>;
  constructor(amount: number, currency: string) {
    this.satoshi = getSatoshiValue({
      amount,
      currency,
    });
  }
}

// Most popular fiat currencies
export const USD = (amount: number) => new FiatAmount(amount, "USD");
export const EUR = (amount: number) => new FiatAmount(amount, "EUR");
export const JPY = (amount: number) => new FiatAmount(amount, "JPY");
export const GBP = (amount: number) => new FiatAmount(amount, "GBP");
export const CHF = (amount: number) => new FiatAmount(amount, "CHF");
