/**
 * Procedural Mesoamerican Music Engine
 * 
 * Based on the Web Audio API, this engine creates authentic-sounding
 * procedurally-generated music inspired by ancient Mesoamerican cultures.
 * 
 * Features:
 * - Percussion instruments (Huehuetl, Teponaztli)
 * - Wind instruments (clay ocarinas, whistles, panpipes)
 * - Plucked string sounds
 * - Procedural rhythm and melody generation
 * - Dynamic layering based on game context
 */

// AudioContext singleton
let audioContext: AudioContext | null = null;

/**
 * Get or create the audio context
 */
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error('Web Audio API not supported:', e);
      // Create a mock audio context if not supported
      audioContext = {
        currentTime: 0,
        destination: null,
        createOscillator: () => null,
        createGain: () => null,
        createBiquadFilter: () => null,
        createDelay: () => null,
        createBufferSource: () => null,
      } as unknown as AudioContext;
    }
  }
  
  // Resume audio context if in suspended state (autoplay policies)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(err => {
      console.warn('Could not resume audio context:', err);
    });
  }
  
  return audioContext;
}

// Utility function to create master volume control
let masterGainNode: GainNode | null = null;

/**
 * Get or create the master gain node for volume control
 */
export function getMasterGain(): GainNode {
  const ctx = getAudioContext();
  if (!masterGainNode) {
    masterGainNode = ctx.createGain();
    masterGainNode.connect(ctx.destination);
    masterGainNode.gain.value = 0.5; // Default master volume
  }
  return masterGainNode;
}

/**
 * Set the master volume
 * @param volume - Volume level (0-1)
 */
export function setMasterVolume(volume: number): void {
  const gain = getMasterGain();
  const ctx = getAudioContext();
  
  // Apply smoothly to avoid clicks
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(
    Math.max(0, Math.min(1, volume)), // Clamp to 0-1
    ctx.currentTime + 0.1
  );
}

// ===========================================================================
// INSTRUMENT IMPLEMENTATION
// ===========================================================================

/**
 * Play a percussion instrument (Huehuetl, Teponaztli)
 * @param type - Type of percussion instrument
 * @param time - Start time (in seconds, relative to audio context)
 * @param volume - Volume level (0-1)
 */
export function playPercussion(
  type: 'deepDrum' | 'woodBlock' | 'rattle' | 'shell',
  time?: number,
  volume: number = 0.5
): void {
  const ctx = getAudioContext();
  const masterGain = getMasterGain();
  const now = time !== undefined ? time : ctx.currentTime;
  
  // Create output gain node for this sound
  const gainNode = ctx.createGain();
  gainNode.connect(masterGain);
  gainNode.gain.value = 0; // Start silent
  
  // Create filter for shaping sound
  const filter = ctx.createBiquadFilter();
  filter.connect(gainNode);
  
  // Oscillator for the percussion sound
  const osc = ctx.createOscillator();
  osc.connect(filter);
  
  // Configure based on percussion type
  switch (type) {
    case 'deepDrum': // Huehuetl (deep ceremonial drum)
      osc.type = 'triangle';
      osc.frequency.value = 80; // Deep bass frequency
      
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      filter.Q.value = 1;
      
      // Pitch drop for natural drum sound
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      // Start and stop
      osc.start(now);
      osc.stop(now + 0.6);
      break;
      
    case 'woodBlock': // Teponaztli (slit drum)
      osc.type = 'sine';
      osc.frequency.value = 220;
      
      filter.type = 'bandpass';
      filter.frequency.value = 400;
      filter.Q.value = 5;
      
      // Rapid pitch drop for wooden hit sound
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);
      
      // Sharp attack, quick decay
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      // Start and stop
      osc.start(now);
      osc.stop(now + 0.3);
      break;
      
    case 'rattle': // Ayacachtli (seed rattle)
      // Use noise instead of a simple oscillator for the rattle
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      // Fill the buffer with noise
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      // Create noise source
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      
      // Apply bandpass filter for rattle-like sound
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 1;
      
      noise.connect(filter);
      
      // Multiple short bursts for rattle effect
      const burstCount = 3;
      const burstDuration = 0.05;
      const burstInterval = 0.07;
      
      for (let i = 0; i < burstCount; i++) {
        const burstTime = now + (i * burstInterval);
        
        // Volume envelope for each burst
        gainNode.gain.setValueAtTime(0, burstTime);
        gainNode.gain.linearRampToValueAtTime(volume * 0.6, burstTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, burstTime + burstDuration);
      }
      
      // Start and stop
      noise.start(now);
      noise.stop(now + (burstCount * burstInterval) + burstDuration);
      break;
      
    case 'shell': // Conch shell trumpet (atecocolli)
      osc.type = 'sawtooth';
      osc.frequency.value = 150;
      
      // Filter to shape the shell trumpet sound
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value = 3;
      
      // Second filter for resonance
      const resonance = ctx.createBiquadFilter();
      resonance.type = 'peaking'; // Use 'peaking' instead of 'peak'
      resonance.frequency.value = 400;
      resonance.Q.value = 15;
      resonance.gain.value = 10;
      
      filter.connect(resonance);
      resonance.connect(gainNode);
      osc.disconnect();
      osc.connect(filter);
      
      // Pitch contour
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.1);
      osc.frequency.linearRampToValueAtTime(140, now + 0.4);
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.1);
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      
      // Start and stop
      osc.start(now);
      osc.stop(now + 1);
      break;
      
    default:
      // Default to wood block if unknown type
      console.warn(`Unknown percussion type: ${type}, defaulting to woodBlock`);
      playPercussion('woodBlock', time, volume);
      return;
  }
}

