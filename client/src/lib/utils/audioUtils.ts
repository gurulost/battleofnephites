/**
 * Audio utilities for procedurally generating game sounds
 * Provides simple functions for generating sounds with a feel of ancient/historical authenticity
 */

/**
 * Get or create the audio context
 */
export function getAudioContext(): AudioContext {
  const ctx = (window as any).audioContext;
  if (ctx) return ctx;
  
  const newCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  (window as any).audioContext = newCtx;
  return newCtx;
}

/**
 * Create a simple oscillator sound with envelope
 * @param frequency - Base frequency of the sound
 * @param type - Type of waveform
 * @param duration - Duration of the sound in seconds
 * @param volume - Volume of the sound (0-1)
 * @param attack - Attack time in seconds
 * @param decay - Decay time in seconds
 * @param sustain - Sustain level (0-1)
 * @param release - Release time in seconds
 */
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
  const ctx = getAudioContext();
  
  // Create oscillator and gain node
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Set oscillator type and frequency
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  
  // Set initial volume to 0
  gainNode.gain.value = 0;
  
  // Schedule envelope
  const now = ctx.currentTime;
  gainNode.gain.linearRampToValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + attack);
  gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
  gainNode.gain.linearRampToValueAtTime(0, now + attack + decay + duration + release);
  
  // Start and stop the oscillator
  oscillator.start(now);
  oscillator.stop(now + attack + decay + duration + release);
}

/**
 * Create a percussion sound
 * @param frequency - Base frequency
 * @param duration - Duration in seconds
 * @param volume - Volume (0-1)
 */
export function playPercussion(
  frequency = 200,
  duration = 0.2,
  volume = 0.5
): void {
  const ctx = getAudioContext();
  
  // Create oscillator and gain node
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Create a short, percussive sound
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  
  const now = ctx.currentTime;
  
  // Very short attack, quick decay
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * Play a plucked string sound (like a harp or lyre)
 * @param frequency - Base frequency
 * @param duration - Duration in seconds
 * @param volume - Volume (0-1)
 */
export function playPluckedString(
  frequency = 440,
  duration = 0.6,
  volume = 0.3
): void {
  const ctx = getAudioContext();
  
  // Create oscillator and gain node
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  // Create filter for more string-like sound
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1500;
  filter.Q.value = 0.5;
  
  // Connect nodes
  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Set parameters
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  
  const now = ctx.currentTime;
  
  // Plucked string envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  // Slight detuning over time
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.98, now + duration);
  
  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * Play a horn or trumpet sound
 * @param frequency - Base frequency
 * @param duration - Duration in seconds
 * @param volume - Volume (0-1)
 */
export function playHorn(
  frequency = 220,
  duration = 0.8,
  volume = 0.4
): void {
  const ctx = getAudioContext();
  
  // Create oscillator and gain node
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  // Create filter for brass-like tone
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;
  filter.Q.value = 5;
  
  // Connect nodes
  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Set parameters
  oscillator.type = 'square';
  oscillator.frequency.value = frequency;
  
  const now = ctx.currentTime;
  
  // Horn-like envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.1);
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.2);
  gainNode.gain.linearRampToValueAtTime(volume * 0.9, now + duration - 0.1);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);
  
  // Filter modulation
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.linearRampToValueAtTime(1500, now + 0.1);
  filter.frequency.linearRampToValueAtTime(1000, now + duration);
  
  oscillator.start(now);
  oscillator.stop(now + duration);
}

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