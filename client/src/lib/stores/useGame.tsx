import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useAudio } from "./useAudio";
import { GamePhase as GameStatePhase } from "../../types/game";

// Local GamePhase for UI state - separate from game logic phase
export type GamePhase = "ready" | "playing" | "ended";

interface GameState {
  phase: GamePhase;
  musicPlaying: boolean;
  soundEffectsEnabled: boolean;
  
  // Actions
  start: () => void;
  restart: () => void;
  end: () => void;
  toggleMusic: () => void;
  toggleSoundEffects: () => void;
  playSound: (soundKey: string) => void;
}

export const useGame = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    phase: "ready",
    musicPlaying: true,
    soundEffectsEnabled: true,
    
    start: () => {
      set((state) => {
        // Only transition from ready to playing
        if (state.phase === "ready") {
          // Play theme music when starting the game
          if (state.musicPlaying) {
            useAudio.getState().playMusic('theme');
          }
          return { phase: "playing" };
        }
        return {};
      });
    },
    
    restart: () => {
      // Stop any current music
      useAudio.getState().stopMusic();
      set(() => ({ phase: "ready" }));
    },
    
    end: () => {
      set((state) => {
        // Only transition from playing to ended
        if (state.phase === "playing") {
          return { phase: "ended" };
        }
        return {};
      });
    },
    
    toggleMusic: () => {
      set((state) => {
        const newMusicState = !state.musicPlaying;
        
        // Update the audio system
        useAudio.getState().toggleMusic();
        
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
    }
  }))
);