/**
 * Play a wind instrument (flute, ocarina, whistle)
 * @param noteFrequency - Frequency of the note to play
 * @param duration - Duration in seconds
 * @param time - Start time (in seconds, relative to audio context)
 * @param volume - Volume level (0-1)
 */
export function playFlute(
  noteFrequency: number,
  duration: number = 1,
  time?: number,
  volume: number = 0.3
): void {
  const ctx = getAudioContext();
  const masterGain = getMasterGain();
  const now = time !== undefined ? time : ctx.currentTime;
  
  // Create gain node for this sound
  const gainNode = ctx.createGain();
  gainNode.connect(masterGain);
  
  // Create filter for the flute sound
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 2;
  filter.connect(gainNode);
  
  // Main oscillator
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = noteFrequency;
  osc.connect(filter);
  
  // Breath noise oscillator for realism
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.01; // Very subtle
  noiseGain.connect(gainNode);
  
  const bufferSize = ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  // Fill the buffer with white noise
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  // Create noise source for breath sound
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  
  // Apply bandpass filter to noise for breath effect
  const breathFilter = ctx.createBiquadFilter();
  breathFilter.type = 'bandpass';
  breathFilter.frequency.value = noteFrequency * 2;
  breathFilter.Q.value = 0.5;
  
  noise.connect(breathFilter);
  breathFilter.connect(noiseGain);
  
  // Add vibrato for expressive flute sound
  const vibratoAmount = noteFrequency * 0.01; // 1% vibrato depth
  const vibratoSpeed = 5; // 5 Hz vibrato
  
  // Create LFO for vibrato
  const vibratoOsc = ctx.createOscillator();
  vibratoOsc.type = 'sine';
  vibratoOsc.frequency.value = vibratoSpeed;
  
  const vibratoGain = ctx.createGain();
  vibratoGain.gain.value = vibratoAmount;
  
  vibratoOsc.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);
  
  // Volume envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.1); // Soft attack
  gainNode.gain.setValueAtTime(volume, now + duration - 0.1);
  gainNode.gain.linearRampToValueAtTime(0, now + duration); // Soft release
  
  // Slight pitch bend at start for authenticity
  osc.frequency.setValueAtTime(noteFrequency * 0.98, now);
  osc.frequency.linearRampToValueAtTime(noteFrequency, now + 0.1);
  
  // Start and stop oscillators
  osc.start(now);
  noise.start(now);
  vibratoOsc.start(now);
  
  osc.stop(now + duration + 0.1);
  noise.stop(now + duration + 0.1);
  vibratoOsc.stop(now + duration + 0.1);
}

/**
 * Play a plucked string sound
 * @param noteFrequency - Frequency of the note to play
 * @param duration - Duration in seconds
 * @param time - Start time (in seconds, relative to audio context)
 * @param volume - Volume level (0-1)
 */
