export class AlbyResponseError extends Error {
  status: number;
  statusText: string;
  headers: Record<string, any>;
  error: any; // todo: typeable?
  constructor(
    status: number,
    statusText: string,
    headers: Headers,
    error: any
  ) {
    let message = status.toString();
    if (statusText) {
      message += ` ${statusText}`;
    }
    message += ": ";
    if (error.message) {
      message += error.message;
    }
    else {
      message += JSON.stringify(error);
    }

    super(message);
    this.status = status;
    this.statusText = statusText;
    this.headers = headers;
    this.error = error;
  }
}