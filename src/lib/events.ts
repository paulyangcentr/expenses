// Simple event system for data refresh notifications
type EventCallback = () => void

class EventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map()

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event: string) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback())
    }
  }
}

export const eventEmitter = new EventEmitter()

// Event types
export const EVENTS = {
  TRANSACTIONS_UPDATED: 'transactions_updated',
  CATEGORIES_UPDATED: 'categories_updated',
  ACCOUNTS_UPDATED: 'accounts_updated'
} as const
