import { create } from 'zustand';

/**
 * Audio settings and state
 */
interface AudioState {
  // Settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  
  // Actions
  toggleSound: () => void;
  toggleMusic: () => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
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
  
  // Play a sound effect
  playSound: (soundKey: string) => {
    // If sound is disabled, don't play anything
    if (!get().soundEnabled) {
      return;
    }
    
    // Use EventBridge to communicate with SoundService
    const EventBridge = (window as any).EventBridge;
    if (EventBridge) {
      EventBridge.emit('game:playSound', { key: soundKey });
    } else {
      // Fallback for direct calls before EventBridge is initialized
      import('../services/SoundService').then(({ SoundService }) => {
        const soundService = SoundService.getInstance();
        soundService.playSound(soundKey);
      });
    }
  },
  
  // Play background music
  playMusic: (musicKey: string) => {
    // If music is disabled, don't play anything
    if (!get().musicEnabled) {
      return;
    }
    
    // Use EventBridge to communicate with SoundService
    const EventBridge = (window as any).EventBridge;
    if (EventBridge) {
      EventBridge.emit('game:playMusic', { key: musicKey });
    } else {
      // Fallback for direct calls before EventBridge is initialized
      import('../services/SoundService').then(({ SoundService }) => {
        const soundService = SoundService.getInstance();
        soundService.playMusic(musicKey);
      });
    }
  },
  
  // Stop all music
  stopMusic: () => {
    // Use EventBridge to communicate with SoundService
    const EventBridge = (window as any).EventBridge;
    if (EventBridge) {
      EventBridge.emit('game:stopMusic');
    } else {
      // Fallback for direct calls before EventBridge is initialized
      import('../services/SoundService').then(({ SoundService }) => {
        const soundService = SoundService.getInstance();
        soundService.stopMusic();
      });
    }
  }
}));