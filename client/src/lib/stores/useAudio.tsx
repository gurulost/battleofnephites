import { create } from 'zustand';

interface AudioState {
  soundEnabled: boolean;
  musicEnabled: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  playSound: (soundKey: string) => void;
  playMusic: (musicKey: string) => void;
  stopMusic: () => void;
}

export const useAudio = create<AudioState>((set, get) => {
  // Create audio elements
  const sounds: Record<string, HTMLAudioElement> = {};
  const music: Record<string, HTMLAudioElement> = {};
  let currentMusic: HTMLAudioElement | null = null;

  // Define audio files - use paths relative to public directory
  const soundFiles = {
    'attack': './assets/sounds/attack.mp3',
    'build': './assets/sounds/build.mp3',
    'gather': './assets/sounds/gather.mp3',
    'move': './assets/sounds/move.mp3',
    'select': './assets/sounds/select.mp3',
    'unitCreated': './assets/sounds/unit-created.mp3',
    'victory': './assets/sounds/victory.mp3',
    'defeat': './assets/sounds/defeat.mp3',
  };

  const musicFiles = {
    'theme': './assets/music/theme.mp3',
    'battle': './assets/music/battle.mp3',
  };

  // Silent audio fallback for development when files don't exist yet
  const createSilentAudio = () => {
    const audio = new Audio();
    audio.volume = 0;
    return audio;
  };

  // Preload sounds with error handling
  Object.entries(soundFiles).forEach(([key, path]) => {
    try {
      sounds[key] = new Audio(path);
      sounds[key].preload = 'auto';
      // Add error handling for missing files
      sounds[key].onerror = () => {
        console.warn(`Sound file not found: ${path}`);
        sounds[key] = createSilentAudio();
      };
    } catch (e) {
      console.warn(`Error loading sound: ${path}`, e);
      sounds[key] = createSilentAudio();
    }
  });

  // Preload music with error handling
  Object.entries(musicFiles).forEach(([key, path]) => {
    try {
      music[key] = new Audio(path);
      music[key].preload = 'auto';
      music[key].loop = true;
      // Add error handling for missing files
      music[key].onerror = () => {
        console.warn(`Music file not found: ${path}`);
        music[key] = createSilentAudio();
      };
    } catch (e) {
      console.warn(`Error loading music: ${path}`, e);
      music[key] = createSilentAudio();
    }
  });

  return {
    soundEnabled: true,
    musicEnabled: true,

    toggleSound: () => {
      set(state => ({ soundEnabled: !state.soundEnabled }));
    },

    toggleMusic: () => {
      set(state => {
        const newState = { musicEnabled: !state.musicEnabled };
        
        // If turning off music, pause current music
        if (!newState.musicEnabled && currentMusic) {
          currentMusic.pause();
        }
        // If turning on music, resume current music
        else if (newState.musicEnabled && currentMusic) {
          currentMusic.play().catch(e => console.error("Error playing music:", e));
        }
        
        return newState;
      });
    },

    playSound: (soundKey: string) => {
      if (!get().soundEnabled) return;
      if (!sounds[soundKey]) {
        console.warn(`Sound key not found: ${soundKey}`);
        return;
      }

      try {
        // Create a clone to allow multiple sound instances
        const sound = sounds[soundKey].cloneNode() as HTMLAudioElement;
        sound.volume = 0.5;
        sound.play().catch(e => {
          console.warn(`Error playing sound ${soundKey}:`, e);
        });
      } catch (error) {
        console.warn(`Failed to play sound ${soundKey}:`, error);
      }
    },

    playMusic: (musicKey: string) => {
      if (!get().musicEnabled) return;
      if (!music[musicKey]) {
        console.warn(`Music key not found: ${musicKey}`);
        return;
      }

      try {
        // Stop current music if any
        if (currentMusic) {
          currentMusic.pause();
          currentMusic.currentTime = 0;
        }

        // Play new music
        currentMusic = music[musicKey];
        currentMusic.volume = 0.3;
        currentMusic.play().catch(e => {
          console.warn(`Error playing music ${musicKey}:`, e);
        });
      } catch (error) {
        console.warn(`Failed to play music ${musicKey}:`, error);
      }
    },

    stopMusic: () => {
      if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
        currentMusic = null;
      }
    }
  };
});