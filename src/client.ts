import { OAuth2Bearer } from "./auth";
import { keysendParamsFromBoostagram } from "./helpers";
import { RequestOptions, rest } from "./request";
import {
  AuthClient,
  BaseWebhookEndpointResponse,
  CreateSwapParams,
  CreateSwapResponse,
  CreateWebhookEndpointParams,
  CreateWebhookEndpointResponse,
  GetAccountBalanceResponse,
  GetAccountInformationResponse,
  Invoice,
  InvoiceRequestParams,
  KeysendRequestParams,
  SendBoostagramRequestParams,
  SendPaymentRequestParams,
  SendPaymentResponse,
  SendToAlbyRequestParams,
  SwapInfoResponse,
} from "./types";

export class Client {
  auth: AuthClient;
  defaultRequestOptions?: Partial<RequestOptions>;

  constructor(
    auth: string | AuthClient,
    requestOptions?: Partial<RequestOptions>,
  ) {
    this.auth = typeof auth === "string" ? new OAuth2Bearer(auth) : auth;
    this.defaultRequestOptions = {
      ...requestOptions,
      user_agent: requestOptions?.user_agent,
    };
  }

  accountBalance(
    params: {},
    request_options?: Partial<RequestOptions>,
  ): Promise<GetAccountBalanceResponse> {
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

  accountInformation(
    params: {},
    request_options?: Partial<RequestOptions>,
  ): Promise<GetAccountInformationResponse> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/user/me`,
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

  incomingInvoices(
    params: {},
    request_options?: Partial<RequestOptions>,
  ): Promise<Invoice[]> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/invoices/incoming`,
      params,
      method: "GET",
    });
  }

  outgoingInvoices(
    params: {},
    request_options?: Partial<RequestOptions>,
  ): Promise<Invoice[]> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/invoices/outgoing`,
      params,
      method: "GET",
    });
  }

  invoices(
    params: {},
    request_options?: Partial<RequestOptions>,
  ): Promise<Invoice[]> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/invoices`,
      params,
      method: "GET",
    });
  }

  getInvoice(
    paymentHash: string,
    request_options?: Partial<RequestOptions>,
  ): Promise<Invoice> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/invoices/${paymentHash}`,
      method: "GET",
    });
  }

  createInvoice(
    invoice: InvoiceRequestParams,
    request_options?: Partial<RequestOptions>,
  ): Promise<Invoice> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/invoices`,
      request_body: invoice,
      method: "POST",
    });
  }

  keysend(
    args: KeysendRequestParams | KeysendRequestParams[],
    request_options?: Partial<RequestOptions>,
  ): Promise<SendPaymentResponse> {
    let endpoint, request_body;
    if (Array.isArray(args)) {
      endpoint = "/payments/keysend/multi";
      request_body = { keysends: args };
    } else {
      endpoint = "/payments/keysend";
      request_body = args;
    }
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint,
      request_body,
      method: "POST",
    });
  }

  sendPayment(
    params: SendPaymentRequestParams,
    request_options?: Partial<RequestOptions>,
  ): Promise<SendPaymentResponse> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/payments/bolt11`,
      request_body: params,
      method: "POST",
    });
  }

  sendBoostagram(
    args: SendBoostagramRequestParams | SendBoostagramRequestParams[],
    request_options?: Partial<RequestOptions>,
  ) {
    let endpoint, request_body;
    if (Array.isArray(args)) {
      endpoint = "/payments/keysend/multi";
      const keysends = args.map((b) => keysendParamsFromBoostagram(b));
      request_body = { keysends };
    } else {
      endpoint = "/payments/keysend";
      request_body = keysendParamsFromBoostagram(args);
    }

    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint,
      request_body,
      method: "POST",
    });
  }

  sendToAlbyAccount(
    args: SendToAlbyRequestParams,
    request_options?: Partial<RequestOptions>,
  ) {
    const params = {
      destination:
        "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3",
      customRecords: {
        "696969": args.account,
      },
      amount: args.amount,
      memo: args.memo,
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

  createWebhookEndpoint(
    params: CreateWebhookEndpointParams,
    request_options?: Partial<RequestOptions>,
  ): Promise<CreateWebhookEndpointResponse> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/webhook_endpoints`,
      request_body: params,
      method: "POST",
    });
  }

  deleteWebhookEndpoint(
    id: string,
    request_options?: Partial<RequestOptions>,
  ): Promise<BaseWebhookEndpointResponse> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/webhook_endpoints/${id}`,
      method: "DELETE",
    });
  }

  getSwapInfo(
    request_options?: Partial<RequestOptions>,
  ): Promise<SwapInfoResponse> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/swaps/info`,
      method: "GET",
    });
  }

  createSwap(
    params: CreateSwapParams,
    request_options?: Partial<RequestOptions>,
  ): Promise<CreateSwapResponse> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...request_options,
      endpoint: `/swaps`,
      method: "POST",
      request_body: params,
    });
  }
}
