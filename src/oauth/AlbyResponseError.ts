export class AlbyResponseError extends Error {
  status: number;
  statusText: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any; // todo: typeable?
  constructor(
    status: number,
    statusText: string,
    headers: Headers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any,
  ) {
    let message = status.toString();
    if (statusText) {
      message += ` ${statusText}`;
    }
    message += ": ";
    if (error.message) {
      message += error.message;
    } else {
      message += JSON.stringify(error);
    }

    super(message);
    this.status = status;
    this.statusText = statusText;
    this.headers = headers;
    this.error = error;
  }
}
