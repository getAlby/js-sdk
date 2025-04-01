import { SignMessageResponse } from "@webbtc/webln-types";
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
  DecodedInvoice,
  GetAccountBalanceResponse,
  GetAccountInformationResponse,
  GetInvoicesRequestParams,
  Invoice,
  InvoiceRequestParams,
  KeysendRequestParams,
  SendBoostagramRequestParams,
  SendPaymentRequestParams,
  SendPaymentResponse,
  SendBoostagramToAlbyRequestParams,
  SwapInfoResponse,
  SignMessageRequestParams,
} from "./types";

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
      user_agent: requestOptions?.user_agent 
    };
  }

  // HTTP handlers
  private httpGet<T>(
    endpoint: string, 
    params?: any, 
    options?: Partial<RequestOptions>
  ): Promise<T> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...options,
      endpoint,
      params,
      method: "GET"
    });
  }

  private httpPost<T>(
    endpoint: string, 
    body?: any, 
    options?: Partial<RequestOptions>
  ): Promise<T> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...options,
      endpoint,
      request_body: body,
      method: "POST"
    });
  }

  private httpDelete<T>(
    endpoint: string, 
    options?: Partial<RequestOptions>
  ): Promise<T> {
    return rest({
      auth: this.auth,
      ...this.defaultRequestOptions,
      ...options,
      endpoint,
      method: "DELETE"
    });
  }

  accountBalance(): Promise<GetAccountBalanceResponse> {
    return this.httpGet<GetAccountBalanceResponse>("/balance");
  }

  signMessage(message: SignMessageRequestParams): Promise<SignMessageResponse> {
    return this.httpPost<SignMessageResponse>("/signatures", message);
  }

  accountSummary() {
    return this.httpGet("/user/summary");
  }

  accountInformation(): Promise<GetAccountInformationResponse> {
    return this.httpGet<GetAccountInformationResponse>("/user/me");
  }

  accountValue4Value() {
    return this.httpGet("/user/value4value");
  }

  incomingInvoices(params: GetInvoicesRequestParams) {
    return this.httpGet<Invoice[]>("/invoices/incoming", params);
  }

  outgoingInvoices(params: GetInvoicesRequestParams) {
    return this.httpGet<Invoice[]>("/invoices/outgoing", params);
  }

  invoices(params: GetInvoicesRequestParams) {
    return this.httpGet<Invoice[]>("/invoices", params);
  }

  getInvoice(paymentHash: string) {
    return this.httpGet<Invoice>('/invoices/${paymentHash}');
  }

  decodeInvoice(paymentRequest: string) {
    return this.httpGet<DecodedInvoice>('/decode/bolt11/${paymentRequest}');
  }

  createInvoice(invoice: InvoiceRequestParams) {
    return this.httpPost<Invoice>("/invoices", invoice);
  }

  keysend(
    args: KeysendRequestParams | KeysendRequestParams[]
  ) {
    const isMulti = Array.isArray(args);
    const endpoint = isMulti ? "/payments/keysend/multi" : "/payments/keysend";
    const body = isMulti 
      ? { keysends: args.map(a => ({ ...a, custom_records: a.customRecords })) }
      : { ...args, custom_records: args.customRecords };

    return this.httpPost<SendPaymentResponse>(endpoint, body);
  }

  sendPayment(params: SendPaymentRequestParams) {
    return this.httpPost<SendPaymentResponse>("/payments/bolt11", params);
  }

  sendBoostagram(
    args: SendBoostagramRequestParams | SendBoostagramRequestParams[]
  ) {
    const isMulti = Array.isArray(args);
    const endpoint = isMulti ? "/payments/keysend/multi" : "/payments/keysend";
    const body = isMulti 
      ? { keysends: args.map(keysendParamsFromBoostagram) }
      : keysendParamsFromBoostagram(args);

    return this.httpPost(endpoint, body);
  }

  sendBoostagramToAlbyAccount(
    args: SendBoostagramToAlbyRequestParams
  ) {
    return this.httpPost("/payments/keysend", {
      destination: "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3",
      custom_records: { "696969": args.account },
      amount: args.amount,
      memo: args.memo
    });
  }

  createWebhookEndpoint(params: CreateWebhookEndpointParams) {
    return this.httpPost<CreateWebhookEndpointResponse>("/webhook_endpoints", params);
  }

  deleteWebhookEndpoint(id: string) {
    return this.httpDelete<BaseWebhookEndpointResponse>('/webhook_endpoints/${id}');
  }

  getSwapInfo() {
    return this.httpGet<SwapInfoResponse>("/swaps/info");
  }

  createSwap(params: CreateSwapParams) {
    return this.httpPost<CreateSwapResponse>("/swaps", params);
  }
}
