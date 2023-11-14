import { decode } from "light-bolt11-decoder";
export function decodeInvoice(invoice: string) {
  if (!invoice) {
    throw new Error("No invoice provided");
  }

  try {
    return decode(invoice);
  } catch (error) {
    console.error("Failed to decode invoice", error);
    throw error;
  }
}
