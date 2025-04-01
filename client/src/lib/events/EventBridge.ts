import { EventPayload } from '../../types/game';

/**
 * EventBridge provides a communication channel between Phaser and React
 * components using a simple event system.
 */
class EventBridgeClass {
  private listeners: Map<string, Function[]>;
  
  constructor() {
    this.listeners = new Map();
  }
  
  /**
   * Subscribe to an event
   * @param eventName The name of the event to listen for
   * @param callback The function to call when the event is triggered
   * @returns A function to remove this specific listener
   */
  on(eventName: string, callback: Function): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    this.listeners.get(eventName)!.push(callback);
    
    // Return a function to remove this specific listener
    return () => {
      const callbacks = this.listeners.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * Remove all listeners for a specific event
   * @param eventName The name of the event to remove listeners for
   */
  off(eventName: string): void {
    this.listeners.delete(eventName);
  }
  
  /**
   * Emit an event with optional data
   * @param eventName The name of the event to emit
   * @param data Optional data to pass to the listeners
   */
  emit(eventName: string, data?: any): void {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }
}

// Export a singleton instance
export const EventBridge = new EventBridgeClass();
