'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export function useAudio(src = '/audio/megachad-theme.mp3') {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (localStorage.getItem('megachad-audio-stopped') === 'true') return;

    audio.volume = 0.3;
    audio.muted = true;
    audio.play()
      .then(() => {
        setAudioPlaying(true);
        setTimeout(() => { audio.muted = false; }, 100);
      })
      .catch(() => {});
  }, []);

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioPlaying) {
      audio.pause();
      setAudioPlaying(false);
      localStorage.setItem('megachad-audio-stopped', 'true');
    } else {
      audio.muted = false;
      audio.play()
        .then(() => {
          setAudioPlaying(true);
          localStorage.removeItem('megachad-audio-stopped');
        })
        .catch(() => {});
    }
  }, [audioPlaying]);

  return { audioRef, audioPlaying, toggleAudio, src };
}
