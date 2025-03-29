import {
  Nip47GetInfoResponse,
  Nip47MakeInvoiceRequest,
  Nip47Transaction,
} from "./NWCClient";

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
}