export function playPluckedString(
  noteFrequency: number,
  duration: number = 1,
  time?: number,
  volume: number = 0.3
): void {
  const ctx = getAudioContext();
  const masterGain = getMasterGain();
  const now = time !== undefined ? time : ctx.currentTime;
  
  // Create gain node for this sound
  const gainNode = ctx.createGain();
  gainNode.connect(masterGain);
  
  // Create filter for the string sound
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = noteFrequency * 2;
  filter.Q.value = 1;
  filter.connect(gainNode);
  
  // Main oscillator
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = noteFrequency;
  osc.connect(filter);
  
  // Volume envelope - quick attack, longer decay for plucked sound
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.005); // Fast attack
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Long decay
  
  // Subtle pitch drop for realistic string behavior
  osc.frequency.setValueAtTime(noteFrequency * 1.005, now); // Start slightly sharp
  osc.frequency.exponentialRampToValueAtTime(noteFrequency * 0.998, now + duration); // End slightly flat
  
  // Start and stop oscillator
  osc.start(now);
  osc.stop(now + duration + 0.1);
}

// ===========================================================================
// RHYTHM AND PATTERN GENERATION
// ===========================================================================

/**
 * Generate a percussion rhythm pattern
 * @param context - Audio context
 * @param bpm - Beats per minute
 * @param duration - Total duration in seconds
 * @param complexity - Rhythm complexity (0-1)
 */
export function generatePercussionRhythm(
  bpm: number = 90,
  duration: number = 8,
  complexity: number = 0.5
): void {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime;
  const quarterNote = 60 / bpm; // Duration of quarter note in seconds
  const eighthNote = quarterNote / 2;
  
  // Create basic rhythm patterns based on complexity
  const patternLength = Math.floor(4 + complexity * 4); // 4-8 steps depending on complexity
  
  // Define different percussion patterns
  const deepDrumPattern: (string | null)[] = Array(patternLength).fill(null);
  const woodBlockPattern: (string | null)[] = Array(patternLength).fill(null);
  const rattlePattern: (string | null)[] = Array(patternLength).fill(null);
  
  // Place deep drum hits on strong beats (typically 1 and 3 in 4/4 time)
  deepDrumPattern[0] = 'deepDrum';
  if (Math.random() < 0.7) deepDrumPattern[Math.floor(patternLength / 2)] = 'deepDrum';
  
  // Place wood blocks on off-beats based on complexity
  const woodBlockDensity = 0.2 + complexity * 0.5; // 20-70% density based on complexity
  for (let i = 0; i < patternLength; i++) {
    if (i % 2 === 1 && Math.random() < woodBlockDensity) { // Favor off-beats
      woodBlockPattern[i] = 'woodBlock';
    }
  }
  
  // Add rattles for texture, more with higher complexity
  const rattleDensity = complexity * 0.4; // 0-40% density based on complexity
  for (let i = 0; i < patternLength; i++) {
    if (Math.random() < rattleDensity) {
      rattlePattern[i] = 'rattle';
    }
  }
  
  // Add occasional shell sound for accent
  const shellPositions = [];
  if (Math.random() < 0.3 + complexity * 0.4) {
    // Add shell sound at a random position, favoring the beginning or end of pattern
    const shellPos = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * patternLength);
    shellPositions.push(shellPos);
  }
  
  // Number of full pattern repeats that fit in the duration
  const patternDuration = patternLength * eighthNote;
  const repeatCount = Math.floor(duration / patternDuration);
  
  // Schedule all percussion sounds
  for (let repeat = 0; repeat < repeatCount; repeat++) {
    const patternStartTime = startTime + (repeat * patternDuration);
    
    // Schedule deep drums
    deepDrumPattern.forEach((hit, index) => {
      if (hit) {
        const time = patternStartTime + (index * eighthNote);
        // Add slight timing and volume variation for humanization
        const timeVar = (Math.random() * 0.02) - 0.01; // ±10ms variation
        const volVar = 0.5 + (Math.random() * 0.2); // 0.5-0.7 volume 
        playPercussion('deepDrum', time + timeVar, volVar);
      }
    });
    
    // Schedule wood blocks
    woodBlockPattern.forEach((hit, index) => {
      if (hit) {
        const time = patternStartTime + (index * eighthNote);
        const timeVar = (Math.random() * 0.01) - 0.005; // ±5ms variation
        const volVar = 0.4 + (Math.random() * 0.2); // 0.4-0.6 volume
        playPercussion('woodBlock', time + timeVar, volVar);
      }
    });
    
    // Schedule rattles
    rattlePattern.forEach((hit, index) => {
      if (hit) {
        const time = patternStartTime + (index * eighthNote);
        const timeVar = (Math.random() * 0.015) - 0.0075; // ±7.5ms variation
        const volVar = 0.3 + (Math.random() * 0.15); // 0.3-0.45 volume
        playPercussion('rattle', time + timeVar, volVar);
      }
    });
    
    // Schedule shell sounds
    shellPositions.forEach(pos => {
      const time = patternStartTime + (pos * eighthNote);
      playPercussion('shell', time, 0.35);
    });
  }
}

