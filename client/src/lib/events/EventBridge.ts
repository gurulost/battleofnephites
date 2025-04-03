import { EventPayload } from '../../types/game';

/**
 * EventBridge provides a communication channel between Phaser and React
 * components using a simple event system.
 */
class EventBridgeClass {
  private listeners: Map<string, Function[]>;
  private debugMode: boolean = false;
  
  constructor() {
    this.listeners = new Map();
    
    // Check for debug mode in local storage or URL params
    this.debugMode = localStorage.getItem('eventDebug') === 'true' || 
                    new URLSearchParams(window.location.search).has('eventDebug');
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
    
    if (this.debugMode) {
      console.log(`EventBridge: Listener added for "${eventName}"`);
    }
    
    // Return a function to remove this specific listener
    return () => {
      const callbacks = this.listeners.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
          if (this.debugMode) {
            console.log(`EventBridge: Listener removed for "${eventName}"`);
          }
        }
      }
    };
  }
  
  /**
   * Remove all listeners for a specific event
   * @param eventName The name of the event to remove listeners for
   */
  off(eventName: string): void {
    if (this.debugMode) {
      const count = this.listeners.get(eventName)?.length || 0;
      console.log(`EventBridge: Removed ${count} listeners for "${eventName}"`);
    }
    this.listeners.delete(eventName);
  }
  
  /**
   * Emit an event with optional data
   * @param eventName The name of the event to emit
   * @param data Optional data to pass to the listeners
   */
  emit(eventName: string, data?: any): void {
    if (this.debugMode) {
      console.log(`EventBridge: Emitting "${eventName}"`, data);
    }
    
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    } else if (this.debugMode) {
      console.warn(`EventBridge: No listeners for "${eventName}"`);
    }
  }
  
  /**
   * Toggle debug mode for event tracing
   */
  toggleDebug(enabled?: boolean): void {
    if (typeof enabled === 'boolean') {
      this.debugMode = enabled;
    } else {
      this.debugMode = !this.debugMode;
    }
    
    console.log(`EventBridge: Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
    localStorage.setItem('eventDebug', this.debugMode.toString());
  }
}

// Export a singleton instance
export const EventBridge = new EventBridgeClass();
