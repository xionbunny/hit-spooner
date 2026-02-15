export type SoundType = "chime" | "coin" | "bell" | "pop";

export const soundOptions: { value: SoundType; label: string }[] = [
  { value: "chime", label: "Chime" },
  { value: "coin", label: "Coin" },
  { value: "bell", label: "Bell" },
  { value: "pop", label: "Pop" },
];

const SAMPLE_RATE = 44100;

const generateWavBase64 = (samples: number[]): string => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
    view.setInt16(offset, sample, true);
    offset += 2;
  }
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const generateChimeSound = (): string => {
  const freqs = [880, 1109, 1319];
  const samples: number[] = [];
  const duration = 0.4;
  const totalSamples = Math.floor(SAMPLE_RATE * (duration + 0.2));
  
  for (let i = 0; i < totalSamples; i++) {
    let sample = 0;
    for (let j = 0; j < freqs.length; j++) {
      const delay = j * 0.1;
      const t = i / SAMPLE_RATE - delay;
      if (t >= 0 && t < duration) {
        const envelope = Math.exp(-t * 5) * 0.3;
        sample += Math.sin(2 * Math.PI * freqs[j] * t) * envelope;
      }
    }
    samples.push(sample);
  }
  
  return generateWavBase64(samples);
};

const generateCoinSound = (): string => {
  const samples: number[] = [];
  const duration = 0.35;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    
    if (t < 0.15) {
      const freq = 988 + (1320 - 988) * (t / 0.1);
      const envelope = Math.exp(-t * 10) * 0.25;
      sample += Math.sin(2 * Math.PI * freq * t) * envelope;
    }
    
    if (t >= 0.1 && t < 0.35) {
      const t2 = t - 0.1;
      const freq = 1320 + (1568 - 1320) * (t2 / 0.1);
      const envelope = Math.exp(-t2 * 10) * 0.2;
      sample += Math.sin(2 * Math.PI * freq * t2) * envelope;
    }
    
    samples.push(sample);
  }
  
  return generateWavBase64(samples);
};

const generateBellSound = (): string => {
  const freqs = [523, 659, 784];
  const samples: number[] = [];
  const duration = 0.7;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  
  for (let i = 0; i < totalSamples; i++) {
    let sample = 0;
    const t = i / SAMPLE_RATE;
    
    for (let j = 0; j < freqs.length; j++) {
      const envelope = Math.exp(-t * 3) * 0.2;
      sample += Math.sin(2 * Math.PI * freqs[j] * t) * envelope;
    }
    
    samples.push(sample);
  }
  
  return generateWavBase64(samples);
};

const generatePopSound = (): string => {
  const samples: number[] = [];
  const duration = 0.12;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 400 * Math.exp(-t * 20);
    const envelope = Math.exp(-t * 15) * 0.4;
    samples.push(Math.sin(2 * Math.PI * freq * t) * envelope);
  }
  
  return generateWavBase64(samples);
};

const generateSilentSound = (): string => {
  return generateWavBase64([0, 0, 0, 0]);
};

let cachedSounds: Record<SoundType, string> | null = null;
let silentSoundBase64: string | null = null;

const getSoundBase64 = (type: SoundType): string => {
  if (!cachedSounds) {
    cachedSounds = {
      chime: generateChimeSound(),
      coin: generateCoinSound(),
      bell: generateBellSound(),
      pop: generatePopSound(),
    };
  }
  return cachedSounds[type];
};

const getSilentSound = (): string => {
  if (!silentSoundBase64) {
    silentSoundBase64 = generateSilentSound();
  }
  return silentSoundBase64;
};

let audioUnlocked = false;

const unlockAudio = (): void => {
  if (audioUnlocked) return;
  
  const audio = new Audio(`data:audio/wav;base64,${getSilentSound()}`);
  audio.volume = 0.01;
  audio.play()
    .then(() => { audioUnlocked = true; })
    .catch(() => {});
};

const isAutoplayBlocked = (e: unknown): boolean => {
  if (e instanceof DOMException) {
    return e.name === 'NotAllowedError' || e.name === 'NotSupportedError';
  }
  if (e instanceof Error) {
    return e.name === 'NotAllowedError' || 
           e.message.includes('autoplay') || 
           e.message.includes('user gesture') ||
           e.message.includes('NotAllowedError');
  }
  return false;
};

const DEFAULT_VOLUME = 0.6;

const createAudioPlayer = (type: SoundType): HTMLAudioElement => {
  const audio = new Audio(`data:audio/wav;base64,${getSoundBase64(type)}`);
  audio.volume = DEFAULT_VOLUME;
  return audio;
};

export const playSound = (soundType: SoundType): void => {
  console.log("[HitSpooner] playSound called:", soundType);
  unlockAudio();
  createAudioPlayer(soundType).play().catch(e => {
    if (!isAutoplayBlocked(e)) console.error('[playSound] Play failed:', e);
  });
};

export const playChime = (): void => playSound('chime');
export const playCoin = (): void => playSound('coin');
export const playBell = (): void => playSound('bell');
export const playPop = (): void => playSound('pop');

export const announceHitCaught = (soundType: SoundType = "chime"): void => {
  playSound(soundType);
};

export const initAudioContext = (): void => {
  unlockAudio();
};

if (typeof window !== 'undefined') {
  const unlockOnInteraction = () => unlockAudio();
  document.addEventListener('click', unlockOnInteraction, true);
  document.addEventListener('keydown', unlockOnInteraction, true);
  document.addEventListener('touchstart', unlockOnInteraction, true);
  document.addEventListener('mousedown', unlockOnInteraction, true);
}