/**
 * Generate a pentatonic melody using typical Mesoamerican scales
 * @param baseFrequency - Base frequency for the scale
 * @param duration - Total duration in seconds
 * @param bpm - Beats per minute
 * @param complexity - Melodic complexity (0-1)
 */
export function generatePentatonicMelody(
  baseFrequency: number = 261.63, // C4
  duration: number = 8,
  bpm: number = 90,
  complexity: number = 0.5
): void {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime;
  const quarterNote = 60 / bpm;
  
  // Define a pentatonic scale (typical of many ancient cultures)
  // Using ratios: 1, 9/8, 5/4, 3/2, 5/3, 2 (approximating a pentatonic minor scale)
  const pentatonicRatios = [1, 1.125, 1.25, 1.5, 1.875, 2];
  const pentatonicScale = pentatonicRatios.map(ratio => baseFrequency * ratio);
  
  // Determine note density based on complexity (more complex = more notes)
  const noteDensity = 0.3 + (complexity * 0.5); // 0.3-0.8 notes per beat
  
  // Calculate total beats in the duration
  const totalBeats = Math.floor(duration / quarterNote);
  
  // Generate a melody pattern with rest probabilities
  for (let beat = 0; beat < totalBeats; beat++) {
    // Determine if we play a note on this beat
    if (Math.random() < noteDensity) {
      // Choose a note from the scale, with lower notes being more common
      let noteIndex;
      const r = Math.random();
      
      if (r < 0.3) {
        // 30% chance of root note
        noteIndex = 0;
      } else if (r < 0.5) {
        // 20% chance of fifth
        noteIndex = 3; 
      } else {
        // 50% chance of other notes
        noteIndex = Math.floor(Math.random() * pentatonicScale.length);
      }
      
      const noteFrequency = pentatonicScale[noteIndex];
      
      // Determine note duration (longer notes are less common)
      const durationMultiplier = Math.random() < 0.7 ? 1 : 2; // 70% single beat, 30% double
      const noteDuration = quarterNote * durationMultiplier;
      
      // Add slight pitch variance for authentic feel (ancient instruments weren't perfectly tuned)
      const pitchVariance = 1 + ((Math.random() * 0.04) - 0.02); // ±2% pitch variance
      
      // Schedule the note
      playFlute(
        noteFrequency * pitchVariance, 
        noteDuration * 0.9, // Slightly shorter than full duration for separation
        startTime + (beat * quarterNote),
        0.2 + (Math.random() * 0.1) // 0.2-0.3 volume
      );
      
      // If we chose a longer note, skip the next beat
      if (durationMultiplier > 1) {
        beat++;
      }
    }
  }
}

/**
 * Generate sustained ambient flute layer
 * @param baseFrequency - Base frequency
 * @param duration - Duration in seconds
 * @param intensity - Sound intensity (0-1)
 */
export function generateAmbientFluteLayer(
  baseFrequency: number = 220, // A3
  duration: number = 15,
  intensity: number = 0.3
): void {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime;
  
  // Define scale ratios (pentatonic minor)
  const scaleRatios = [1, 1.2, 1.5, 1.8, 2.0, 2.4, 3.0];
  
  // Number of ambient notes to play over the duration
  const noteCount = 2 + Math.floor(intensity * 4); // 2-6 notes based on intensity
  
  // Calculate spacing between notes
  const noteSpacing = duration / noteCount;
  
  // Play sustained, overlapping flute notes
  for (let i = 0; i < noteCount; i++) {
    // Choose a note from the scale
    const ratioIndex = Math.floor(Math.random() * scaleRatios.length);
    const noteFreq = baseFrequency * scaleRatios[ratioIndex];
    
    // Calculate note timing
    const noteTime = startTime + (i * noteSpacing);
    
    // Make notes overlap by having longer duration than spacing
    const noteDuration = noteSpacing * (1.5 + Math.random());
    
    // Lower volume for ambient background effect
    const noteVolume = 0.1 + (intensity * 0.1); // 0.1-0.2 based on intensity
    
    // Play the note
    playFlute(noteFreq, noteDuration, noteTime, noteVolume);
  }
}

