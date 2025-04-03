import { create } from 'zustand';
import { SoundMode } from '../services/SoundService';

/**
 * Audio settings and state
 */
interface AudioState {
  // Settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  soundMode: SoundMode;
  
  // Actions
  toggleSound: () => void;
  toggleMusic: () => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setSoundMode: (mode: SoundMode) => void;
  playSound: (soundKey: string) => void;
  playMusic: (musicKey: string) => void;
  stopMusic: () => void;
}

/**
 * Audio state store
 * Controls sound and music settings and playback
 */
export const useAudio = create<AudioState>((set, get) => ({
  // Default settings
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 0.5,
  musicVolume: 0.3,
  soundMode: 'hybrid', // Default to hybrid mode
  
  // Toggle sound on/off
  toggleSound: () => {
    set((state) => ({
      soundEnabled: !state.soundEnabled
    }));
  },
  
  // Toggle music on/off
  toggleMusic: () => {
    set((state) => ({
      musicEnabled: !state.musicEnabled
    }));
    
    // If music was just disabled, stop any playing music
    if (!get().musicEnabled) {
      get().stopMusic();
    }
  },
  
  // Adjust sound volume
  setSoundVolume: (volume: number) => {
    set({
      soundVolume: Math.max(0, Math.min(1, volume))
    });
  },
  
  // Adjust music volume
  setMusicVolume: (volume: number) => {
    set({
      musicVolume: Math.max(0, Math.min(1, volume))
    });
    
    // Update the volume of any currently playing music
    // This would interact with any active audio elements
  },
  
  // Set sound mode (procedural, recorded, or hybrid)
  setSoundMode: (mode: SoundMode) => {
    set({ soundMode: mode });
    
    // Update the sound service
    import('../services/SoundService').then(({ SoundService }) => {
      const soundService = SoundService.getInstance();
      soundService.setSoundMode(mode);
    });
  },
  
  // Play a sound effect
  playSound: (soundKey: string) => {
    // If sound is disabled, don't play anything
    if (!get().soundEnabled) {
      return;
    }
    
    // Import and use EventBridge directly to avoid window dependency
    import('../events/EventBridge').then(({ EventBridge }) => {
      // Pass volume settings to ensure consistent playback
      EventBridge.emit('game:playSound', { 
        key: soundKey,
        volume: get().soundVolume,
        mode: get().soundMode
      });
    }).catch(error => {
      console.error('Failed to load EventBridge for audio playback:', error);
      
      // Fallback for direct calls
      import('../services/SoundService').then(({ SoundService }) => {
        const soundService = SoundService.getInstance();
        soundService.playSound(soundKey, get().soundVolume);
      });
    });
  },
  
  // Play background music
  playMusic: (musicKey: string) => {
    // If music is disabled, don't play anything
    if (!get().musicEnabled) {
      return;
    }
    
    // Import and use EventBridge directly to avoid window dependency
    import('../events/EventBridge').then(({ EventBridge }) => {
      // Pass volume settings to ensure consistent playback
      EventBridge.emit('game:playMusic', { 
        key: musicKey,
        volume: get().musicVolume
      });
    }).catch(error => {
      console.error('Failed to load EventBridge for audio playback:', error);
      
      // Fallback for direct calls
      import('../services/SoundService').then(({ SoundService }) => {
        const soundService = SoundService.getInstance();
        soundService.playMusic(musicKey, get().musicVolume);
      });
    });
  },
  
  // Stop all music
  stopMusic: () => {
    // Import and use EventBridge directly to avoid window dependency
    import('../events/EventBridge').then(({ EventBridge }) => {
      EventBridge.emit('game:stopMusic');
    }).catch(error => {
      console.error('Failed to load EventBridge for audio control:', error);
      
      // Fallback for direct calls
      import('../services/SoundService').then(({ SoundService }) => {
        const soundService = SoundService.getInstance();
        soundService.stopMusic();
      });
    });
  }
}));