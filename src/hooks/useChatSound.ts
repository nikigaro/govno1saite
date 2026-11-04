import { useCallback, useRef, useState } from 'react';

const MUTED_STORAGE_KEY = 'tredach-chat-sound-muted';
const CHIME_NOTES = [
  { frequency: 1046.5, start: 0, duration: 0.14 },
  { frequency: 1568, start: 0.12, duration: 0.36 },
];
const CHIME_VOLUME = 0.18;

function playChime(context: AudioContext) {
  const origin = context.currentTime;
  for (const note of CHIME_NOTES) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = origin + note.start;
    const noteEnd = noteStart + note.duration;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(note.frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(CHIME_VOLUME, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd);
  }
}

export function useChatSound() {
  const [muted, setMuted] = useState(() => window.localStorage.getItem(MUTED_STORAGE_KEY) === '1');
  const contextRef = useRef<AudioContext | null>(null);

  const toggleMuted = useCallback(() => {
    setMuted((value) => {
      window.localStorage.setItem(MUTED_STORAGE_KEY, value ? '0' : '1');
      return !value;
    });
  }, []);

  const playNotification = useCallback(() => {
    if (muted) return;
    if (!contextRef.current) contextRef.current = new AudioContext();
    const context = contextRef.current;
    if (context.state === 'suspended') void context.resume();
    playChime(context);
  }, [muted]);

  return { muted, toggleMuted, playNotification };
}
