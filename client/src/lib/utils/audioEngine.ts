/**
 * Enhanced Procedural Music Engine for Book of Mormon / Polytopia Style Game
 *
 * Generates dynamic, atmospheric background music using the Web Audio API,
 * inspired by ancient themes, epic narratives, and strategy game dynamics.
 *
 * Features:
 * - Improved percussion synthesis (Deep Drums, Slit Drums, Rattles, Shell Horns, Metal Clangs)
 * - Expressive wind instruments (Flutes, Majestic Horns)
 * - Atmospheric drones and pads
 * - Realistic plucked string simulation (Karplus-Strong inspired)
 * - Advanced procedural rhythm and melody generation using varied scales/modes
 * - Dynamic layering and intensity based on game context (Exploration, Combat, Ceremonial)
 * - Global reverb for atmospheric depth
 */

// ===========================================================================
// CORE AUDIO SETUP & UTILITIES
// ===========================================================================

let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let reverbNode: ConvolverNode | null = null;
let reverbGainNode: GainNode | null = null;
let isReverbSetup = false;

/**
 * Get or create the global AudioContext.
 * Attempts to resume the context if suspended.
 */
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      setupReverb(); // Setup reverb when context is created
    } catch (e) {
      console.error('Web Audio API is not supported in this browser:', e);
      // Provide a mock context for environments without Web Audio
      audioContext = {
        currentTime: 0,
        destination: null as any, // Mock destination
        sampleRate: 44100, // Mock sample rate
        createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {}, type: 'sine', frequency: { value: 440, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }) as any,
        createGain: () => ({ connect: () => {}, gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, cancelScheduledValues: () => {} } }) as any,
        createBiquadFilter: () => ({ connect: () => {}, type: 'lowpass', frequency: { value: 1000 }, Q: { value: 1 } }) as any,
        createDelay: () => ({ connect: () => {}, delayTime: { value: 0 } }) as any,
        createBufferSource: () => ({ connect: () => {}, start: () => {}, stop: () => {}, buffer: null, loop: false }) as any,
        createConvolver: () => ({ connect: () => {}, buffer: null }) as any,
        createBuffer: (channels: number, length: number, sampleRate: number) => ({ getChannelData: () => new Float32Array(length), sampleRate, length, numberOfChannels: channels }) as any,
        decodeAudioData: async () => ({}) as any, // Mock decode
        resume: async () => {}, // Mock resume
        state: 'running', // Mock state
      } as unknown as AudioContext;
       console.warn("Using mock AudioContext. No sound will be produced.");
    }
  }

  // Attempt to resume the context if it's suspended (due to browser autoplay policies)
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(err => {
      console.warn('Could not resume audio context automatically:', err);
      // Inform user they might need to interact with the page
    });
  }

  return audioContext;
}

/**
 * Get or create the master gain node for overall volume control.
 */
export function getMasterGain(): GainNode {
  const ctx = getAudioContext();
  if (!ctx.destination) return ctx.createGain(); // Return mock gain if context is mock

  if (!masterGainNode) {
    masterGainNode = ctx.createGain();
    // Connect master gain to destination *if* reverb is not setup,
    // otherwise connect through reverb later in setupReverb.
    if (!reverbNode) {
         masterGainNode.connect(ctx.destination);
    }
    masterGainNode.gain.setValueAtTime(0.6, ctx.currentTime); // Default master volume
  }
  return masterGainNode;
}

/**
 * Creates an impulse response buffer for the reverb effect.
 * Uses generated noise to create a simple algorithmic reverb sound.
 */
