// Programmatic Sound Synthesis using Web Audio API (100% self-contained, works offline)

let audioCtx = null;
let isSoundEnabled = false;

export const setSoundEnabled = (enabled) => {
  isSoundEnabled = enabled;
  // Initialize audio context if enabled and not already initialized
  if (isSoundEnabled && !audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
};

export const getSoundEnabled = () => {
  return isSoundEnabled;
};

// Play footstep: tiny thud noise burst
export const playFootstep = () => {
  if (!isSoundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const t = audioCtx.currentTime;
    
    // Create oscillator
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(60, t); // Low pitch thud
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, t);

    gainNode.gain.setValueAtTime(0.015, t); // Very soft footsteps
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  } catch (err) {
    console.error("Audio footstep failed:", err);
  }
};

// Play a cute cat meow
export const playMeow = () => {
  if (!isSoundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const t = audioCtx.currentTime;
    
    // Triangle wave oscillator for a soft, woodwind-like vocal sound
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    // Cat meow frequency sweep (upsweep then down-decay)
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.45);

    // Bandpass filter to shape the vowel character (formant)
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
    filter.frequency.exponentialRampToValueAtTime(700, t + 0.45);
    filter.Q.setValueAtTime(2, t);

    // Amplitude envelope
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.05, t + 0.06); // Soft rise
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); // Fade out

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.5);
  } catch (err) {
    console.error("Audio meow failed:", err);
  }
};

// Play continuous purring sound for 3 seconds
export const playPurr = (duration = 3) => {
  if (!isSoundEnabled) return null;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const t = audioCtx.currentTime;

    // Carrier oscillator: Low frequency rumble (28Hz)
    const carrier = audioCtx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(28, t);

    // Modulator oscillator: 16Hz amplitude oscillation to simulate purring pulses
    const modulator = audioCtx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(16, t);

    const modulatorGain = audioCtx.createGain();
    modulatorGain.gain.setValueAtTime(0.5, t); // Depth of purr modulation

    // Node to modulate volume
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.06, t);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration); // Fade out at the end

    // Modulate the carrier amplitude
    modulator.connect(modulatorGain);
    modulatorGain.connect(gainNode.gain);

    carrier.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    modulator.start(t);
    carrier.start(t);

    modulator.stop(t + duration);
    carrier.stop(t + duration);

    return {
      stop: () => {
        try {
          modulator.stop();
          carrier.stop();
        } catch {}
      }
    };
  } catch (err) {
    console.error("Audio purr failed:", err);
    return null;
  }
};
