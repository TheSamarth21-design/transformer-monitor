// Haptic Vibration for Mobile Devices & Android APK
export function triggerHapticVibration() {
  try {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      // Emergency vibration rhythm pattern over 10s
      navigator.vibrate([400, 200, 400, 200, 800, 300, 400, 200, 400, 200, 800]);
    }
  } catch {
    // Ignore vibration errors
  }
}

// Synthesized Audio Emergency Warning Siren (Web Audio API)
let audioCtx: AudioContext | null = null;
let currentOscillator: OscillatorNode | null = null;
let currentGain: GainNode | null = null;
let alarmTimeoutId: any = null;

export function playEmergencyAlarmSound(durationSeconds: number = 10) {
  try {
    if (typeof window === "undefined") return;

    // Stop any previously playing siren
    stopEmergencyAlarmSound();

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    currentOscillator = osc;
    currentGain = gain;

    osc.type = "sawtooth";

    const now = audioCtx.currentTime;
    // Oscillate frequency between 880Hz (A5) and 440Hz (A4) over the duration
    for (let i = 0; i < durationSeconds; i += 0.6) {
      osc.frequency.setValueAtTime(880, now + i);
      osc.frequency.exponentialRampToValueAtTime(440, now + i + 0.3);
      osc.frequency.exponentialRampToValueAtTime(880, now + i + 0.6);
    }

    gain.gain.setValueAtTime(0.3, now);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + durationSeconds);

    alarmTimeoutId = setTimeout(() => {
      stopEmergencyAlarmSound();
    }, durationSeconds * 1000);
  } catch {
    // Ignore audio errors
  }
}

export function stopEmergencyAlarmSound() {
  try {
    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      alarmTimeoutId = null;
    }
    if (currentOscillator) {
      currentOscillator.stop();
      currentOscillator.disconnect();
      currentOscillator = null;
    }
    if (currentGain) {
      currentGain.disconnect();
      currentGain = null;
    }
  } catch {
    // Ignore
  }
}
