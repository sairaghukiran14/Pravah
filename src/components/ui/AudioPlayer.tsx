'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Volume1, Download, Loader2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
  compact?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  autoPlay = false,
  className = '',
  compact = false,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to convert base64 data URI to Blob
  const dataURItoBlob = (dataURI: string) => {
    const split = dataURI.split(',');
    const byteString = atob(split[1]);
    const mimeString = split[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  // Handle src changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let blobUrl: string | null = null;

    try {
      if (src.startsWith('data:')) {
        const blob = dataURItoBlob(src);
        blobUrl = URL.createObjectURL(blob);
        audio.src = blobUrl;
      } else {
        audio.src = src;
      }
      
      audio.load();
      if (autoPlay) {
        audio.play().catch((err) => console.error('AutoPlay failed:', err));
      }
    } catch (error) {
      console.error('Error setting up audio source:', error);
      setIsLoading(false);
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [src, autoPlay]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };
    const onCanPlay = () => setIsLoading(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
    };
  }, []);

  // Handle mute and volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

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
        console.error('Native playback failed:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetVolume = parseFloat(e.target.value);
    setVolume(targetVolume);
    setIsMuted(targetVolume === 0);
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (!nextMute && volume === 0) {
      setVolume(1);
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
    <div className={`flex items-center gap-2 ${compact ? 'p-1 pr-2 sm:gap-3' : 'sm:gap-4 p-1.5 pr-2 sm:pr-3'} rounded-full border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-300 w-full overflow-hidden ${className}`}>
      
      {/* Hidden native audio element */}
      <audio ref={audioRef} preload="auto" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading && !isPlaying}
        className={`${compact ? 'w-8 h-8' : 'w-10 h-10 sm:w-11 sm:h-11'} rounded-full bg-[#111827] text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shrink-0 shadow-sm`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading && !isPlaying ? (
          <Loader2 className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} animate-spin text-white`} />
        ) : isPlaying ? (
          <Pause className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill-current`} />
        ) : (
          <Play className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill-current ml-1`} />
        )}
      </button>

      {/* Progress Bar & Times */}
      <div className="flex items-center flex-1 gap-1.5 sm:gap-2 min-w-0">
        <span className={`text-[10px] ${compact ? 'sm:text-[11px] min-w-[28px]' : 'sm:text-xs min-w-[32px] sm:min-w-[36px]'} font-medium tabular-nums text-slate-500 text-right shrink-0`}>
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          disabled={!duration}
          className="flex-1 h-1.5 min-w-0 accent-slate-900 bg-gray-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:cursor-not-allowed transition-all"
          aria-label="Seek timeline"
        />
        <span className={`text-[10px] ${compact ? 'sm:text-[11px] min-w-[28px]' : 'sm:text-xs min-w-[32px] sm:min-w-[36px]'} font-medium tabular-nums text-slate-500 shrink-0`}>
          {formatTime(duration)}
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Volume Control (Desktop) */}
        {!compact && (
          <div className="hidden sm:flex items-center gap-2 pl-1 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
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
              className="w-16 h-1.5 min-w-0 accent-slate-900 bg-gray-200 rounded-lg cursor-pointer focus:outline-none"
              aria-label="Volume slider"
            />
          </div>
        )}

        {/* Volume Control (Mobile Toggle or Compact Mode) */}
        <button
          type="button"
          onClick={toggleMute}
          className={`${compact ? 'flex' : 'sm:hidden'} p-1.5 rounded-full text-slate-400 hover:text-slate-700 transition-colors focus:outline-none shrink-0`}
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

        <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

        {/* Download Action - Styled as a rounded square box */}
        <button
          type="button"
          onClick={handleDownload}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none flex items-center justify-center"
          aria-label="Download audio"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