function createReverbImpulseResponse(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 2; // 2 seconds reverb tail
    const impulse = ctx.createBuffer(2, length, sampleRate); // Stereo
    const decay = 5; // Exponential decay rate

    for (let channel = 0; channel < 2; channel++) {
        const noise = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            // Exponentially decaying noise
            noise[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }
    return impulse;
}

/**
 * Sets up the global reverb effect using a ConvolverNode.
 */
function setupReverb(): void {
    const ctx = getAudioContext();
    if (!ctx.destination || isReverbSetup) return; // Don't setup if mock or already done

    try {
        const masterGain = getMasterGain(); // Ensure master gain exists

        reverbNode = ctx.createConvolver();
        reverbNode.buffer = createReverbImpulseResponse(ctx);

        reverbGainNode = ctx.createGain();
        reverbGainNode.gain.setValueAtTime(0.4, ctx.currentTime); // Adjust wetness of reverb

        // Routing: MasterGain -> Destination (Dry)
        //         MasterGain -> ReverbGain -> Reverb -> Destination (Wet)
        masterGain.connect(ctx.destination); // Dry signal path
        masterGain.connect(reverbGainNode); // Send to reverb
        reverbGainNode.connect(reverbNode);
        reverbNode.connect(ctx.destination); // Wet signal path

        isReverbSetup = true;
        console.log("Reverb setup complete.");
    } catch(e) {
        console.error("Failed to set up reverb:", e);
        // Fallback: Ensure master gain is connected directly if reverb fails
        const masterGain = getMasterGain();
        if(masterGain && ctx.destination && !masterGain.numberOfOutputs) { // Crude check if already connected elsewhere
             masterGain.connect(ctx.destination);
        }
    }
}

/**
 * Set the master volume level.
 * @param volume - Volume level (0 to 1)
 */
export function setMasterVolume(volume: number): void {
  const gain = getMasterGain();
  const ctx = getAudioContext();
  if (!ctx.destination) return; // Exit if mock context

  const clampedVolume = Math.max(0, Math.min(1, volume));
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(clampedVolume, ctx.currentTime + 0.1); // Smooth transition
}

/**
 * Set the reverb wetness level.
 * @param wetness - Reverb wet level (0 to 1)
 */
export function setReverbWetness(wetness: number): void {
    const ctx = getAudioContext();
    if (!reverbGainNode || !ctx.destination) return;

    const clampedWetness = Math.max(0, Math.min(1, wetness));
    reverbGainNode.gain.cancelScheduledValues(ctx.currentTime);
    reverbGainNode.gain.setValueAtTime(reverbGainNode.gain.value, ctx.currentTime);
    reverbGainNode.gain.linearRampToValueAtTime(clampedWetness, ctx.currentTime + 0.1);
}

// Utility function for frequency from MIDI note number
function midiToFreq(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Utility function for random number in range
function randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

// ===========================================================================
// INSTRUMENT IMPLEMENTATION - ENHANCED SOUNDS
// ===========================================================================

interface PlaySoundOptions {
  time?: number;
  volume?: number;
  duration?: number; // Optional duration for sounds that have it
  pitch?: number; // Optional pitch/frequency control
}

/**
 * Master function to play percussion sounds with enhanced synthesis.
 * @param type - Percussion type
 * @param options - Playback options (time, volume)
 */
export function playPercussion(
  type: 'deepDrum' | 'slitDrum' | 'rattle' | 'shellHorn' | 'metalClang' | 'stoneHit',
  options: PlaySoundOptions = {}
): void {
  const ctx = getAudioContext();
  if (!ctx.destination) return; // Exit if mock context
  const masterGain = getMasterGain();
  const now = ctx.currentTime;
  const time = options.time !== undefined ? options.time : now;
  const volume = options.volume !== undefined ? options.volume : 0.7;

  const outputGain = ctx.createGain();
  outputGain.connect(masterGain);
  outputGain.gain.setValueAtTime(0, time); // Start silent

  switch (type) {
    case 'deepDrum': // Huehuetl - More resonant and powerful
      const drumFreq = 60 + Math.random() * 20; // Base 60-80 Hz
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(drumFreq * 1.8, time);
      osc.frequency.exponentialRampToValueAtTime(drumFreq, time + 0.05); // Faster pitch drop

      const noise = ctx.createBufferSource();
      const bufferSize = ctx.sampleRate * 0.5; // 0.5s noise buffer
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2); // Decaying noise
      }
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(300, time);
      noiseFilter.Q.setValueAtTime(1, time);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, time); // Mix noise level

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(outputGain);
      osc.connect(outputGain);

      // Envelope
      outputGain.gain.linearRampToValueAtTime(volume, time + 0.01); // Sharp attack
      outputGain.gain.exponentialRampToValueAtTime(volume * 0.3, time + 0.3); // Body
      outputGain.gain.linearRampToValueAtTime(0.001, time + 0.8); // Longer release

      osc.start(time);
      osc.stop(time + 1);
      noise.start(time);
      noise.stop(time + 1);
      break;

    case 'slitDrum': // Teponaztli - Woodier, more distinct pitch
      const slitFreq = 180 + Math.random() * 80; // 180-260 Hz range
      const slitOsc = ctx.createOscillator();
      slitOsc.type = 'sine'; // Sine fundamental

      const overtonesOsc = ctx.createOscillator();
      overtonesOsc.type = 'triangle'; // Add some harmonic content
      overtonesOsc.frequency.setValueAtTime(slitFreq * (2 + Math.random() * 0.5), time); // Higher overtone

      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.3, time); // Mix level for overtones

      const slitFilter = ctx.createBiquadFilter();
      slitFilter.type = 'bandpass';
      slitFilter.frequency.setValueAtTime(slitFreq * 1.5, time); // Resonant frequency
      slitFilter.Q.setValueAtTime(8 + Math.random() * 4, time); // Higher Q for woody resonance

      slitOsc.frequency.setValueAtTime(slitFreq * 1.1, time); // Slight pitch bend down
      slitOsc.frequency.exponentialRampToValueAtTime(slitFreq, time + 0.1);

      // Connections
      slitOsc.connect(slitFilter);
      overtonesOsc.connect(overtoneGain);
      overtoneGain.connect(slitFilter);
      slitFilter.connect(outputGain);

      // Envelope
      outputGain.gain.linearRampToValueAtTime(volume * 0.8, time + 0.005); // Very fast attack
      outputGain.gain.exponentialRampToValueAtTime(0.001, time + 0.4 + Math.random() * 0.3); // Faster decay

      slitOsc.start(time);
      slitOsc.stop(time + 0.8);
      overtonesOsc.start(time);
      overtonesOsc.stop(time + 0.8);
      break;

    case 'rattle': // Ayacachtli - Crisper, more dynamic
      const rattleNoise = ctx.createBufferSource();
      const rattleBufSize = ctx.sampleRate * 0.4;
      const rattleBuf = ctx.createBuffer(1, rattleBufSize, ctx.sampleRate);
      const rattleData = rattleBuf.getChannelData(0);
      for (let i = 0; i < rattleBufSize; i++) {
        rattleData[i] = Math.random() * 2 - 1; // White noise
      }
      rattleNoise.buffer = rattleBuf;
      rattleNoise.loop = true; // Loop for potential sustained rattle

      const rattleFilter = ctx.createBiquadFilter();
      rattleFilter.type = 'bandpass';
      rattleFilter.frequency.setValueAtTime(4000 + Math.random() * 2000, time); // Higher freq focus
      rattleFilter.Q.setValueAtTime(3 + Math.random(), time); // Moderate Q

      rattleNoise.connect(rattleFilter);
      rattleFilter.connect(outputGain);

      // Dynamic envelope for 'shake' effect
      const numBursts = 3 + Math.floor(Math.random() * 3);
      const burstDur = 0.03;
      const totalDur = 0.15 + Math.random() * 0.1;
      outputGain.gain.setValueAtTime(0, time);
      for (let i = 0; i < numBursts; i++) {
           const burstTime = time + (i / numBursts) * totalDur * 0.8; // Spread bursts
           const peakVol = volume * (0.5 + Math.random() * 0.5);
           outputGain.gain.linearRampToValueAtTime(peakVol, burstTime + burstDur * 0.2);
           outputGain.gain.exponentialRampToValueAtTime(peakVol * 0.1, burstTime + burstDur);
      }
       outputGain.gain.setValueAtTime(outputGain.gain.value, time + totalDur); // Hold last value briefly
       outputGain.gain.linearRampToValueAtTime(0.0001, time + totalDur + 0.05); // Fade out


      rattleNoise.start(time);
      rattleNoise.stop(time + totalDur + 0.1);
      break;

    case 'shellHorn': // Atecoçolli - More majestic, brassy tone
      const hornFreq = 140 + Math.random() * 40; // Lower, broader range: 140-180 Hz
      const hornOsc1 = ctx.createOscillator();
      hornOsc1.type = 'sawtooth'; // Brighter fundamental
      hornOsc1.frequency.value = hornFreq;

      const hornOsc2 = ctx.createOscillator();
      hornOsc2.type = 'square'; // Add body
      hornOsc2.frequency.value = hornFreq * 0.995; // Slight detune for thickness

      const hornFilter = ctx.createBiquadFilter();
      hornFilter.type = 'lowpass';
      hornFilter.frequency.setValueAtTime(600, time); // Start darker
      hornFilter.frequency.linearRampToValueAtTime(1200, time + 0.2); // Open up filter
      hornFilter.frequency.linearRampToValueAtTime(800, time + 0.8); // Close slightly
      hornFilter.Q.setValueAtTime(4, time); // Resonant peak

      hornOsc1.connect(hornFilter);
      hornOsc2.connect(hornFilter);
      hornFilter.connect(outputGain);

       // Pitch bend for 'blowing' effect
      hornOsc1.frequency.setValueAtTime(hornFreq * 0.95, time);
      hornOsc1.frequency.linearRampToValueAtTime(hornFreq * 1.02, time + 0.15);
      hornOsc1.frequency.linearRampToValueAtTime(hornFreq, time + 0.6);
      hornOsc2.frequency.setValueAtTime(hornFreq * 0.995 * 0.95, time); // Keep detune consistent
      hornOsc2.frequency.linearRampToValueAtTime(hornFreq * 0.995 * 1.02, time + 0.15);
      hornOsc2.frequency.linearRampToValueAtTime(hornFreq * 0.995, time + 0.6);


      // Volume envelope
      outputGain.gain.linearRampToValueAtTime(volume * 0.8, time + 0.1); // Slower attack
      outputGain.gain.setValueAtTime(volume * 0.8, time + 0.6);
      outputGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2); // Longer decay

      hornOsc1.start(time);
      hornOsc1.stop(time + 1.3);
      hornOsc2.start(time);
      hornOsc2.stop(time + 1.3);
      break;

      case 'metalClang': // For tool/weapon/armor sounds - Polytopia influence
          const clangNoise = ctx.createBufferSource();
          const clangBufSize = ctx.sampleRate * 1.5; // Longer potential ring
          const clangBuf = ctx.createBuffer(1, clangBufSize, ctx.sampleRate);
          const clangData = clangBuf.getChannelData(0);
          for (let i = 0; i < clangBufSize; i++) {
              clangData[i] = Math.random() * 2 - 1; // White noise
          }
          clangNoise.buffer = clangBuf;

          const clangGain = ctx.createGain();
          clangGain.gain.setValueAtTime(volume, time + 0.001); // Instant attack
          clangGain.gain.exponentialRampToValueAtTime(volume * 0.1, time + 0.3);
          clangGain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2 + Math.random()); // Long, variable decay

          // Multiple bandpass filters for metallic resonance
          const freqs = [600, 1100, 1800, 2500, 3500];
          const filterGain = 1.0 / freqs.length; // Normalize gain

          freqs.forEach(f => {
              const filter = ctx.createBiquadFilter();
              filter.type = 'bandpass';
              filter.frequency.value = f * (0.9 + Math.random() * 0.2); // Slight variation
              filter.Q.value = 15 + Math.random() * 10; // High Q
              const gainNode = ctx.createGain();
              gainNode.gain.value = filterGain;

              clangNoise.connect(filter);
              filter.connect(gainNode);
              gainNode.connect(clangGain); // Connect filtered noise to the gain envelope
          });

           clangGain.connect(outputGain); // Connect main envelope gain to output (already connected to master)

          clangNoise.start(time);
          clangNoise.stop(time + 1.5 + Math.random());
          break;

       case 'stoneHit': // Dull thud, rock impact
            const stoneNoise = ctx.createBufferSource();
            const stoneBufSize = ctx.sampleRate * 0.3;
            const stoneBuf = ctx.createBuffer(1, stoneBufSize, ctx.sampleRate);
            const stoneData = stoneBuf.getChannelData(0);
            for (let i = 0; i < stoneBufSize; i++) {
                stoneData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / stoneBufSize, 1.5); // Decaying noise
            }
            stoneNoise.buffer = stoneBuf;

            const stoneFilter = ctx.createBiquadFilter();
            stoneFilter.type = 'lowpass';
            stoneFilter.frequency.value = 400; // Low cutoff
            stoneFilter.Q.value = 2;

            stoneNoise.connect(stoneFilter);
            stoneFilter.connect(outputGain);

            // Envelope
            outputGain.gain.linearRampToValueAtTime(volume, time + 0.005); // Fast attack
            outputGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15 + Math.random() * 0.1); // Short, dull decay

            stoneNoise.start(time);
            stoneNoise.stop(time + 0.3);
            break;


    default:
      console.warn(`Unknown percussion type: ${type}`);
      break;
  }
}


