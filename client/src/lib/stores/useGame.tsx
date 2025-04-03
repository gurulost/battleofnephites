import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useAudio } from "./useAudio";
import { GamePhase as GameStatePhase } from "../../types/game";

// Local GamePhase for UI state - separate from game logic phase
export type GamePhase = "ready" | "playing" | "ended";

// Music contexts for different game states
export type MusicContext = 'exploration' | 'combat' | 'victory' | 'defeat' | 'ambience';

interface GameState {
  phase: GamePhase;
  musicPlaying: boolean;
  soundEffectsEnabled: boolean;
  currentMusicContext: MusicContext;
  
  // Actions
  start: () => void;
  restart: () => void;
  end: () => void;
  toggleMusic: () => void;
  toggleSoundEffects: () => void;
  playSound: (soundKey: string) => void;
  switchMusicContext: (context: MusicContext) => void;
}

export const useGame = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    phase: "ready",
    musicPlaying: true,
    soundEffectsEnabled: true,
    currentMusicContext: 'exploration',
    
    start: () => {
      set((state) => {
        // Only transition from ready to playing
        if (state.phase === "ready") {
          // Play exploration music when starting the game
          if (state.musicPlaying) {
            useAudio.getState().playMusic('exploration');
          }
          return { 
            phase: "playing",
            currentMusicContext: 'exploration'
          };
        }
        return {};
      });
    },
    
    restart: () => {
      // Stop any current music
      useAudio.getState().stopMusic();
      set(() => ({ 
        phase: "ready",
        currentMusicContext: 'exploration'
      }));
    },
    
    end: (isVictory = false) => {
      set((state) => {
        // Only transition from playing to ended
        if (state.phase === "playing") {
          // Play appropriate victory/defeat music
          if (state.musicPlaying) {
            const musicKey = isVictory ? 'victory' : 'defeat';
            useAudio.getState().playMusic(musicKey);
          }
          
          return { 
            phase: "ended",
            currentMusicContext: isVictory ? 'victory' : 'defeat'
          };
        }
        return {};
      });
    },
    
    toggleMusic: () => {
      set((state) => {
        const newMusicState = !state.musicPlaying;
        
        // Update the audio system
        useAudio.getState().toggleMusic();
        
        // If turning music back on, resume with current context
        if (newMusicState && state.phase === "playing") {
          useAudio.getState().playMusic(state.currentMusicContext);
        }
        
        return { musicPlaying: newMusicState };
      });
    },
    
    toggleSoundEffects: () => {
      set((state) => {
        const newSoundState = !state.soundEffectsEnabled;
        
        // Update the audio system
        useAudio.getState().toggleSound();
        
        return { soundEffectsEnabled: newSoundState };
      });
    },
    
    playSound: (soundKey: string) => {
      if (get().soundEffectsEnabled) {
        useAudio.getState().playSound(soundKey);
      }
    },
    
    switchMusicContext: (context: MusicContext) => {
      const state = get();
      // Only switch if music is enabled and the context is different
      if (state.musicPlaying && state.currentMusicContext !== context) {
        // Update state first
        set({ currentMusicContext: context });
        
        // Then play the appropriate music
        useAudio.getState().playMusic(context);
        
        console.log(`Music context switched to: ${context}`);
      } else {
        // Just update the context state without playing
        set({ currentMusicContext: context });
      }
    }
  }))
);
