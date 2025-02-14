import { EventListener, EventName } from "../types";

export class EventEmitter {
  private events: { [key: string]: EventListener[] } = {};

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

  emit(event: EventName, payload: any) {
    if (!this.events[event]) return;
    this.events[event].forEach((listener) => listener(payload));
  }
}
