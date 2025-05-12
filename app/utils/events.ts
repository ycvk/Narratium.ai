type EventCallback = () => void;

class EventBus {
  private events: Record<string, EventCallback[]> = {};

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  publish(event: string): void {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback());
    }
  }
}

const eventBus = new EventBus();

export const SESSION_UPDATED = "session_updated";

export default eventBus;
