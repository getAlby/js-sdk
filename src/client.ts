import { rest, RequestOptions } from "./request";
import {
  AuthClient,
  InvoiceRequestParams,
  KeysendRequestParams,
  SendPaymentRequestParams,
  SendBoostagramRequestParams
} from "./types";
import { OAuth2Bearer } from "./auth";


export class Client {
  auth: AuthClient;
  defaultRequestOptions?: Partial<RequestOptions>;

  constructor(
    auth: string | AuthClient,
    requestOptions?: Partial<RequestOptions>
    ) {
      this.auth = typeof auth === "string" ? new OAuth2Bearer(auth) : auth;
      this.defaultRequestOptions = {
        ...requestOptions,
        headers: {
          "User-Agent": "alby-js-api",
          ...requestOptions?.headers,
        },
      };
    }

  accountBalance(params: {}, request_options?: Partial<RequestOptions>) {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/balance`,
      params,
      method: "GET",
    });
  }

  accountSummary(params: {}, request_options?: Partial<RequestOptions>) {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/user/summary`,
      params,
      method: "GET",
    });
  }


  accountValue4Value(params: {}, request_options?: Partial<RequestOptions>) {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/user/value4value`,
      params,
      method: "GET",
    });
  }

  incomingInvoices(params: {}, request_options?: Partial<RequestOptions>) {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/invoices/incoming`,
      params,
      method: "GET",
    });
  }

  outgoingInvoices(params: {}, request_options?: Partial<RequestOptions>) {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/invoices/outgoing`,
      params,
      method: "GET",
    });
  }

  getInvoice(paymentHash: string, request_options?: Partial<RequestOptions>) {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/invoices/${paymentHash}`,
      method: "GET",
    });
  }

  createInvoice(invoice: InvoiceRequestParams, request_options?: Partial<RequestOptions>) {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/invoices`,
      request_body: invoice,
      method: "POST",
    });
  }

  keysend(keysend: KeysendRequestParams, request_options?: Partial<RequestOptions>) {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/payments/keysend`,
      request_body: keysend,
      method: "POST",
    });
  }

  sendPayment(params: SendPaymentRequestParams, request_options?: Partial<RequestOptions>) {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/payments/bolt11`,
      request_body: params,
      method: "POST",
    });
  }

  sendBoostagram(boostagramParams: SendBoostagramRequestParams, request_options?: Partial<RequestOptions>) {
    const customRecords: Record<string, string> = {};
    if (boostagramParams.recipient.customKey && boostagramParams.recipient.customValue) {
      customRecords[boostagramParams.recipient.customKey] =  boostagramParams.recipient.customValue;
    }
    // https://github.com/lightning/blips/blob/master/blip-0010.md
    customRecords['7629169'] = JSON.stringify(boostagramParams.boostagram);

    const params = {
      destination: boostagramParams.recipient.address,
      amount: boostagramParams.amount,
      customRecords: customRecords,
    };

    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/payments/keysend`,
      request_body: params,
      method: "POST",
    });
  }

}