/**
 * Generate ambient nature sounds
 * @param duration - Duration in seconds
 * @param intensity - Sound intensity (0-1)
 */
export function generateAmbientNatureSounds(
  duration: number = 15,
  intensity: number = 0.3
): void {
  const ctx = getAudioContext();
  const masterGain = getMasterGain();
  const startTime = ctx.currentTime;
  
  // Create noise source for wind/forest ambient sound
  const bufferSize = ctx.sampleRate * duration;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  // Fill the buffer with noise
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  // Create noise source
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  
  // Apply filter for nature-like sound
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 500 + (intensity * 500); // 500-1000Hz depending on intensity
  filter.Q.value = 1 - (intensity * 0.5); // Narrower band at higher intensity
  
  // Create gain node for volume control
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  
  // Connect nodes
  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);
  
  // Fade in and out
  const fadeTime = 2;
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.05 * intensity, startTime + fadeTime);
  gainNode.gain.setValueAtTime(0.05 * intensity, startTime + duration - fadeTime);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
  
  // Start and stop
  noise.start(startTime);
  noise.stop(startTime + duration);
  
  // Add occasional bird/animal calls if intensity is high enough
  if (intensity > 0.4) {
    const callCount = Math.floor(intensity * 5); // 2-5 calls depending on intensity
    
    for (let i = 0; i < callCount; i++) {
      const callTime = startTime + (Math.random() * (duration - 4)) + 2; // Avoid edges
      
      // Random type of call
      if (Math.random() < 0.5) {
        // Bird-like whistle
        const birdFreq = 800 + (Math.random() * 700); // 800-1500Hz
        playFlute(birdFreq, 0.3, callTime, 0.1);
      } else {
        // Animal-like sound
        const freq = 200 + (Math.random() * 100); // 200-300Hz
        
        // Create oscillator
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        
        // Volume envelope
        oscGain.gain.setValueAtTime(0, callTime);
        oscGain.gain.linearRampToValueAtTime(0.07, callTime + 0.05);
        oscGain.gain.linearRampToValueAtTime(0, callTime + 0.3);
        
        // Frequency modulation
        osc.frequency.setValueAtTime(freq * 1.2, callTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.8, callTime + 0.3);
        
        // Start and stop
        osc.start(callTime);
        osc.stop(callTime + 0.4);
      }
    }
  }
}

// ===========================================================================
// MUSIC CONTEXT GENERATORS
// ===========================================================================

/**
 * Play procedurally generated exploration music
 * @param intensity - Intensity level (0-1)
 * @param duration - Duration in seconds (will loop if needed)
 */
export function playExplorationMusic(intensity: number = 0.4, duration: number = 30): void {
  const ctx = getAudioContext();
  
  // Base tempo varies slightly with intensity
  const bpm = 70 + (intensity * 20); // 70-90 BPM
  
  // Base scale frequency - use low register for calmer exploration music
  const baseFrequency = 220; // A3
  
  // Generate percussion pattern with moderate complexity
  generatePercussionRhythm(bpm, duration, 0.3 + (intensity * 0.4)); // 0.3-0.7 complexity
  
  // Generate melody with complexity based on intensity
  setTimeout(() => {
    generatePentatonicMelody(baseFrequency, duration - 1, bpm, 0.3 + (intensity * 0.3));
  }, 1000); // Start melody 1 second after percussion for a nice intro
  
  // Add ambient background sounds
  generateAmbientFluteLayer(baseFrequency / 2, duration, intensity * 0.6);
  
  // Add nature sounds if low intensity (representing peaceful exploration)
  if (intensity < 0.5) {
    generateAmbientNatureSounds(duration, (0.5 - intensity) * 0.8);
  }
}

/**
 * Play procedurally generated combat music
 * @param intensity - Intensity level (0-1)
 * @param duration - Duration in seconds (will loop if needed)
 */
