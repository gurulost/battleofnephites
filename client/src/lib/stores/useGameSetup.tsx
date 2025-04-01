import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Faction } from "../../types/game";

export type GameMode = "domination" | "perfection";
export type Difficulty = "easy" | "normal" | "hard" | "crazy";

export interface GameSetupState {
  // Game setup state
  setupPhase: "mode" | "faction" | "setup" | "loading" | "game";
  selectedMode: GameMode | null;
  selectedFaction: Faction | null;
  opponents: number;
  difficulty: Difficulty;
  
  // Actions
  selectGameMode: (mode: GameMode) => void;
  selectFaction: (faction: Faction) => void;
  setOpponents: (count: number) => void;
  setDifficulty: (level: Difficulty) => void;
  goToNextPhase: () => void;
  goToPreviousPhase: () => void;
  resetSetup: () => void;
}

export const useGameSetup = create<GameSetupState>()(
  subscribeWithSelector((set) => ({
    // Initial state
    setupPhase: "mode",
    selectedMode: null,
    selectedFaction: null,
    opponents: 1,
    difficulty: "easy",
    
    // Actions
    selectGameMode: (mode) => {
      set({ selectedMode: mode });
    },
    
    selectFaction: (faction) => {
      set({ selectedFaction: faction });
    },
    
    setOpponents: (count) => {
      set({ opponents: count });
    },
    
    setDifficulty: (level) => {
      set({ difficulty: level });
    },
    
    goToNextPhase: () => {
      set((state) => {
        let nextPhase = state.setupPhase;
        
        switch (state.setupPhase) {
          case "mode":
            if (state.selectedMode) nextPhase = "faction";
            break;
          case "faction":
            if (state.selectedFaction) nextPhase = "setup";
            break;
          case "setup":
            nextPhase = "loading";
            break;
          case "loading":
            nextPhase = "game";
            break;
          default:
            break;
        }
        
        return { setupPhase: nextPhase };
      });
    },
    
    goToPreviousPhase: () => {
      set((state) => {
        let prevPhase = state.setupPhase;
        
        switch (state.setupPhase) {
          case "faction":
            prevPhase = "mode";
            break;
          case "setup":
            prevPhase = "faction";
            break;
          case "loading":
            prevPhase = "setup";
            break;
          default:
            break;
        }
        
        return { setupPhase: prevPhase };
      });
    },
    
    resetSetup: () => {
      set({
        setupPhase: "mode",
        selectedMode: null,
        selectedFaction: null,
        opponents: 1,
        difficulty: "easy"
      });
    }
  }))
);