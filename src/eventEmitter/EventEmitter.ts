import { EventName, EventListener, Token } from "../types";

export class EventEmitter {
  // eslint-disable-next-line @typescript-eslint/ban-types
  private events: { [key: string]: Function[] } = {};

  on(event: EventName, listener: EventListener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event: EventName, listener: EventListener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((l) => l !== listener);
  }

  emit(event: EventName, payload: Token | Error) {
    if (!this.events[event]) return;
    this.events[event].forEach((listener) => listener(payload));
  }
}
