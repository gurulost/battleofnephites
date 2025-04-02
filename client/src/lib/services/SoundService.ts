import { useAudio } from '../stores/useAudio';
import * as audioUtils from '../utils/audioUtils';

/**
 * Service for playing sound effects and music with culturally authentic sounds
 */
export class SoundService {
  private static instance: SoundService;
  private themeInterval: number | null = null;
  private battleInterval: number | null = null;
  
  /**
   * Use singleton pattern to ensure only one instance exists
   */
  public static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }
  
  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    // Initialize service
    console.log('Sound service initialized');
  }
  
  /**
   * Play sound effect depending on action
   * @param soundKey - The key of the sound to play
   */
  public playSound(soundKey: string): void {
    // Check if sound is enabled in the store
    if (!useAudio.getState().soundEnabled) {
      return;
    }
    
    // Use procedurally generated sounds
    switch (soundKey) {
      case 'attack':
        audioUtils.generateAttackSound();
        break;
      case 'build':
        audioUtils.generateBuildSound();
        break;
      case 'gather':
        audioUtils.generateGatherSound();
        break;
      case 'move':
        audioUtils.generateMoveSound();
        break;
      case 'select':
        audioUtils.generateSelectSound();
        break;
      case 'unitCreated':
        audioUtils.generateUnitCreatedSound();
        break;
      case 'victory':
        audioUtils.generateVictorySound();
        break;
      case 'defeat':
        audioUtils.generateDefeatSound();
        break;
      default:
        console.warn(`Sound key not recognized: ${soundKey}`);
    }
    
    // Also trigger the audio store for potential pre-recorded sounds
    useAudio.getState().playSound(soundKey);
  }
  
  /**
   * Play background music
   * @param musicKey - The key of the music track to play
   */
  public playMusic(musicKey: string): void {
    // Check if music is enabled in the store
    if (!useAudio.getState().musicEnabled) {
      return;
    }
    
    // Stop any existing music
    this.stopMusic();
    
    // Use procedurally generated music
    switch (musicKey) {
      case 'theme':
        // Play theme music every few seconds to create continuous background
        audioUtils.playThemeMusic();
        this.themeInterval = window.setInterval(() => {
          if (useAudio.getState().musicEnabled) {
            audioUtils.playThemeMusic();
          }
        }, 8000) as unknown as number;
        break;
      case 'battle':
        // Play battle music every few seconds to create continuous background
        audioUtils.playBattleMusic();
        this.battleInterval = window.setInterval(() => {
          if (useAudio.getState().musicEnabled) {
            audioUtils.playBattleMusic();
          }
        }, 7200) as unknown as number;
        break;
      default:
        console.warn(`Music key not recognized: ${musicKey}`);
    }
    
    // Also trigger the audio store for potential pre-recorded music
    useAudio.getState().playMusic(musicKey);
  }
  
  /**
   * Stop all music
   */
  public stopMusic(): void {
    // Clear intervals for generated music
    if (this.themeInterval !== null) {
      clearInterval(this.themeInterval);
      this.themeInterval = null;
    }
    
    if (this.battleInterval !== null) {
      clearInterval(this.battleInterval);
      this.battleInterval = null;
    }
    
    // Also stop any pre-recorded music
    useAudio.getState().stopMusic();
  }
}