export interface Logger {
  debug(...args: unknown[]): void;
}

export const noopLogger: Logger = {
  debug() {},
};