/**
 * Play a richer wind instrument sound (Flute/Ocarina).
 * @param noteFrequency - Frequency to play.
 * @param options - Playback options (duration, time, volume).
 */
export function playWindInstrument(
  noteFrequency: number,
  options: PlaySoundOptions = {}
): void {
  const ctx = getAudioContext();
   if (!ctx.destination) return;
  const masterGain = getMasterGain();
  const now = ctx.currentTime;
  const time = options.time !== undefined ? options.time : now;
  const volume = options.volume !== undefined ? options.volume : 0.4;
  const duration = options.duration !== undefined ? options.duration : 1.0;

  const outputGain = ctx.createGain();
  outputGain.connect(masterGain);

  // Main tone oscillator (mix sine and triangle for richness)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = noteFrequency;

  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = noteFrequency * 1.005; // Slight detune

  const osc2Gain = ctx.createGain();
  osc2Gain.gain.value = 0.4; // Mix level for triangle wave

  // Breath noise component
  const noise = ctx.createBufferSource();
  const bufferSize = ctx.sampleRate * 0.5; // Short buffer, will be looped
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;
  noise.loop = true;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = noteFrequency * 1.8; // Higher frequency noise
  noiseFilter.Q.value = 0.8;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.0; // Start breath noise quiet

  // Vibrato LFO
  const vibrato = ctx.createOscillator();
  vibrato.type = 'sine';
  vibrato.frequency.value = randomRange(4, 6); // Natural vibrato speed

  const vibratoGain = ctx.createGain();
  vibratoGain.gain.value = noteFrequency * 0.015; // Vibrato depth

  // Connections
  osc1.connect(outputGain);
  osc2.connect(osc2Gain);
  osc2Gain.connect(outputGain);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(outputGain); // Mix breath noise into the output

  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc1.frequency); // Modulate frequency of osc1
  vibratoGain.connect(osc2.frequency); // Modulate frequency of osc2

  // Envelopes
  const attackTime = 0.08 + Math.random() * 0.05;
  const releaseTime = 0.1 + Math.random() * 0.1;
  const sustainLevel = volume * 0.8;

  outputGain.gain.setValueAtTime(0, time);
  outputGain.gain.linearRampToValueAtTime(volume, time + attackTime); // Attack
  outputGain.gain.setValueAtTime(volume, time + duration - releaseTime); // Sustain point
  outputGain.gain.linearRampToValueAtTime(0, time + duration); // Release

  // Breath noise envelope (follows main volume but slightly delayed and softer)
  noiseGain.gain.setValueAtTime(0, time);
  noiseGain.gain.linearRampToValueAtTime(0.015, time + attackTime + 0.05); // Slightly later attack for noise
  noiseGain.gain.setValueAtTime(0.015, time + duration - releaseTime);
  noiseGain.gain.linearRampToValueAtTime(0, time + duration);

  // Subtle pitch bend at start
  const bendAmount = 1.01;
  osc1.frequency.setValueAtTime(noteFrequency / bendAmount, time);
  osc1.frequency.linearRampToValueAtTime(noteFrequency, time + attackTime * 1.5);
  osc2.frequency.setValueAtTime((noteFrequency * 1.005) / bendAmount, time); // Keep detuning consistent
  osc2.frequency.linearRampToValueAtTime(noteFrequency * 1.005, time + attackTime * 1.5);

  // Start and stop
  osc1.start(time);
  osc2.start(time);
  noise.start(time);
  vibrato.start(time);

  const stopTime = time + duration + 0.1; // Allow fade out
  osc1.stop(stopTime);
  osc2.stop(stopTime);
  noise.stop(stopTime);
  vibrato.stop(stopTime);
}

