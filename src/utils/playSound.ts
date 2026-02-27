export type SoundType = "chime" | "coin" | "bell" | "pop";

export const soundOptions: { value: SoundType; label: string }[] = [
  { value: "chime", label: "Chime" },
  { value: "coin", label: "Coin" },
  { value: "bell", label: "Bell" },
  { value: "pop", label: "Pop" },
];

const SAMPLE_RATE = 44100;

interface SynthesizedSound {
  buffer: AudioBuffer;
}

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let cachedSounds: Record<SoundType, SynthesizedSound> | null = null;
let isAudioUnlocked = false;
let pendingSounds: SoundType[] = [];
let isProcessingQueue = false;

const createAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.6;
  }
  return audioContext;
};

const generateSoundBuffer = (type: SoundType, ctx: AudioContext): AudioBuffer => {
  const duration = type === "bell" ? 0.7 : type === "chime" ? 0.5 : type === "coin" ? 0.35 : 0.12;
  const bufferSize = Math.floor(SAMPLE_RATE * duration);
  const buffer = ctx.createBuffer(1, bufferSize, SAMPLE_RATE);
  const data = buffer.getChannelData(0);

  switch (type) {
    case "chime": {
      const freqs = [880, 1109, 1319];
      for (let i = 0; i < bufferSize; i++) {
        let sample = 0;
        const t = i / SAMPLE_RATE;
        for (let j = 0; j < freqs.length; j++) {
          const delay = j * 0.08;
          const tt = t - delay;
          if (tt >= 0 && tt < 0.4) {
            const envelope = Math.exp(-tt * 6) * 0.4;
            sample += Math.sin(2 * Math.PI * freqs[j] * tt) * envelope;
          }
        }
        data[i] = sample;
      }
      break;
    }

    case "coin": {
      for (let i = 0; i < bufferSize; i++) {
        const t = i / SAMPLE_RATE;
        let sample = 0;

        if (t < 0.15) {
          const freq = 988 + (1320 - 988) * (t / 0.1);
          const envelope = Math.exp(-t * 12) * 0.35;
          sample += Math.sin(2 * Math.PI * freq * t) * envelope;
        }

        if (t >= 0.08 && t < 0.35) {
          const t2 = t - 0.08;
          const freq = 1320 + (1760 - 1320) * (t2 / 0.15);
          const envelope = Math.exp(-t2 * 10) * 0.25;
          sample += Math.sin(2 * Math.PI * freq * t2) * envelope;
        }

        data[i] = sample;
      }
      break;
    }

    case "bell": {
      const freqs = [523, 659, 784, 1047];
      for (let i = 0; i < bufferSize; i++) {
        let sample = 0;
        const t = i / SAMPLE_RATE;

        for (let j = 0; j < freqs.length; j++) {
          const envelope = Math.exp(-t * 3.5) * (0.25 / (j + 1));
          sample += Math.sin(2 * Math.PI * freqs[j] * t) * envelope;
        }

        data[i] = sample;
      }
      break;
    }

    case "pop": {
      for (let i = 0; i < bufferSize; i++) {
        const t = i / SAMPLE_RATE;
        const freq = 600 * Math.exp(-t * 25);
        const envelope = Math.exp(-t * 20) * 0.5;
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope;
      }
      break;
    }
  }

  return buffer;
};

const preloadSounds = (): void => {
  if (cachedSounds) return;

  const ctx = createAudioContext();
  cachedSounds = {
    chime: { buffer: generateSoundBuffer("chime", ctx) },
    coin: { buffer: generateSoundBuffer("coin", ctx) },
    bell: { buffer: generateSoundBuffer("bell", ctx) },
    pop: { buffer: generateSoundBuffer("pop", ctx) },
  };
};

const unlockAudio = (): void => {
  if (isAudioUnlocked) return;

  try {
    const ctx = createAudioContext();
    
    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        isAudioUnlocked = true;
        preloadSounds();
        processSoundQueue();
      }).catch(() => {
        isAudioUnlocked = true;
        preloadSounds();
        processSoundQueue();
      });
    } else {
      isAudioUnlocked = true;
      preloadSounds();
      processSoundQueue();
    }
  } catch {
    isAudioUnlocked = true;
    preloadSounds();
    processSoundQueue();
  }
};

const processSoundQueue = (): void => {
  if (isProcessingQueue || pendingSounds.length === 0) return;
  isProcessingQueue = true;

  while (pendingSounds.length > 0) {
    const soundType = pendingSounds.shift();
    if (soundType) {
      playSoundImmediate(soundType);
    }
  }

  isProcessingQueue = false;
};

const playSoundImmediate = (type: SoundType): void => {
  try {
    const ctx = createAudioContext();
    
    if (!cachedSounds) {
      preloadSounds();
    }

    const sound = cachedSounds?.[type];
    if (!sound) return;

    const source = ctx.createBufferSource();
    source.buffer = sound.buffer;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.7;
    
    source.connect(gainNode);
    gainNode.connect(masterGain!);
    
    source.start(0);
  } catch {
    fallbackToSpeech();
  }
};

const fallbackToSpeech = (): void => {
  try {
    const utterance = new SpeechSynthesisUtterance("HIT caught");
    utterance.rate = 1.5;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Silently fail if speech also doesn't work
  }
};

export const setVolume = (volume: number): void => {
  if (masterGain) {
    masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }
};

export const playSound = (soundType: SoundType): void => {
  if (!isAudioUnlocked) {
    pendingSounds.push(soundType);
    unlockAudio();
    return;
  }

  if (pendingSounds.length > 0) {
    pendingSounds.push(soundType);
    processSoundQueue();
    return;
  }

  playSoundImmediate(soundType);
};

export const playChime = (): void => playSound("chime");
export const playCoin = (): void => playSound("coin");
export const playBell = (): void => playSound("bell");
export const playPop = (): void => playSound("pop");

export const announceHitCaught = (soundType: SoundType = "chime"): void => {
  playSound(soundType);
};

export const initAudioContext = (): void => {
  unlockAudio();
};

const setupInteractionListeners = (): void => {
  const unlockOnInteraction = () => {
    unlockAudio();
    document.removeEventListener("click", unlockOnInteraction, true);
    document.removeEventListener("keydown", unlockOnInteraction, true);
    document.removeEventListener("touchstart", unlockOnInteraction, true);
    document.removeEventListener("mousedown", unlockOnInteraction, true);
  };

  document.addEventListener("click", unlockOnInteraction, true);
  document.addEventListener("keydown", unlockOnInteraction, true);
  document.addEventListener("touchstart", unlockOnInteraction, true);
  document.addEventListener("mousedown", unlockOnInteraction, true);
};

if (typeof window !== "undefined") {
  setupInteractionListeners();
}