export function playCombatMusic(intensity: number = 0.7, duration: number = 30): void {
  const ctx = getAudioContext();
  
  // Faster tempo for combat
  const bpm = 90 + (intensity * 30); // 90-120 BPM
  
  // Base scale frequency - slightly higher register for tension
  const baseFrequency = 261.63; // C4
  
  // Generate more complex percussion pattern for combat
  generatePercussionRhythm(bpm, duration, 0.5 + (intensity * 0.5)); // 0.5-1.0 complexity
  
  // Add powerful shell horn calls for battle signals
  const shellCallCount = 1 + Math.floor(intensity * 3); // 1-4 calls depending on intensity
  
  for (let i = 0; i < shellCallCount; i++) {
    const callTime = ctx.currentTime + (i * (duration / shellCallCount));
    setTimeout(() => {
      playPercussion('shell', undefined, 0.4 + (intensity * 0.3)); // 0.4-0.7 volume
    }, callTime * 1000);
  }
  
  // Generate more active melody with higher complexity
  setTimeout(() => {
    generatePentatonicMelody(baseFrequency, duration - 0.5, bpm, 0.5 + (intensity * 0.5));
  }, 500); // Start melody 0.5 second after percussion for urgency
  
  // Add second melody layer for more complexity if high intensity
  if (intensity > 0.6) {
    setTimeout(() => {
      // Use fifth above for harmony
      generatePentatonicMelody(baseFrequency * 1.5, duration - 1, bpm, intensity * 0.7);
    }, 1500);
  }
}

/**
 * Play procedurally generated ceremonial/victory music
 * @param isVictory - Whether this is victory (true) or defeat (false) music
 * @param duration - Duration in seconds
 */
export function playCeremonialMusic(isVictory: boolean = true, duration: number = 20): void {
  const ctx = getAudioContext();
  
  // Ceremonial tempo
  const bpm = isVictory ? 80 : 60;
  
  // Base frequency - higher for victory, lower for defeat
  const baseFrequency = isVictory ? 293.66 : 220; // D4 or A3
  
  // For victory music, start with shell horns
  if (isVictory) {
    // Shell horn fanfare
    playPercussion('shell', ctx.currentTime, 0.5);
    playPercussion('shell', ctx.currentTime + 1.2, 0.6);
    playPercussion('shell', ctx.currentTime + 2.4, 0.7);
    
    // Victory rhythm with high complexity
    setTimeout(() => {
      generatePercussionRhythm(bpm, duration - 3, 0.8);
    }, 3000);
    
    // Victory melody with high complexity
    setTimeout(() => {
      generatePentatonicMelody(baseFrequency, duration - 4, bpm, 0.9);
    }, 4000);
    
    // Add second melody layer for harmony
    setTimeout(() => {
      generatePentatonicMelody(baseFrequency * 1.5, duration - 5, bpm, 0.7);
    }, 5000);
  } 
  // For defeat, more somber music
  else {
    // Minimal somber rhythm
    generatePercussionRhythm(bpm, duration, 0.3);
    
    // Slow, descending melody
    setTimeout(() => {
      const ctx = getAudioContext();
      const startTime = ctx.currentTime;
      
      // Play descending notes
      const defeatNotes = [
        baseFrequency * 1.5,
        baseFrequency * 1.25,
        baseFrequency * 1.125,
        baseFrequency
      ];
      
      defeatNotes.forEach((freq, index) => {
        playFlute(freq, 2.5, startTime + (index * 2.7), 0.4);
      });
      
      // Add ambient low drone
      generateAmbientFluteLayer(baseFrequency / 2, duration, 0.5);
    }, 1000);
  }
}

/**
 * Simple implementation to demonstrate the API
 */
export function playSimpleAncientTrack(bpm: number = 90): void {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime;
  const eighthNoteTime = (60 / bpm) / 2;

  // Percussion pattern
  const percussionPattern = ['deepDrum', null, 'woodBlock', 'rattle'];

  percussionPattern.forEach((instrument, index) => {
    if (instrument) {
      playPercussion(instrument as 'deepDrum' | 'woodBlock' | 'rattle' | 'shell', 
        startTime + index * eighthNoteTime, 0.5);
    }
  });

  // Simple pentatonic melody
  const melodyNotes = [440, 523.25, 587.33, 659.25, 783.99]; // A4 pentatonic example
  melodyNotes.forEach((freq, idx) => {
    playFlute(freq, 1, startTime + idx * (eighthNoteTime * 4), 0.3);
  });
}