/**
 * Play a more majestic Horn sound (different from shell horn).
 * @param noteFrequency - Frequency to play.
 * @param options - Playback options (duration, time, volume).
 */
export function playHorn(
  noteFrequency: number,
  options: PlaySoundOptions = {}
): void {
  const ctx = getAudioContext();
   if (!ctx.destination) return;
  const masterGain = getMasterGain();
  const now = ctx.currentTime;
  const time = options.time !== undefined ? options.time : now;
  const volume = options.volume !== undefined ? options.volume : 0.6;
  const duration = options.duration !== undefined ? options.duration : 1.5;

  const outputGain = ctx.createGain();
  outputGain.connect(masterGain);

  // Use multiple detuned sawtooth waves for a brassy sound
  const numOscs = 3;
  const detuneAmount = 0.006; // Relative detune

  for (let i = 0; i < numOscs; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      // Detune calculation: center, slightly sharp, slightly flat
      const detuneFactor = 1 + (i - Math.floor(numOscs / 2)) * detuneAmount;
      const oscFreq = noteFrequency * detuneFactor;
      osc.frequency.value = oscFreq;

      // Pitch bend for expressive attack
      osc.frequency.setValueAtTime(oscFreq * 0.97, time);
      osc.frequency.linearRampToValueAtTime(oscFreq * 1.01, time + 0.1);
      osc.frequency.linearRampToValueAtTime(oscFreq, time + 0.3);

      osc.connect(outputGain);
      osc.start(time);
      osc.stop(time + duration + 0.2); // Stop slightly after envelope finishes
  }

  // Low-pass filter to shape the tone
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(noteFrequency * 3, time); // Start relatively open
  filter.frequency.linearRampToValueAtTime(noteFrequency * 5, time + 0.2); // Brighten during attack
  filter.frequency.exponentialRampToValueAtTime(noteFrequency * 2.5, time + duration); // Darken slightly over duration
  filter.Q.value = 1.5;

  // Connect the gain node to the filter, then filter to master gain
  // Need to modify the loop above slightly: connect oscillators to a pre-filter gain
  const preFilterGain = ctx.createGain();
  // Re-do oscillator connection from above
  outputGain.disconnect(); // Disconnect direct connection
  outputGain.connect(filter); // Connect output gain -> filter
  filter.connect(masterGain); // Connect filter -> master

  // Volume Envelope
  const attack = 0.15;
  const release = 0.3;
  outputGain.gain.setValueAtTime(0, time);
  outputGain.gain.linearRampToValueAtTime(volume, time + attack);
  outputGain.gain.setValueAtTime(volume, time + duration - release);
  outputGain.gain.linearRampToValueAtTime(0, time + duration);

  // Start oscillators (done in the loop above)
}


/**
 * Play a plucked string sound using Karplus-Strong approximation.
 * @param noteFrequency - Frequency to play.
 * @param options - Playback options (duration, time, volume).
 */
export function playPluckedString(
  noteFrequency: number,
  options: PlaySoundOptions = {}
): void {
  const ctx = getAudioContext();
   if (!ctx.destination) return;
  const masterGain = getMasterGain();
  const now = ctx.currentTime;
  const time = options.time !== undefined ? options.time : now;
  const volume = options.volume !== undefined ? options.volume : 0.5;
  // Duration is implicit in Karplus-Strong decay

  // Karplus-Strong: Burst of noise into a filtered delay loop
  const delayTime = 1.0 / noteFrequency;
  const decayFactor = 0.985 + Math.random() * 0.01; // How quickly it decays (higher = longer)

  const outputGain = ctx.createGain();
  outputGain.connect(masterGain);

  const noise = ctx.createBufferSource();
  const bufferSize = Math.ceil(delayTime * ctx.sampleRate * 2); // Short noise burst
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;

  const delay = ctx.createDelay(delayTime * 1.5); // Max delay slightly longer
  delay.delayTime.value = delayTime;

  const feedback = ctx.createGain();
  feedback.gain.value = decayFactor;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  // Damping: higher frequencies decay faster, typical of strings
  filter.frequency.value = noteFrequency * 3 + Math.random() * noteFrequency * 2;

  // Routing: Noise -> Filter -> Delay -> Feedback -> Filter (loop)
  //         Delay -> OutputGain
  noise.connect(filter);
  filter.connect(delay);
  delay.connect(feedback);
  feedback.connect(filter); // Feedback loop

  delay.connect(outputGain); // Output from the delay line

  // Volume control - mainly controlling the initial burst level
  outputGain.gain.setValueAtTime(volume * 1.5, time); // Initial pluck louder
   // Karplus strong decay is natural, but add a safety fade
   outputGain.gain.exponentialRampToValueAtTime(0.001, time + 2.5); // Fade out over 2.5s max


  noise.start(time);
  noise.stop(time + bufferSize / ctx.sampleRate); // Stop noise after initial burst

  // Clean up nodes after sound has faded (important for performance)
   setTimeout(() => {
       try {
            outputGain.disconnect();
            delay.disconnect();
            feedback.disconnect();
            filter.disconnect();
       } catch(e){
           // Ignore errors if nodes already disconnected
       }
   }, (time - ctx.currentTime + 3) * 1000); // 3 seconds after start time

}

/**
 * Play a sustained, atmospheric drone/pad sound.
 * @param noteFrequency - Base frequency for the drone.
 * @param options - Playback options (duration, time, volume).
 */
export function playDronePad(
  noteFrequency: number,
  options: PlaySoundOptions = {}
): void {
    const ctx = getAudioContext();
     if (!ctx.destination) return;
    const masterGain = getMasterGain();
    const now = ctx.currentTime;
    const time = options.time !== undefined ? options.time : now;
    const volume = options.volume !== undefined ? options.volume : 0.2;
    const duration = options.duration !== undefined ? options.duration : 8.0;

    const outputGain = ctx.createGain();
    outputGain.connect(masterGain);

    // Multiple detuned oscillators for a thick, evolving sound
    const numOscs = 4;
    const maxDetune = 4; // Cents

    for(let i=0; i<numOscs; i++) {
        const osc = ctx.createOscillator();
        osc.type = Math.random() < 0.6 ? 'sine' : 'triangle'; // Mix waveforms
        // Calculate detuning in cents
        const detuneCents = (Math.random() * 2 - 1) * maxDetune;
        osc.detune.value = detuneCents; // Apply detuning
        osc.frequency.value = noteFrequency;

        // Slow LFO modulation for frequency variation (shimmer)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = randomRange(0.1, 0.5); // Very slow LFO

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = randomRange(1, 3); // Subtle pitch modulation depth (Hz)

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency); // Modulate frequency slightly

        osc.connect(outputGain);
        osc.start(time);
        lfo.start(time);

        osc.stop(time + duration + 1.0); // Stop after fade out
        lfo.stop(time + duration + 1.0);
    }

    // Gentle low-pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = noteFrequency * 4; // Allow harmonics
    filter.Q.value = 0.5;
    // Reconnect outputGain through filter
    outputGain.disconnect();
    outputGain.connect(filter);
    filter.connect(masterGain);


    // Volume Envelope (slow attack and release)
    const attack = duration * 0.3;
    const release = duration * 0.4;
    outputGain.gain.setValueAtTime(0, time);
    outputGain.gain.linearRampToValueAtTime(volume, time + attack);
    outputGain.gain.setValueAtTime(volume, time + duration - release);
    outputGain.gain.linearRampToValueAtTime(0, time + duration);

}


