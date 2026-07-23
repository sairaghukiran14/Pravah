'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Volume1, Download, Loader2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  autoPlay = false,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sync state when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);

    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [src]);

  // Format seconds to MM:SS
  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Audio playback failed:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetVolume = parseFloat(e.target.value);
    setVolume(targetVolume);
    setIsMuted(targetVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = targetVolume;
      audioRef.current.muted = targetVolume === 0;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
    if (!nextMute && volume === 0) {
      setVolume(0.8);
      audioRef.current.volume = 0.8;
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = src.split('/').pop() || 'audio-output.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex items-center gap-3 py-2 px-3.5 rounded-xl border border-gray-200 bg-gray-50/70 backdrop-blur-xs shadow-xs transition-all duration-200 hover:border-gray-300 w-full ${className}`}>
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={src}
        autoPlay={autoPlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onDurationChange={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            setIsLoading(false);
          }
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading && duration === 0}
        className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-xs"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading && duration === 0 ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>

      {/* Time display */}
      <div className="text-xs font-mono text-gray-500 select-none min-w-[76px] text-center shrink-0">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Progress track */}
      <input
        type="range"
        min={0}
        max={duration || 100}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        disabled={isLoading && duration === 0}
        className="custom-audio-slider flex-1"
        aria-label="Seek track"
      />

      {/* Volume Controller (Expandable on hover) */}
      <div className="flex items-center gap-1 group/volume focus-within:w-auto shrink-0">
        <button
          type="button"
          onClick={toggleMute}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-150/70 transition-all focus:outline-none cursor-pointer"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : volume < 0.5 ? (
            <Volume1 className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="custom-audio-slider w-0 opacity-0 pointer-events-none group-hover/volume:w-16 group-hover/volume:opacity-100 group-hover/volume:pointer-events-auto focus-within:w-16 focus-within:opacity-100 focus-within:pointer-events-auto transition-all duration-300"
          aria-label="Volume slider"
        />
      </div>

      {/* Download Action */}
      <button
        type="button"
        onClick={handleDownload}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-150/70 transition-all focus:outline-none shrink-0 cursor-pointer"
        aria-label="Download audio"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
};
