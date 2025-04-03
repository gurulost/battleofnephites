/**
 * Development debugging utilities for the game
 */
import { EventBridge } from '../events/EventBridge';

/**
 * Debug tools for the game - only accessible in development mode
 */
export const DebugTools = {
  /**
   * Toggle event debugging to trace all event emissions and subscriptions
   */
  toggleEventDebug(enabled?: boolean): void {
    (EventBridge as any).toggleDebug(enabled);
  },

  /**
   * Add to window for easy console access in development
   */
  injectToWindow(): void {
    if (process.env.NODE_ENV === 'development') {
      (window as any).BattlesOfCovenant = {
        debug: {
          toggleEventDebug: this.toggleEventDebug,
          EventBridge
        }
      };
      console.log('Debug tools available at window.BattlesOfCovenant.debug');
    }
  }
};