// ===========================================================================
// MUSICAL STRUCTURE & GENERATION
// ===========================================================================

// Define some scales/modes common in ancient/folk music
type ScaleType = 'majorPentatonic' | 'minorPentatonic' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian';

function getScaleRatios(type: ScaleType): number[] {
  switch (type) {
    case 'majorPentatonic': return [1, 9/8, 5/4, 3/2, 5/3]; // C, D, E, G, A
    case 'minorPentatonic': return [1, 6/5, 4/3, 3/2, 9/5]; // C, Eb, F, G, Bb (approx)
    case 'phrygian':        return [1, 16/15, 5/4, 3/2, 8/5, 9/5]; // C, Db, E, G, Ab, Bb (using 6 notes for flavor)
    case 'lydian':          return [1, 9/8, 5/4, 45/32, 3/2, 5/3]; // C, D, E, F#, G, A (using 6 notes)
    case 'mixolydian':      return [1, 9/8, 5/4, 3/2, 5/3, 9/5]; // C, D, E, G, A, Bb (using 6 notes)
    case 'aeolian':         return [1, 9/8, 6/5, 4/3, 3/2, 8/5]; // C, D, Eb, F, G, Ab (using 6 notes)
    default:                return [1, 9/8, 5/4, 3/2, 5/3]; // Default to Major Pentatonic
  }
}

interface RhythmGenerationOptions {
    bpm?: number;
    duration?: number; // in seconds
    complexity?: number; // 0-1
    timeSignature?: [number, number]; // e.g., [4, 4]
}

/**
 * Generate more dynamic and varied percussion rhythms.
 * @param instruments - Array of percussion types to potentially use.
 * @param options - Rhythm parameters.
 */
export function generatePercussionRhythm(
    instruments: ('deepDrum' | 'slitDrum' | 'rattle' | 'metalClang' | 'stoneHit' | 'shellHorn')[],
    options: RhythmGenerationOptions = {}
): void {
    const ctx = getAudioContext();
     if (!ctx.destination) return;
    const startTime = ctx.currentTime;
    const bpm = options.bpm ?? 90;
    const duration = options.duration ?? 8;
    const complexity = options.complexity ?? 0.5;
    const timeSignature = options.timeSignature ?? [4, 4]; // e.g., 4/4 time

    const beatsPerMeasure = timeSignature[0];
    const subdivisionValue = timeSignature[1]; // Usually 4 (quarter note)
    const quarterNoteTime = 60 / bpm;
    const beatTime = quarterNoteTime * (4 / subdivisionValue); // Duration of one beat
    const measureTime = beatsPerMeasure * beatTime;
    const totalMeasures = Math.ceil(duration / measureTime);

    // Define probabilities based on complexity and instrument type
    const prob = {
        deepDrum: 0.1 + complexity * 0.4, // More frequent on downbeats
        slitDrum: 0.2 + complexity * 0.5, // Syncopation
        rattle: 0.1 + complexity * 0.6, // Fills
        metalClang: 0.05 + complexity * 0.2, // Accents
        stoneHit: 0.1 + complexity * 0.3, // Secondary rhythm
        shellHorn: 0.02 + complexity * 0.1 // Sparsely used for impact
    };

    const subdivisions = 16; // Use 16th notes for finer rhythmic detail
    const subdivisionTime = beatTime / (subdivisions / (subdivisionValue / 2)); // time per 16th note

    for (let measure = 0; measure < totalMeasures; measure++) {
        const measureStartTime = startTime + measure * measureTime;

        for (let sub = 0; sub < beatsPerMeasure * (subdivisions / (subdivisionValue/2)); sub++) {
            const time = measureStartTime + sub * subdivisionTime;
            if (time >= startTime + duration) break; // Stop if duration exceeded

            const beatInMeasure = (sub * subdivisionTime) / beatTime;

            // Select instrument based on probability and rhythmic position
            instruments.forEach(instrument => {
                let currentProb = prob[instrument] ?? 0;

                // Adjust probability based on beat position
                if (instrument === 'deepDrum') {
                    // Higher chance on beat 1 and beat 3 (in 4/4)
                    if (sub % (subdivisions / (subdivisionValue / 2)) === 0) currentProb *= 2.5; // Downbeat
                    if (beatsPerMeasure === 4 && sub % (subdivisions / (subdivisionValue / 2)) === (subdivisions / (subdivisionValue / 2)) * (beatsPerMeasure / 2)) currentProb *= 1.8; // Mid-measure beat
                } else if (instrument === 'slitDrum' || instrument === 'stoneHit') {
                    // Higher chance on off-beats
                     if (sub % (subdivisions / (subdivisionValue / 2)) !== 0) currentProb *= 1.5;
                } else if (instrument === 'rattle'){
                    // Slightly higher chance on faster subdivisions
                    if (sub % 2 !== 0) currentProb *= 1.2;
                }

                // Add random chance
                if (Math.random() < currentProb / subdivisions * 4 ) { // Normalize probability somewhat
                    // Humanization: timing and volume variation
                    const timeVar = (Math.random() * 0.04) - 0.02; // +/- 20ms
                    const volVar = 0.6 + Math.random() * 0.4; // 0.6 - 1.0 volume scale

                    playPercussion(instrument, {
                        time: time + timeVar,
                        volume: volVar * (prob[instrument] ?? 0.7) // Base volume scaled by type probability
                    });
                }
            });
        }
    }
}

interface MelodyGenerationOptions {
    baseFrequency?: number;
    duration?: number; // seconds
    bpm?: number;
    complexity?: number; // 0-1 (affects note density, range, rhythm)
    scaleType?: ScaleType;
    instrument?: 'wind' | 'horn' | 'string'; // Choice of melodic instrument
    octaveRange?: number; // How many octaves above baseFrequency to use
}

/**
 * Generate a procedural melody with more musicality.
 * @param options - Melody generation parameters.
 */
