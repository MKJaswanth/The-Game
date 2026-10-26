let audioContext = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function tone({ frequency, duration = 0.08, type = 'sine', gain = 0.035, delay = 0 }) {
  const context = getContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playSfx(name) {
  switch (name) {
    case 'click': tone({ frequency: 520, duration: 0.045, type: 'square', gain: 0.022 }); break;
    case 'move': tone({ frequency: 290, duration: 0.055, type: 'triangle', gain: 0.028 }); break;
    case 'card': tone({ frequency: 220, duration: 0.07, type: 'square', gain: 0.026 }); break;
    case 'draw': tone({ frequency: 150, duration: 0.1, type: 'sawtooth', gain: 0.018 }); break;
    case 'flap': tone({ frequency: 620, duration: 0.055, type: 'triangle', gain: 0.024 }); break;
    case 'dice': tone({ frequency: 180, duration: 0.06, type: 'square', gain: 0.024 }); tone({ frequency: 300, duration: 0.07, type: 'square', gain: 0.024, delay: 0.07 }); break;
    case 'correct': tone({ frequency: 660, duration: 0.09, type: 'sine', gain: 0.03 }); tone({ frequency: 880, duration: 0.12, type: 'sine', gain: 0.03, delay: 0.08 }); break;
    case 'wrong': tone({ frequency: 180, duration: 0.16, type: 'sawtooth', gain: 0.022 }); break;
    case 'victory': tone({ frequency: 523, duration: 0.12, type: 'triangle', gain: 0.032 }); tone({ frequency: 659, duration: 0.12, type: 'triangle', gain: 0.032, delay: 0.11 }); tone({ frequency: 784, duration: 0.2, type: 'triangle', gain: 0.032, delay: 0.22 }); break;
    case 'buzzer': tone({ frequency: 95, duration: 0.2, type: 'square', gain: 0.022 }); break;
    default: break;
  }
}
