import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import type { LyricLine } from '../../types/cheer';
import { formatSecondsToMMSS } from '../../utils/formatters';

interface KaraokePlayerProps {
  songTitle: string;
  recipientName: string;
  lyrics: LyricLine[];
  audioUrl: string;
  avatarUrl: string;
}

export const KaraokePlayer: React.FC<KaraokePlayerProps> = ({
  songTitle,
  recipientName,
  lyrics,
  audioUrl,
  avatarUrl
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(22); // Default ~22s chant duration
  const [isMuted, setIsMuted] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Sync current lyric line index
      const idx = lyrics.findLastIndex(l => audio.currentTime >= l.time);
      if (idx !== -1 && idx !== currentLineIndex) {
        setCurrentLineIndex(idx);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentLineIndex(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [lyrics, currentLineIndex]);

  // Auto-scroll to active lyric line
  useEffect(() => {
    if (activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentLineIndex]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className="w-full bg-gradient-to-b from-[#003617] to-[#00200A] border-2 border-[#F5A623] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#FFDF00]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#28A745]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Header Info */}
      <div className="flex items-center gap-3">
        {/* Animated Avatar / Record Disc */}
        <div className={`relative w-14 h-14 rounded-full border-2 border-[#FFDF00] p-0.5 ${isPlaying ? 'animate-bounce-head' : ''}`}>
          <img
            src={avatarUrl}
            alt={recipientName}
            className="w-full h-full object-cover rounded-full"
          />
          <div className="absolute -bottom-1 -right-1 bg-[#28A745] text-white p-1 rounded-full text-xs">
            <Sparkles className="w-3 h-3" />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <h4 className="text-base font-black text-[#FFDF00] uppercase truncate tracking-wide">
            {songTitle}
          </h4>
          <p className="text-xs text-white/70 font-semibold">
            Hit riêng dành cho <span className="text-white font-bold">{recipientName}</span>
          </p>
        </div>

        <button
          onClick={toggleMute}
          className="p-2 text-white/70 hover:text-[#FFDF00] rounded-full hover:bg-white/10"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Spotify-Style Karaoke Lyrics Scroller */}
      <div className="w-full h-44 bg-[#001D0B]/80 rounded-2xl p-4 overflow-y-auto flex flex-col items-center gap-3 border border-white/10 shadow-inner scroll-smooth">
        {lyrics.map((line, index) => {
          const isActive = index === currentLineIndex;
          const isPassed = index < currentLineIndex;

          return (
            <motion.p
              key={index}
              ref={isActive ? activeLyricRef : null}
              animate={{
                scale: isActive ? 1.08 : 0.95,
                opacity: isActive ? 1 : isPassed ? 0.6 : 0.4
              }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = line.time;
                  setCurrentTime(line.time);
                }
              }}
              className={`text-center font-extrabold text-base cursor-pointer px-3 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-[#FFDF00] bg-[#005C28]/90 border border-[#28A745] shadow-[0_0_12px_rgba(245,166,35,0.5)] milo-title-shadow'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {line.text}
            </motion.p>
          );
        })}
      </div>

      {/* Dynamic Pop-up Energy Banner when Playing */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="self-center bg-gradient-to-r from-[#28A745] to-[#FFDF00] text-[#002B12] font-black text-xs uppercase px-4 py-1.5 rounded-full shadow-lg border border-white tracking-widest animate-pulse-energy"
          >
            🔥 ENERGY TO FINISH MILO 🔥
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Progress Bar & Time */}
      <div className="flex flex-col gap-1.5">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-[#001D0B] rounded-lg appearance-none cursor-pointer accent-[#FFDF00]"
        />
        <div className="flex justify-between items-center text-xs font-semibold text-white/60 px-1">
          <span>{formatSecondsToMMSS(currentTime)}</span>
          <span>{formatSecondsToMMSS(duration)}</span>
        </div>
      </div>

      {/* Play Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              setCurrentTime(0);
            }
          }}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#28A745] to-[#FFDF00] text-[#002B12] flex items-center justify-center shadow-lg border-2 border-white hover:scale-105 transition-all"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 fill-current" />
          ) : (
            <Play className="w-7 h-7 fill-current ml-1" />
          )}
        </button>
      </div>
    </div>
  );
};
