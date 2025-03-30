import type {
  Nip47GetBalanceResponse,
  Nip47GetInfoResponse,
  Nip47ListTransactionsRequest,
  Nip47ListTransactionsResponse,
  Nip47LookupInvoiceRequest,
  Nip47MakeInvoiceRequest,
  Nip47PayInvoiceRequest,
  Nip47PayKeysendRequest,
  Nip47PayResponse,
  Nip47SignMessageRequest,
  Nip47SignMessageResponse,
  Nip47Transaction,
} from "./types";
export type NWCWalletServiceRequestHandlerError =
  | {
      code: string;
      message: string;
    }
  | undefined;

export type NWCWalletServiceResponse<T> = {
  result: T | undefined;
  error: NWCWalletServiceRequestHandlerError;
};
export type NWCWalletServiceResponsePromise<T> = Promise<{
  result: T | undefined;
  error: NWCWalletServiceRequestHandlerError;
}>;

export interface NWCWalletServiceRequestHandler {
  getInfo?(): NWCWalletServiceResponsePromise<Nip47GetInfoResponse>;
  makeInvoice?(
    request: Nip47MakeInvoiceRequest,
  ): NWCWalletServiceResponsePromise<Nip47Transaction>;
  payInvoice?(
    request: Nip47PayInvoiceRequest,
  ): NWCWalletServiceResponsePromise<Nip47PayResponse>;
  payKeysend?(
    request: Nip47PayKeysendRequest,
  ): NWCWalletServiceResponsePromise<Nip47Transaction>;
  getBalance?(): NWCWalletServiceResponsePromise<Nip47GetBalanceResponse>;
  lookupInvoice?(
    request: Nip47LookupInvoiceRequest,
  ): NWCWalletServiceResponsePromise<Nip47Transaction>;
  listTransactions?(
    request: Nip47ListTransactionsRequest,
  ): NWCWalletServiceResponsePromise<Nip47ListTransactionsResponse>;
  signMessage?(
    request: Nip47SignMessageRequest,
  ): NWCWalletServiceResponsePromise<Nip47SignMessageResponse>;
}