export function generateMelody(options: MelodyGenerationOptions = {}): void {
    const ctx = getAudioContext();
     if (!ctx.destination) return;
    const startTime = ctx.currentTime;
    const baseFrequency = options.baseFrequency ?? midiToFreq(60); // Default C4
    const duration = options.duration ?? 8;
    const bpm = options.bpm ?? 90;
    const complexity = options.complexity ?? 0.5;
    const scaleType = options.scaleType ?? 'minorPentatonic';
    const instrumentChoice = options.instrument ?? 'wind';
    const octaveRange = options.octaveRange ?? 2;

    const quarterNoteTime = 60 / bpm;
    const scaleRatios = getScaleRatios(scaleType);
    const scaleFrequencies: number[] = [];

    // Populate scale frequencies across the octave range
    for (let octave = 0; octave < octaveRange; octave++) {
        scaleRatios.forEach(ratio => {
            scaleFrequencies.push(baseFrequency * Math.pow(2, octave) * ratio);
        });
    }
    // Remove duplicates and sort
    const uniqueFrequencies = [...new Set(scaleFrequencies)].sort((a, b) => a - b);

    let currentTime = startTime;
    let lastNoteIndex = Math.floor(uniqueFrequencies.length / 3); // Start somewhere in the lower-middle range

    while (currentTime < startTime + duration) {
        // Determine note duration based on complexity (longer notes for less complex)
        const rhythmComplexity = Math.random();
        let noteDuration: number;
        if (rhythmComplexity < 0.4 - complexity * 0.3) {
            noteDuration = quarterNoteTime * 2; // Half note
        } else if (rhythmComplexity < 0.8 - complexity * 0.2) {
            noteDuration = quarterNoteTime; // Quarter note
        } else {
            noteDuration = quarterNoteTime / 2; // Eighth note
        }

        // Determine rest probability (more rests for lower complexity)
        const restProbability = 0.3 - complexity * 0.25;
        if (Math.random() < restProbability && currentTime > startTime) { // Don't start with a rest
            currentTime += noteDuration;
            continue; // Skip playing a note
        }

        // Choose the next note index - prefer steps or small leaps
        const stepRange = 1 + Math.floor(complexity * 3); // Max step size increases with complexity
        let nextNoteIndex;
        // Simple contour logic: tend to move towards root or fifth, allow bigger jumps occasionally
        if (Math.random() < 0.7) {
            // Stepwise motion or small leap
             nextNoteIndex = lastNoteIndex + Math.floor(randomRange(-stepRange, stepRange + 1));
        } else {
             // Larger leap - maybe towards root or an octave
             const targetIndex = (Math.random() < 0.5) ? 0 : Math.floor(Math.random() * uniqueFrequencies.length);
             nextNoteIndex = targetIndex;
        }

        // Clamp index within bounds
        nextNoteIndex = Math.max(0, Math.min(uniqueFrequencies.length - 1, nextNoteIndex));

        const noteFrequency = uniqueFrequencies[nextNoteIndex];
        lastNoteIndex = nextNoteIndex;

        // Add slight tuning imperfection
        const pitchVariance = 1.0 + (Math.random() * 0.01 - 0.005); // +/- 0.5% variance

        // Play the note with the selected instrument
        const playOptions: PlaySoundOptions = {
            time: currentTime,
            duration: noteDuration * 0.9, // Leave slight gap between notes
            volume: 0.3 + complexity * 0.3 + Math.random() * 0.1, // Volume based on complexity + randomness
        };

        switch (instrumentChoice) {
            case 'wind':
                playWindInstrument(noteFrequency * pitchVariance, playOptions);
                break;
            case 'horn':
                playHorn(noteFrequency * pitchVariance, playOptions);
                break;
            case 'string':
                // Plucked string duration is inherent, don't pass explicit duration
                 playPluckedString(noteFrequency * pitchVariance, { time: currentTime, volume: playOptions.volume });
                 break;
        }

        // Advance time
        currentTime += noteDuration;
    }
}


// ===========================================================================
// CONTEXTUAL MUSIC GENERATORS - More Distinct Styles
// ===========================================================================

interface MusicContextOptions {
    intensity?: number; // 0-1, general intensity/complexity
    duration?: number; // seconds
    theme?: 'nephite' | 'lamanite' | 'genericAncient' | 'ambient'; // Potential future expansion
}

/**
 * Generate ambient nature sounds like rustling, birds, water, etc.
 * @param duration - Duration of the ambient sounds in seconds
 * @param volume - Volume level for the ambient sounds
 */
export function generateAmbientNatureSounds(duration: number = 30, volume: number = 0.5): void {
    const ctx = getAudioContext();
    if (!ctx.destination) return;
    
    // Create a few different ambient nature sounds randomly spaced
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            // Randomly choose between bird, water, or rustling sounds
            const soundType = Math.random() < 0.33 ? 'bird' : 
                             Math.random() < 0.66 ? 'water' : 'rustle';
            
            if (soundType === 'bird') {
                // Bird chirp
                const noteFreq = 1200 + Math.random() * 1000;
                playWindInstrument(noteFreq, {
                    volume: volume * 0.4,
                    duration: 0.1 + Math.random() * 0.2
                });
            } else if (soundType === 'water') {
                // Water sound (white noise based)
                const waterNode = ctx.createOscillator();
                const whiteNoise = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                
                filter.type = 'lowpass';
                filter.frequency.value = 600;
                filter.Q.value = 2;
                
                whiteNoise.gain.value = volume * 0.3;
                
                const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < ctx.sampleRate; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                
                const noiseSource = ctx.createBufferSource();
                noiseSource.buffer = noiseBuffer;
                noiseSource.loop = true;
                
                noiseSource.connect(filter);
                filter.connect(whiteNoise);
                whiteNoise.connect(ctx.destination);
                
                noiseSource.start();
                setTimeout(() => {
                    noiseSource.stop();
                }, 1000 + Math.random() * 1500);
            } else {
                // Rustling sound (filtered noise)
                playPercussion('rattle', {
                    volume: volume * 0.3,
                    duration: 0.8 + Math.random() * 0.5
                });
            }
        }, i * 1000 + Math.random() * 3000);
    }
}

/**
 * Generate ambient flute layer with slow, evolving notes
 * @param baseFrequency - Base frequency for the flute sounds
 * @param duration - Duration of the ambient layer in seconds 
 * @param volume - Volume level for the ambient layer
 */
export function generateAmbientFluteLayer(baseFrequency: number = 220, duration: number = 30, volume: number = 0.3): void {
    const ctx = getAudioContext();
    if (!ctx.destination) return;
    
    // Generate a series of gentle, spaced flute notes
    const scaleNotes = [1, 1.2, 1.33, 1.5, 1.66, 2];
    
    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            // Select a note from our scale
            const noteIndex = Math.floor(Math.random() * scaleNotes.length);
            const noteFreq = baseFrequency * scaleNotes[noteIndex];
            
            // Play the note with the wind instrument
            playWindInstrument(noteFreq, {
                volume: volume * (0.5 + Math.random() * 0.5),
                duration: 1.5 + Math.random() * 2
            });
        }, i * 4000 + Math.random() * 2000);
    }
}

