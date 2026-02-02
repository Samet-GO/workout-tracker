let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function playBeep(frequency = 880, duration = 0.15, count = 3) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    for (let i = 0; i < count; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.3;

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const start = now + i * (duration + 0.1);
      oscillator.start(start);
      oscillator.stop(start + duration);
    }
  } catch {
    // Audio not supported or blocked
  }
}
