import { useAudio } from '../stores/useAudio';
import * as audioUtils from '../utils/audioUtils';

/**
 * Sound mode determines whether to use procedural, pre-recorded, or hybrid audio
 */
export type SoundMode = 'procedural' | 'recorded' | 'hybrid';

/**
 * Service for playing sound effects and music with culturally authentic sounds
 */
export class SoundService {
  private static instance: SoundService;
  private themeInterval: number | null = null;
  private battleInterval: number | null = null;
  private soundCache: Map<string, HTMLAudioElement> = new Map();
  private soundMode: SoundMode = 'hybrid'; // Default mode
  private game: Phaser.Game | null = null;
  
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
    
    // Set up event listeners for settings changes
    useAudio.subscribe((state) => {
      // Update volume for cached audio elements when settings change
      this.soundCache.forEach(audio => {
        audio.volume = state.soundVolume;
      });
    });
  }
  
  /**
   * Connect to Phaser game instance for direct sound usage
   * @param game - The Phaser game instance
   */
  public connectToGame(game: Phaser.Game): void {
    this.game = game;
    console.log('Sound service connected to Phaser game');
  }
  
  /**
   * Set the sound mode (procedural, recorded, or hybrid)
   * @param mode - The sound mode to use
   */
  public setSoundMode(mode: SoundMode): void {
    this.soundMode = mode;
    console.log(`Sound mode set to: ${mode}`);
  }
  
  /**
   * Get the current sound mode
   */
  public getSoundMode(): SoundMode {
    return this.soundMode;
  }
  
  /**
   * Play sound effect depending on action
   * @param soundKey - The key of the sound to play
   * @param volume - Optional volume override (0-1)
   */
  public playSound(soundKey: string, volume?: number): void {
    // Check if sound is enabled in the store
    if (!useAudio.getState().soundEnabled) {
      return;
    }
    
    // Get the volume - use parameter if provided, otherwise use store value
    const soundVolume = volume !== undefined ? volume : useAudio.getState().soundVolume;
    
    // In hybrid mode, try to play pre-recorded sound first and fall back to procedural
    if (this.soundMode === 'hybrid' || this.soundMode === 'recorded') {
      if (this.tryPlayRecordedSound(soundKey, soundVolume)) {
        // Successfully played recorded sound
        return;
      } else if (this.soundMode === 'recorded') {
        // In recorded-only mode, warn and return if no recorded sound found
        console.warn(`No recorded sound found for key: ${soundKey}`);
        return;
      }
    }
    
    // Attempt to use enhanced audio engine for procedural sound effects
    import('../utils/audioEngine').then((AudioEngine) => {
      // Options for sound effects
      const options = { volume: soundVolume };
      
      // Use the enhanced audio engine based on the sound key
      switch (soundKey) {
        case 'attack':
          // Use metallic percussion or horn for attack sounds
          if (Math.random() > 0.5) {
            AudioEngine.playPercussion('metalClang', options);
          } else {
            // First parameter is frequency
            const frequency = 180 + Math.random() * 40;
            AudioEngine.playHorn(frequency, { ...options, duration: 0.8 });
          }
          break;
          
        case 'build':
          // Use stone or wood percussion for building sounds
          if (Math.random() > 0.5) {
            AudioEngine.playPercussion('stoneHit', options);
          } else {
            AudioEngine.playPercussion('slitDrum', options);
          }
          break;
          
        case 'gather':
          // Use rattle or plucked string for resource gathering
          if (Math.random() > 0.5) {
            AudioEngine.playPercussion('rattle', options);
          } else {
            // First parameter is frequency
            const frequency = 220 + Math.random() * 100;
            AudioEngine.playPluckedString(frequency, {
              ...options,
              duration: 0.5
            });
          }
          break;
          
        case 'move':
          // Subtle percussion for movement
          AudioEngine.playPercussion('slitDrum', {
            ...options, 
            volume: soundVolume * 0.6
          });
          break;
          
        case 'select':
          // Brief wind instrument or plucked string for selection
          if (Math.random() > 0.4) {
            // First parameter is frequency
            const frequency = 350 + Math.random() * 100;
            AudioEngine.playWindInstrument(frequency, {
              ...options,
              duration: 0.3
            });
          } else {
            // First parameter is frequency
            const frequency = 380 + Math.random() * 80;
            AudioEngine.playPluckedString(frequency, {
              ...options,
              duration: 0.3
            });
          }
          break;
          
        case 'unitCreated':
        case 'unit-created': // Support both naming conventions
          // Triumphant horn for unit creation
          const frequency = 180 + Math.random() * 40;
          AudioEngine.playHorn(frequency, {
            ...options,
            duration: 1.2
          });
          break;
          
        case 'victory':
          // Celebratory ceremonial music for victory
          AudioEngine.playCeremonialMusic(true, {
            intensity: 0.8,
            duration: 10
          });
          break;
          
        case 'defeat':
          // Somber ceremonial music for defeat
          AudioEngine.playCeremonialMusic(false, {
            intensity: 0.5,
            duration: 10
          });
          break;
          
        default:
          console.warn(`Sound key not recognized for enhanced procedural audio: ${soundKey}`);
          // Fall back to legacy audio utilities
          this.playLegacyProceduralSound(soundKey);
      }
    }).catch(error => {
      console.error('Failed to load enhanced Audio Engine for sound effects:', error);
      // Fall back to legacy audio utilities if there's an error
      this.playLegacyProceduralSound(soundKey);
    });
  }
  
  /**
   * Play legacy procedural sounds as a fallback
   * @param soundKey - The key of the sound to play
   */
  private playLegacyProceduralSound(soundKey: string): void {
    // Use original audio utilities for backward compatibility
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
      case 'unit-created': // Support both naming conventions
        audioUtils.generateUnitCreatedSound();
        break;
      case 'victory':
        audioUtils.generateVictorySound();
        break;
      case 'defeat':
        audioUtils.generateDefeatSound();
        break;
      default:
        console.warn(`Sound key not recognized for legacy procedural audio: ${soundKey}`);
    }
  }
  
  /**
   * Try to play a pre-recorded sound
   * @param soundKey - The key of the sound to play
   * @param volume - The volume to play at (0-1)
   * @returns True if successfully played, false otherwise
   */
  private tryPlayRecordedSound(soundKey: string, volume: number): boolean {
    // First check if the sound exists in Phaser's cache
    if (this.game && this.game.sound && this.game.sound.get(soundKey)) {
      // Convert key format from unitCreated to unit-created if needed
      const phaserKey = soundKey === 'unitCreated' ? 'unit-created' : soundKey;
      this.game.sound.play(phaserKey, { volume });
      return true;
    }
    
    // If not in Phaser, try to play using HTML Audio
    try {
      // Convert key format if needed
      const fileName = soundKey === 'unitCreated' ? 'unit-created' : soundKey;
      const path = `assets/sounds/${fileName}.mp3`;
      
      // Check if we already have this audio cached
      let audio = this.soundCache.get(path);
      
      if (!audio) {
        // Create and cache the audio element
        audio = new Audio(path);
        this.soundCache.set(path, audio);
      }
      
      // Set volume and play
      audio.volume = volume;
      audio.currentTime = 0; // Reset to beginning
      
      // Play the sound and return true if successful
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(error => {
          console.warn(`Error playing recorded sound ${soundKey}: ${error.message}`);
        });
      }
      
      return true;
    } catch (error) {
      console.debug(`Could not play recorded sound ${soundKey}: ${error}`);
      return false;
    }
  }
  
  /**
   * Play background music
   * @param musicKey - The key of the music track to play
   * @param volume - Optional volume override (0-1)
   */
  public playMusic(musicKey: string, volume?: number): void {
    // Check if music is enabled in the store
    if (!useAudio.getState().musicEnabled) {
      return;
    }
    
    // Stop any existing music
    this.stopMusic();
    
    // Get the volume - use parameter if provided, otherwise use store value
    const musicVolume = volume !== undefined ? volume : useAudio.getState().musicVolume;
    
    // Try to play pre-recorded music first
    if (this.soundMode === 'hybrid' || this.soundMode === 'recorded') {
      // Try to play using Phaser sound if available
      if (this.game && this.game.sound && this.game.sound.get(musicKey)) {
        this.game.sound.play(musicKey, { 
          loop: true,
          volume: musicVolume 
        });
        return;
      }
      
      // Try to play using HTML Audio
      try {
        const path = `assets/music/${musicKey}.mp3`;
        let audio = this.soundCache.get(path);
        
        if (!audio) {
          audio = new Audio(path);
          audio.loop = true;
          this.soundCache.set(path, audio);
        }
        
        audio.volume = musicVolume;
        audio.play().catch(error => {
          console.debug(`Error playing music ${musicKey}: ${error.message}`);
          this.playProceduralMusic(musicKey);
        });
        
        return;
      } catch (error) {
        console.debug(`Could not play recorded music ${musicKey}: ${error}`);
        // Fall back to procedural music if in hybrid mode
        if (this.soundMode === 'hybrid') {
          this.playProceduralMusic(musicKey);
        }
      }
    } else {
      // If in procedural-only mode
      this.playProceduralMusic(musicKey);
    }
  }
  
  /**
   * Play procedurally generated music
   * @param musicKey - The key of the music track to play
   */
  private playProceduralMusic(musicKey: string): void {
    // Import enhanced audio engine for dynamic music generation
    import('../utils/audioEngine').then((AudioEngine) => {
      // Use procedurally generated music based on the music key
      switch (musicKey) {
        case 'theme':
        case 'exploration':
          // Play Mesoamerican exploration music with moderate intensity
          AudioEngine.playExplorationMusic({
            intensity: 0.4,
            duration: 30
          });
          
          // Set up interval to periodically regenerate music for continuous background
          this.themeInterval = window.setInterval(() => {
            if (useAudio.getState().musicEnabled) {
              AudioEngine.playExplorationMusic({
                intensity: 0.4,
                duration: 30
              });
            }
          }, 29000) as unknown as number; // Slightly shorter than duration to avoid gaps
          break;
          
        case 'battle':
        case 'combat':
          // Play Mesoamerican combat music with higher intensity
          AudioEngine.playCombatMusic({
            intensity: 0.7,
            duration: 25
          });
          
          // Set up interval for continuous battle music
          this.battleInterval = window.setInterval(() => {
            if (useAudio.getState().musicEnabled) {
              AudioEngine.playCombatMusic({
                intensity: 0.7,
                duration: 25
              });
            }
          }, 24000) as unknown as number; // Slightly shorter than duration to avoid gaps
          break;
          
        case 'victory':
          // Play victory ceremonial music (no loop needed for victory/defeat)
          AudioEngine.playCeremonialMusic(true, {
            intensity: 0.8,
            duration: 20
          });
          break;
          
        case 'defeat':
          // Play defeat ceremonial music (no loop needed for victory/defeat)
          AudioEngine.playCeremonialMusic(false, {
            intensity: 0.4,
            duration: 20
          });
          break;
          
        case 'ambience':
          // Use exploration music with low intensity for ambience if specific ambient functions aren't available
          AudioEngine.playExplorationMusic({
            intensity: 0.2,  // Use low intensity for ambient background
            duration: 30
          });
          
          // Also use the new ambient nature sounds if available
          AudioEngine.generateAmbientNatureSounds(30, 0.5);
          AudioEngine.generateAmbientFluteLayer(220, 30, 0.3);
          
          // Set up interval for continuous ambient sounds
          this.themeInterval = window.setInterval(() => {
            if (useAudio.getState().musicEnabled) {
              AudioEngine.playExplorationMusic({
                intensity: 0.2,
                duration: 30
              });
              // Refresh the ambient nature sounds
              AudioEngine.generateAmbientNatureSounds(30, 0.5);
              AudioEngine.generateAmbientFluteLayer(220, 30, 0.3);
            }
          }, 29000) as unknown as number;
          break;
          
        default:
          // For unrecognized keys, fall back to the simple exploration music
          console.log(`Using fallback music for unrecognized key: ${musicKey}`);
          
          // Use exploration music with generic settings
          AudioEngine.playExplorationMusic({
            intensity: 0.3,
            duration: 20,
            theme: 'genericAncient'
          });
          
          this.themeInterval = window.setInterval(() => {
            if (useAudio.getState().musicEnabled) {
              AudioEngine.playExplorationMusic({
                intensity: 0.3,
                duration: 20,
                theme: 'genericAncient'
              });
            }
          }, 19000) as unknown as number;
      }
    }).catch(error => {
      console.error('Failed to load Audio Engine for procedural music:', error);
      
      // Fall back to legacy procedural audio if there's an error
      switch (musicKey) {
        case 'theme':
          audioUtils.playThemeMusic();
          this.themeInterval = window.setInterval(() => {
            if (useAudio.getState().musicEnabled) {
              audioUtils.playThemeMusic();
            }
          }, 8000) as unknown as number;
          break;
        case 'battle':
          audioUtils.playBattleMusic();
          this.battleInterval = window.setInterval(() => {
            if (useAudio.getState().musicEnabled) {
              audioUtils.playBattleMusic();
            }
          }, 7200) as unknown as number;
          break;
        default:
          console.warn(`Music key not recognized for procedural audio: ${musicKey}`);
      }
    });
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
    
    // Stop music in Phaser if available
    if (this.game && this.game.sound) {
      this.game.sound.stopAll();
    }
    
    // Stop any HTML Audio elements used for music
    this.soundCache.forEach(audio => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }
}