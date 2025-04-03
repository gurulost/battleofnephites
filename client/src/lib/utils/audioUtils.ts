/**
 * Audio utilities for procedurally generating game sounds
 * Provides simple functions for generating sounds with a feel of ancient/historical authenticity
 * 
 * This module serves as a bridge between the existing audio system and the new
 * Mesoamerican-inspired audio engine. It re-exports the new functions while maintaining
 * compatibility with existing code.
 */

// Import the enhanced audio engine
import * as AudioEngine from './audioEngine';

// Re-export the AudioContext accessor for compatibility
export function getAudioContext(): AudioContext {
  return AudioEngine.getAudioContext();
}

// Re-export the basic tone/sound functions with compatibility layers
export function playTone(
  frequency: number,
  type: OscillatorType = 'sine', 
  duration = 0.3, 
  volume = 0.5,
  attack = 0.01,
  decay = 0.1,
  sustain = 0.5,
  release = 0.1
): void {
  // Map to appropriate engine function based on type
  if (type === 'sine' || type === 'triangle') {
    AudioEngine.playFlute(frequency, duration, undefined, volume);
  } else {
    // For other oscillator types, use plucked string if higher frequency
    if (frequency > 300) {
      AudioEngine.playPluckedString(frequency, duration, undefined, volume);
    } else {
      // Otherwise use percussion for lower tones
      AudioEngine.playPercussion('deepDrum', undefined, volume);
    }
  }
}

// Map the basic percussion function to the enhanced engine
export function playPercussion(
  frequency = 200,
  duration = 0.2,
  volume = 0.5
): void {
  // Map frequency ranges to different percussion types
  let percussionType: 'deepDrum' | 'woodBlock' | 'rattle' | 'shell';
  
  if (frequency < 100) {
    percussionType = 'deepDrum';
  } else if (frequency < 200) {
    percussionType = 'woodBlock';
  } else if (frequency < 300) {
    percussionType = 'rattle';
  } else {
    percussionType = 'shell';
  }
  
  AudioEngine.playPercussion(percussionType, undefined, volume);
}

// Map the plucked string function
export function playPluckedString(
  frequency = 440,
  duration = 0.6,
  volume = 0.3
): void {
  AudioEngine.playPluckedString(frequency, duration, undefined, volume);
}

// Map the horn function
export function playHorn(
  frequency = 220,
  duration = 0.8,
  volume = 0.4
): void {
  // Use shell percussion for horn-like sound
  AudioEngine.playPercussion('shell', undefined, volume);
  
  // Add a flute layer for richer sound
  setTimeout(() => {
    AudioEngine.playFlute(frequency, duration, undefined, volume * 0.6);
  }, 100);
}

// Re-export the audio engine's master volume control
export const setMasterVolume = AudioEngine.setMasterVolume;

// Sound effect generators

export function generateAttackSound(): void {
  // Metal clash sound for attack
  playTone(180, 'sawtooth', 0.05, 0.4, 0.01, 0.1, 0.1, 0.1);
  playTone(400, 'square', 0.2, 0.2, 0.01, 0.1, 0.1, 0.1);
  
  // Add a slight delay for the second tone
  setTimeout(() => {
    playTone(300, 'sawtooth', 0.1, 0.3, 0.01, 0.1, 0.1, 0.1);
  }, 50);
}

export function generateBuildSound(): void {
  // Construction sound
  playPercussion(100, 0.3, 0.3);
  
  // Add wood knocking sounds
  setTimeout(() => {
    playPercussion(150, 0.1, 0.2);
  }, 200);
  
  setTimeout(() => {
    playPercussion(120, 0.2, 0.25);
  }, 350);
}

export function generateGatherSound(): void {
  // Resource gathering sound
  playTone(300, 'sine', 0.1, 0.2, 0.01, 0.05, 0.5, 0.05);
  
  setTimeout(() => {
    playTone(350, 'sine', 0.1, 0.15, 0.01, 0.05, 0.5, 0.05);
  }, 150);
}

export function generateMoveSound(): void {
  // Movement sound - footsteps
  playPercussion(80, 0.1, 0.15);
  
  setTimeout(() => {
    playPercussion(70, 0.1, 0.1);
  }, 100);
}

export function generateSelectSound(): void {
  // Selection sound - UI feedback
  playTone(600, 'sine', 0.1, 0.15, 0.01, 0.05, 0.5, 0.05);
}

export function generateUnitCreatedSound(): void {
  // Unit creation - horn call
  playHorn(392, 0.4, 0.25); // G4
  
  setTimeout(() => {
    playHorn(440, 0.6, 0.3); // A4
  }, 500);
}

export function generateVictorySound(): void {
  // Victory fanfare
  playHorn(440, 0.4, 0.3); // A4
  
  setTimeout(() => {
    playHorn(523.25, 0.4, 0.3); // C5
  }, 400);
  
  setTimeout(() => {
    playHorn(659.25, 0.8, 0.4); // E5
  }, 800);
}

export function generateDefeatSound(): void {
  // Defeat sound - somber
  playHorn(392, 0.4, 0.3); // G4
  
  setTimeout(() => {
    playHorn(349.23, 0.4, 0.25); // F4
  }, 400);
  
  setTimeout(() => {
    playHorn(293.66, 0.8, 0.2); // D4
  }, 800);
}

/**
 * Generate themed music patterns
 * @param baseNote - Base frequency
 * @param duration - Duration of each note
 * @param volume - Volume of the music
 */
export function playThemeMusic(
  baseNote = 294, // D4
  duration = 0.3,
  volume = 0.15
): void {
  // Ancient-sounding scale pattern
  const scale = [1, 1.125, 1.25, 1.5, 1.667, 1.875, 2];
  
  // Play a sequence of notes
  let delay = 0;
  
  // Play a few random notes from the scale
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * scale.length);
    const note = baseNote * scale[randomIndex];
    
    setTimeout(() => {
      playPluckedString(note, duration, volume);
    }, delay);
    
    delay += duration * 1000 * 0.8;
  }
  
  // Add a percussion sound
  setTimeout(() => {
    playPercussion(100, 0.2, volume * 0.8);
  }, duration * 1000 * 2);
  
  // Add another percussion sound
  setTimeout(() => {
    playPercussion(80, 0.2, volume * 0.6);
  }, duration * 1000 * 4);
}

/**
 * Generate battle music with more intensity
 * @param baseNote - Base frequency
 * @param duration - Duration of each note
 * @param volume - Volume of the music
 */
export function playBattleMusic(
  baseNote = 220, // A3
  duration = 0.2,
  volume = 0.2
): void {
  // More intense rhythm for battle
  const scale = [1, 1.125, 1.25, 1.5, 1.667, 1.875, 2];
  
  // Play percussion first
  playPercussion(60, 0.3, volume);
  
  setTimeout(() => {
    playPercussion(100, 0.2, volume * 0.8);
  }, 300);
  
  // Play a sequence of faster notes
  let delay = 600;
  
  // Play a few random notes from the scale
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * scale.length);
    const note = baseNote * scale[randomIndex];
    
    if (i === 3) {
      // Add another percussion hit in the middle
      setTimeout(() => {
        playPercussion(80, 0.2, volume * 0.7);
      }, delay);
    }
    
    setTimeout(() => {
      if (i % 2 === 0) {
        playHorn(note, duration, volume * 0.7);
      } else {
        playPluckedString(note, duration, volume * 0.6);
      }
    }, delay);
    
    delay += duration * 1000 * 0.7;
  }
}