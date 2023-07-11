import { AlbyResponseError } from "./AlbyResponseError";
import "websocket-polyfill";

describe("AlbyResponseError", () => {
  test("Error message is generated", () => {
    expect(new AlbyResponseError(500, "Internal Server Error", new Headers(), new Error("Something went wrong")).message).toEqual("500 Internal Server Error: Something went wrong")
  });
});