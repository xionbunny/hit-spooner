export type SoundType = "chime" | "coin" | "bell" | "pop";

export const soundOptions: { value: SoundType; label: string }[] = [
  { value: "chime", label: "Chime" },
  { value: "coin", label: "Coin" },
  { value: "bell", label: "Bell" },
  { value: "pop", label: "Pop" },
];

const sampleRate = 44100;

const generateWavBase64 = (samples: number[]): string => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
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

const generateTone = (
  frequency: number,
  duration: number,
  volume: number = 0.5
): number[] => {
  const samples: number[] = [];
  const numSamples = Math.floor(sampleRate * duration);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 5) * volume;
    samples.push(Math.sin(2 * Math.PI * frequency * t) * envelope);
  }
  
  return samples;
};

const generateChimeSound = (): string => {
  const freqs = [880, 1109, 1319];
  const samples: number[] = [];
  const duration = 0.4;
  const totalSamples = Math.floor(sampleRate * (duration + 0.2));
  
  for (let i = 0; i < totalSamples; i++) {
    let sample = 0;
    for (let j = 0; j < freqs.length; j++) {
      const delay = j * 0.1;
      const t = i / sampleRate - delay;
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
  const numSamples = Math.floor(sampleRate * duration);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
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
  const totalSamples = Math.floor(sampleRate * duration);
  
  for (let i = 0; i < totalSamples; i++) {
    let sample = 0;
    const t = i / sampleRate;
    
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
  const numSamples = Math.floor(sampleRate * duration);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
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
  
  console.log("[playSound] Unlocking audio...");
  const audio = new Audio(`data:audio/wav;base64,${getSilentSound()}`);
  audio.volume = 0.01;
  audio.play()
    .then(() => {
      audioUnlocked = true;
      console.log("[playSound] Audio unlocked successfully");
    })
    .catch((e) => {
      console.log("[playSound] Audio unlock failed:", e.message);
    });
};

export const playChime = (): void => {
  unlockAudio();
  const audio = new Audio(`data:audio/wav;base64,${getSoundBase64('chime')}`);
  audio.volume = 0.6;
  audio.play().catch(e => console.error('[playSound] Chime play failed:', e));
};

export const playCoin = (): void => {
  unlockAudio();
  const audio = new Audio(`data:audio/wav;base64,${getSoundBase64('coin')}`);
  audio.volume = 0.6;
  audio.play().catch(e => console.error('[playSound] Coin play failed:', e));
};

export const playBell = (): void => {
  unlockAudio();
  const audio = new Audio(`data:audio/wav;base64,${getSoundBase64('bell')}`);
  audio.volume = 0.6;
  audio.play().catch(e => console.error('[playSound] Bell play failed:', e));
};

export const playPop = (): void => {
  unlockAudio();
  const audio = new Audio(`data:audio/wav;base64,${getSoundBase64('pop')}`);
  audio.volume = 0.6;
  audio.play().catch(e => console.error('[playSound] Pop play failed:', e));
};

export const playSound = (soundType: SoundType): void => {
  console.log("[playSound] Playing sound:", soundType, "audioUnlocked:", audioUnlocked);
  unlockAudio();
  const audio = new Audio(`data:audio/wav;base64,${getSoundBase64(soundType)}`);
  audio.volume = 0.6;
  audio.play().catch(e => console.error('[playSound] Play failed:', e));
};

export const announceHitCaught = (soundType: SoundType = "chime"): void => {
  console.log("[playSound] announceHitCaught called with soundType:", soundType);
  playSound(soundType);
};

export const initAudioContext = (): void => {
  unlockAudio();
};

if (typeof window !== 'undefined') {
  const unlockOnInteraction = () => {
    unlockAudio();
  };
  
  document.addEventListener('click', unlockOnInteraction, true);
  document.addEventListener('keydown', unlockOnInteraction, true);
  document.addEventListener('touchstart', unlockOnInteraction, true);
  document.addEventListener('mousedown', unlockOnInteraction, true);
}