/**
 * Play atmospheric, evolving exploration music.
 * Focus: Drones, sparse percussion, wind instruments, slower tempo.
 */
export function playExplorationMusic(options: MusicContextOptions = {}): void {
    const ctx = getAudioContext();
     if (!ctx.destination) return;
    const intensity = options.intensity ?? 0.3;
    const duration = options.duration ?? 45; // Longer default duration
    const bpm = 65 + intensity * 20; // Slow: 65-85 BPM
    const baseFreq = midiToFreq(55 + Math.floor(intensity * 5)); // A3 - D4 range

    console.log(`Playing Exploration Music: Intensity=${intensity.toFixed(2)}, BPM=${bpm}, BaseFreq=${baseFreq.toFixed(2)}Hz`);


    // 1. Ambient Drone Layer
    playDronePad(baseFreq / 2, { // Low root drone
        duration: duration * 0.8 + Math.random() * (duration * 0.2), // Slightly variable length
        volume: 0.15 + intensity * 0.1,
        time: ctx.currentTime + randomRange(0, 2) // Stagger start times
    });
    // Add a second drone on the fifth sometimes
     if (intensity > 0.4 && Math.random() < 0.6) {
         playDronePad(baseFreq * 1.5 / 2 , { // Low fifth drone
            duration: duration * 0.7 + Math.random() * (duration * 0.2),
            volume: 0.1 + intensity * 0.1,
             time: ctx.currentTime + randomRange(1, 3)
        });
     }


    // 2. Sparse Percussion
    generatePercussionRhythm(
        ['deepDrum', 'slitDrum', 'rattle', 'stoneHit'], // Focus on organic sounds
        {
            bpm: bpm,
            duration: duration,
            complexity: 0.1 + intensity * 0.3, // Keep percussion simple
            timeSignature: [4, 4]
        }
    );

    // 3. Melodic Elements (Wind Instruments) - Delayed start
    setTimeout(() => {
        generateMelody({
            baseFrequency: baseFreq,
            duration: duration * 0.7, // Melody doesn't run the whole time
            bpm: bpm,
            complexity: 0.2 + intensity * 0.4, // Melody complexity tied to intensity
            scaleType: Math.random() < 0.5 ? 'minorPentatonic' : 'majorPentatonic', // Mix of scales
            instrument: 'wind',
            octaveRange: 1 + Math.floor(intensity * 1.5) // Expand range slightly with intensity
        });
    }, randomRange(4000, 8000)); // Delay melody start 4-8 seconds

    // Add occasional plucked string accent
     if (intensity > 0.5 && Math.random() < 0.5) {
          setTimeout(() => {
            generateMelody({
                 baseFrequency: baseFreq,
                duration: duration * 0.4,
                bpm: bpm,
                complexity: intensity * 0.3,
                scaleType: 'majorPentatonic',
                instrument: 'string',
                octaveRange: 1
            });
         }, randomRange(10000, 15000));
     }

     // Optional: Very subtle nature sounds (if needed, implement separately)
     // generateAmbientNatureSounds(duration, 0.1 + intensity * 0.1);
}


/**
 * Play dynamic, driving combat music.
 * Focus: Faster tempo, complex rhythms, horns, metallic percussion, more tension.
 */
export function playCombatMusic(options: MusicContextOptions = {}): void {
    const ctx = getAudioContext();
     if (!ctx.destination) return;
    const intensity = options.intensity ?? 0.7;
    const duration = options.duration ?? 40;
    const bpm = 95 + intensity * 45; // Faster: 95-140 BPM
    const baseFreq = midiToFreq(60 + Math.floor(intensity * 7)); // C4 - G4 range

     console.log(`Playing Combat Music: Intensity=${intensity.toFixed(2)}, BPM=${bpm}, BaseFreq=${baseFreq.toFixed(2)}Hz`);

    // 1. Driving Percussion - use more aggressive sounds
    generatePercussionRhythm(
        ['deepDrum', 'slitDrum', 'metalClang', 'stoneHit', 'shellHorn'], // Include metal and horns
        {
            bpm: bpm,
            duration: duration,
            complexity: 0.4 + intensity * 0.6, // High complexity
            timeSignature: [4, 4] // Could experiment with other time signatures for tension
        }
    );

    // 2. Tense Melodic Elements (Horns & Winds) - Start sooner
    setTimeout(() => {
        generateMelody({
            baseFrequency: baseFreq,
            duration: duration * 0.9,
            bpm: bpm,
            complexity: 0.5 + intensity * 0.5, // More active melody
            // Use scales with more tension (Phrygian, Aeolian) mixed with Pentatonic
            scaleType: Math.random() < 0.4 ? 'phrygian' : (Math.random() < 0.7 ? 'minorPentatonic' : 'aeolian'),
            instrument: Math.random() < 0.6 ? 'horn' : 'wind', // Favor horns
            octaveRange: 2
        });
    }, randomRange(500, 1500)); // Start melody quickly

    // 3. Add a secondary, possibly dissonant layer if high intensity
    if (intensity > 0.6) {
        setTimeout(() => {
            generateMelody({
                // Offset base frequency slightly for tension, maybe a tritone or minor second?
                 baseFrequency: baseFreq * (Math.random() < 0.5 ? 1.06 : 1.414), // Minor second or tritone relation
                 duration: duration * 0.6,
                bpm: bpm,
                complexity: intensity * 0.4, // Simpler counter-melody/texture
                 scaleType: Math.random() < 0.5 ? 'phrygian' : 'minorPentatonic',
                instrument: 'wind', // Use wind for contrast
                octaveRange: 1
            });
         }, randomRange(5000, 10000)); // Delay the second layer
    }

    // 4. Add sustained tension drone if intensity is very high
    if (intensity > 0.8) {
        playDronePad(baseFreq * (Math.random() < 0.5 ? 0.75 : 1.25), { // Low fourth or high third (relative)
             duration: duration * 0.5,
            volume: 0.1 + intensity * 0.15,
            time: ctx.currentTime + randomRange(3, 6)
        });
    }
}

/**
 * Play ceremonial music (Victory or Defeat).
 * Focus: Majestic horns/drums for victory, somber drones/flutes for defeat.
 */
