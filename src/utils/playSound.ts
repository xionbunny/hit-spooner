let selectedVoice: SpeechSynthesisVoice | null = null;
let speechRate = 1.2;

export const initSpeech = (): void => {
  if (!("speechSynthesis" in window)) return;
  
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const englishVoice = voices.find(v => v.lang.startsWith('en-') && v.localService);
      selectedVoice = englishVoice || voices[0];
    }
  };

  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
};

export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  if (!("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
};

export const setSpeechVoice = (voiceURI: string): void => {
  const voices = getAvailableVoices();
  selectedVoice = voices.find(v => v.voiceURI === voiceURI) || voices[0];
};

export const setSpeechRate = (rate: number): void => {
  speechRate = Math.max(0.5, Math.min(2, rate));
};

export const getSpeechRate = (): number => speechRate;

export const getCurrentVoiceURI = (): string | null => selectedVoice?.voiceURI || null;

export const testSpeech = (text: string = "Test announcement. This is how HITs will be announced."): void => {
  if (!("speechSynthesis" in window)) {
    console.warn("Text-to-speech not supported");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.rate = speechRate;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
};

export const announceHitCaught = (
  title: string,
  reward: number
): void => {
  if (!("speechSynthesis" in window)) {
    console.warn("Text-to-speech not supported");
    return;
  }

  window.speechSynthesis.cancel();

  const rewardText = reward >= 1 
    ? `${reward.toFixed(2)} dollars` 
    : `${Math.round(reward * 100)} cents`;
  
  const shortenedTitle = title.length > 50 
    ? title.substring(0, 50) + "..." 
    : title;

  const utterance = new SpeechSynthesisUtterance(
    `Caught: ${shortenedTitle}. Pays ${rewardText}.`
  );
  
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.rate = speechRate;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
};

initSpeech();