export function playCeremonialMusic(isVictory: boolean = true, options: MusicContextOptions = {}): void {
    const ctx = getAudioContext();
    if (!ctx.destination) return;
    const intensity = options.intensity ?? (isVictory ? 0.8 : 0.4); // Victory usually higher intensity
    const duration = options.duration ?? 25;

    if (isVictory) {
        // --- VICTORY ---
        const bpm = 80 + intensity * 15; // Moderate, stately tempo: 80-95 BPM
        const baseFreq = midiToFreq(62 + Math.floor(intensity * 5)); // D4 - G4 range, brighter keys
        const quarterNoteTime = 60 / bpm; // Duration of a quarter note in seconds
        console.log(`Playing Victory Music: Intensity=${intensity.toFixed(2)}, BPM=${bpm}, BaseFreq=${baseFreq.toFixed(2)}Hz`);


        // Fanfare start
        playPercussion('shellHorn', { time: ctx.currentTime + 0.1, volume: 0.7 });
        playHorn(baseFreq * 1.5, { time: ctx.currentTime + 0.5, duration: 2.0, volume: 0.6 }); // Horn playing fifth
        playHorn(baseFreq * 2, { time: ctx.currentTime + 1.0, duration: 1.8, volume: 0.65 }); // Horn playing octave
        playPercussion('metalClang', { time: ctx.currentTime + 1.5, volume: 0.5 }); // Add a bright clang


        // Stately percussion starts after fanfare
         setTimeout(() => {
             generatePercussionRhythm(
                ['deepDrum', 'metalClang', 'shellHorn'], // Focus on strong, bright sounds
                {
                    bpm: bpm,
                    duration: duration - 3,
                    complexity: 0.6 + intensity * 0.3, // Regal complexity
                    timeSignature: [4, 4]
                }
            );
        }, 3000);

        // Majestic Melody (Horns primarily)
        setTimeout(() => {
            generateMelody({
                baseFrequency: baseFreq,
                duration: duration - 4,
                bpm: bpm,
                complexity: 0.6 + intensity * 0.3,
                // Use brighter scales
                scaleType: Math.random() < 0.6 ? 'majorPentatonic' : 'lydian',
                instrument: 'horn',
                octaveRange: 2
            });
        }, 4000);

        // Supporting Wind/String layer
         setTimeout(() => {
             generateMelody({
                 baseFrequency: baseFreq,
                duration: duration - 6,
                bpm: bpm,
                complexity: intensity * 0.5,
                scaleType: 'majorPentatonic',
                instrument: Math.random() < 0.5 ? 'wind' : 'string',
                octaveRange: 1
             });
        }, 6000);

    } else {
        // --- DEFEAT ---
        const bpm = 55 + intensity * 10; // Very slow: 55-65 BPM
        const baseFreq = midiToFreq(51 + Math.floor(intensity * 5)); // Eb3 - Ab3 range, somber keys
        const quarterNoteTime = 60 / bpm; // Duration of a quarter note in seconds
        console.log(`Playing Defeat Music: Intensity=${intensity.toFixed(2)}, BPM=${bpm}, BaseFreq=${baseFreq.toFixed(2)}Hz`);

        // Low Drone
        playDronePad(baseFreq / 2, {
            duration: duration * 0.9,
            volume: 0.2 + intensity * 0.2,
            time: ctx.currentTime + 1.0
        });
          // Add dissonant drone
         if(intensity > 0.3) {
             playDronePad(baseFreq * 1.06 / 2, { // Minor second relation low drone
                duration: duration * 0.7,
                volume: 0.1 + intensity * 0.15,
                time: ctx.currentTime + 3.0
            });
         }

        // Sparse, heavy percussion
        setTimeout(() => {
            generatePercussionRhythm(
                ['deepDrum', 'stoneHit'], // Heavy, dull sounds
                {
                    bpm: bpm,
                    duration: duration - 2,
                    complexity: 0.1 + intensity * 0.2, // Very sparse
                    timeSignature: [4, 4]
                }
            );
        }, 2000);


        // Slow, descending Melancholy Melody (Wind)
        setTimeout(() => {
            generateMelody({
                baseFrequency: baseFreq,
                duration: duration - 5,
                bpm: bpm,
                complexity: 0.2 + intensity * 0.3,
                // Use minor/sad scales
                scaleType: Math.random() < 0.6 ? 'aeolian' : 'minorPentatonic',
                instrument: 'wind',
                octaveRange: 1 // Keep melody in a lower, tighter range
            });
            // Add logic here to favor descending patterns if possible within generateMelody,
            // or play specific descending figures manually.
             // Example: Manual descending figure
             const defeatNotes = getScaleRatios(Math.random() < 0.6 ? 'aeolian' : 'minorPentatonic')
                .map(r => baseFreq * r * 2) // Go one octave up from base for melody start
                .sort((a, b) => b - a) // Sort descending
                .slice(0, 4); // Take top 4 notes

             defeatNotes.forEach((freq, index) => {
                 playWindInstrument(freq, {
                    time: ctx.currentTime + 5 + index * (quarterNoteTime * 3), // Play slowly
                    duration: quarterNoteTime * 2.5,
                    volume: 0.3 + intensity * 0.2
                 });
             });


        }, 5000); // Delayed melody start

    }
}

/**
 * Simple function to play a short test sequence demonstrating some sounds.
 */
export function playSoundTestSequence(): void {
    const ctx = getAudioContext();
     if (!ctx.destination) { console.log("Mock context, skipping sound test."); return; }
    const now = ctx.currentTime;
    const t = 0.5; // Time step

    console.log("Playing sound test sequence...");

    playPercussion('deepDrum', { time: now + 0*t });
    playPercussion('slitDrum', { time: now + 1*t, volume: 0.6 });
    playPercussion('rattle', { time: now + 2*t, volume: 0.5 });
    playPercussion('shellHorn', { time: now + 3*t, volume: 0.7 });
    playPercussion('metalClang', { time: now + 4.5*t, volume: 0.5 });
    playPercussion('stoneHit', { time: now + 5.5*t, volume: 0.8 });

    playWindInstrument(midiToFreq(72), { time: now + 6.5*t, duration: 1.0, volume: 0.4 }); // C5
    playHorn(midiToFreq(67), { time: now + 8*t, duration: 1.5, volume: 0.5 }); // G4
    playPluckedString(midiToFreq(64), { time: now + 10*t, volume: 0.6 }); // E4

    playDronePad(midiToFreq(48), { time: now + 11*t, duration: 4.0, volume: 0.2 }); // C3 Drone

    // Test volume control
    setTimeout(() => setMasterVolume(0.8), (now + 14*t - ctx.currentTime) * 1000);
    setTimeout(() => setMasterVolume(0.5), (now + 15*t - ctx.currentTime) * 1000);
     // Test reverb control
     setTimeout(() => setReverbWetness(0.8), (now + 16*t - ctx.currentTime) * 1000);
     setTimeout(() => setReverbWetness(0.3), (now + 17*t - ctx.currentTime) * 1000);
}

// Clean up old function name if it existed elsewhere
export const playSimpleAncientTrack = playSoundTestSequence;