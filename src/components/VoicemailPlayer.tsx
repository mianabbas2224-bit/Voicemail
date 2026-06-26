import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { globalAudio } from '../utils/audioEngine';
import { VoiceLetter } from '../types';
import { Heart, Trash2, X, Play, Pause, Sparkles, Music, CloudRain, Waves, Tv, Star, Volume2, ArrowLeft } from 'lucide-react';

interface VoicemailPlayerProps {
  voicemail: VoiceLetter | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onPlayNext?: () => void;
}

export const VoicemailPlayer: React.FC<VoicemailPlayerProps> = ({
  voicemail,
  onClose,
  onToggleFavorite,
  onToggleArchive,
  onDelete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveform, setWaveform] = useState<number[]>(Array(20).fill(10));
  const [revealedChars, setRevealedChars] = useState(0);
  const [showAnniversarySparkles, setShowAnniversarySparkles] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ambientSounds, setAmbientSounds] = useState({
    piano: false,
    rain: false,
    waves: false,
  });
  
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    setAmbientSounds({
      piano: !!(globalAudio as any).pianoInterval,
      rain: !!(globalAudio as any).rainNode,
      waves: !!(globalAudio as any).wavesNode,
    });
  }, [voicemail]);

  const handleToggleAmbient = (id: 'piano' | 'rain' | 'waves') => {
    globalAudio.init();
    const nextState = !ambientSounds[id];
    setAmbientSounds((prev) => ({ ...prev, [id]: nextState }));
    globalAudio.toggleAtmosphere(id, nextState, 0.45);
  };

  useEffect(() => {
    if (!voicemail) return;

    const isSpecial =
      voicemail.dateString.toLowerCase().includes('14 february') ||
      voicemail.dateString.toLowerCase().includes('eid') ||
      voicemail.dateString.toLowerCase().includes('anniversary');
    setShowAnniversarySparkles(isSpecial);

    handlePlay();

    setRevealedChars(0);
    const interval = setInterval(() => {
      setRevealedChars((prev) => {
        if (prev >= voicemail.noteText.length) {
          clearInterval(interval);
          return voicemail.noteText.length;
        }
        return prev + 2;
      });
    }, 15);

    return () => {
      clearInterval(interval);
      handleStop();
    };
  }, [voicemail]);

  const updateWaveform = () => {
    const data = globalAudio.getAnalyserData();
    const scaled = data.map(v => Math.max(6, (v / 255) * 80));
    setWaveform(scaled);
    animationRef.current = requestAnimationFrame(updateWaveform);
  };

  const handlePlay = () => {
    if (!voicemail) return;
    globalAudio.init();

    if (voicemail.audioBlobUrl) {
      globalAudio.playRecordedVoicemail(voicemail.audioBlobUrl, () => {
        setIsPlaying(false);
        handleStop();
      });
    } else {
      globalAudio.playSyntheticVoicemail();
    }

    setIsPlaying(true);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    updateWaveform();
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (voicemail?.audioBlobUrl) {
      globalAudio.stopRecordedVoicemail();
    } else {
      globalAudio.stopSyntheticVoicemail();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setWaveform(Array(20).fill(6));
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      handleStop();
    } else {
      handlePlay();
    }
  };

  if (!voicemail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dim and blur background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Main player card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full max-w-2xl bg-zinc-950 rounded-2xl p-6 md:p-10 shadow-2xl border border-zinc-800 relative overflow-hidden z-10 text-white"
      >
        {/* Anniversary sparkles background */}
        {showAnniversarySparkles && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-red-500"
                initial={{
                  x: Math.random() * 500,
                  y: 400,
                  opacity: 0,
                  scale: 0.5,
                }}
                animate={{
                  y: -50,
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  duration: 4 + Math.random() * 4,
                  repeat: Infinity,
                  delay: i * 0.8,
                }}
              >
                <Sparkles className="w-5 h-5 fill-red-500/10" />
              </motion.div>
            ))}
          </div>
        )}

        {/* Back and Close Header Row */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 transition-all duration-300 font-sans text-xs font-bold shadow-md active:scale-95 select-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Episodes</span>
          </button>
          
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors duration-300"
            title="Close Player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center relative z-10 pt-8 sm:pt-4">
          {voicemail.chapter && voicemail.chapter.trim() !== '' && (
            <span className="text-[10px] font-sans font-black tracking-widest text-red-500 bg-red-950/40 border border-red-900/30 px-2 py-0.5 rounded uppercase mb-2">
              {voicemail.chapter}
            </span>
          )}
          <h3 className="font-sans text-2xl md:text-3xl text-white font-extrabold tracking-tight mb-1">
            {voicemail.title}
          </h3>
          <p className="font-mono text-xs text-zinc-500 mb-6 tracking-wide">
            {voicemail.dateString}
          </p>

          {/* Beating & blooming red heartbeat visualizer */}
          <div className="w-full h-32 flex flex-col items-center justify-center relative mb-6">
            {/* Ambient blooming rings */}
            <motion.div
              className="absolute w-24 h-24 rounded-full border border-red-600/30 bg-red-600/5 pointer-events-none"
              animate={{
                scale: isPlaying ? [1, 1.4 + (waveform.reduce((sum, h) => sum + h, 0) / (waveform.length || 1) / 80) * 0.8, 1] : 1,
                opacity: isPlaying ? [0.6, 0.2, 0.6] : 0.3,
              }}
              transition={{
                duration: 2.5,
                repeat: isPlaying ? Infinity : undefined,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute w-32 h-32 rounded-full border border-red-500/15 pointer-events-none"
              animate={{
                scale: isPlaying ? [1, 1.8 + (waveform.reduce((sum, h) => sum + h, 0) / (waveform.length || 1) / 80) * 1.2, 1] : 1,
                opacity: isPlaying ? [0.4, 0.05, 0.4] : 0.1,
              }}
              transition={{
                duration: 3,
                repeat: isPlaying ? Infinity : undefined,
                ease: "easeInOut",
                delay: 0.5
              }}
            />

            {/* Glowing Heart core that expands based on live audio */}
            <motion.div
              className="absolute z-10 flex items-center justify-center"
              animate={{
                scale: isPlaying ? 1 + (waveform.reduce((sum, h) => sum + h, 0) / (waveform.length || 1) / 80) * 0.45 : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 150,
                damping: 12
              }}
            >
              <Heart className="w-14 h-14 text-red-600 fill-red-600 drop-shadow-[0_0_15px_rgba(229,9,20,0.6)]" />
            </motion.div>

            {/* Red heartbeat waveform line */}
            <svg viewBox="0 0 100 40" className="w-full h-full absolute top-0 left-0 overflow-visible pointer-events-none z-20">
              <defs>
                <linearGradient id="heartbeat-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(229,9,20,0.1)" />
                  <stop offset="30%" stopColor="rgba(229,9,20,0.4)" />
                  <stop offset="50%" stopColor="rgba(229,9,20,0.95)" />
                  <stop offset="70%" stopColor="rgba(229,9,20,0.4)" />
                  <stop offset="100%" stopColor="rgba(229,9,20,0.1)" />
                </linearGradient>
              </defs>
              <motion.path
                d={(() => {
                  const points = waveform.map((val, idx) => {
                    const x = (idx / (waveform.length - 1)) * 100;
                    const centerFactor = Math.sin((idx / (waveform.length - 1)) * Math.PI);
                    const spike = isPlaying ? (val - 6) * 0.45 * centerFactor : 0;
                    
                    let offset = 0;
                    if (idx === 9) offset = -spike * 1.5;
                    else if (idx === 10) offset = spike * 1.2;
                    else if (idx === 8 || idx === 11) offset = -spike * 0.3;
                    else offset = Math.sin(idx * 1.5) * spike * 0.2;

                    const y = 20 + offset;
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  });
                  return points.join(' ');
                })()}
                fill="none"
                stroke="url(#heartbeat-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Player controls */}
          <div className="flex flex-col items-center gap-5 mb-6 w-full">
            <button
              onClick={handleTogglePlay}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-black shadow-md active:scale-95 transition-all duration-300 ${
                isPlaying
                  ? 'bg-red-600 text-white'
                  : 'bg-white hover:bg-zinc-200'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current text-white" />
              ) : (
                <Play className="w-5 h-5 fill-current text-black translate-x-0.5" />
              )}
            </button>

            {/* Ambient Soundscapes quick toggles while listening */}
            <div className="flex flex-col items-center mt-1">
              <span className="text-[10px] font-sans font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-red-600" />
                <span>Audio Channels [Atmos]</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleAmbient('piano')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-sans font-bold transition-all duration-300 border ${
                    ambientSounds.piano
                      ? 'bg-zinc-800 text-red-500 border-red-600/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                  }`}
                >
                  <Music className="w-3 h-3" />
                  <span>Piano</span>
                </button>
                
                <button
                  onClick={() => handleToggleAmbient('rain')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-sans font-bold transition-all duration-300 border ${
                    ambientSounds.rain
                      ? 'bg-zinc-800 text-blue-400 border-blue-600/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                  }`}
                >
                  <CloudRain className="w-3 h-3" />
                  <span>Rain</span>
                </button>

                <button
                  onClick={() => handleToggleAmbient('waves')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-sans font-bold transition-all duration-300 border ${
                    ambientSounds.waves
                      ? 'bg-zinc-800 text-teal-400 border-teal-600/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
                  }`}
                >
                  <Waves className="w-3 h-3" />
                  <span>Waves</span>
                </button>
              </div>
            </div>
          </div>

          {/* Letter Note (Written out) */}
          <div className="w-full bg-zinc-900/90 border border-zinc-800 p-6 rounded-xl text-left shadow-lg min-h-[120px] relative overflow-hidden">
            <p className="font-serif italic text-base text-zinc-200 leading-relaxed relative z-10">
              {voicemail.noteText.slice(0, revealedChars)}
              {revealedChars < voicemail.noteText.length && (
                <span className="inline-block w-1.5 h-4 bg-red-600 animate-pulse ml-0.5" />
              )}
            </p>
            <div className="mt-4 text-right">
              <span className="font-sans text-xs font-bold text-red-500">
                — Abbas
              </span>
            </div>
          </div>

          {/* Netflix Style footer controls */}
          <div className="w-full grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-zinc-900">
            {/* Favorites -> Treasured Moment */}
            <button
              id={`player-treasure-btn-${voicemail.id}`}
              onClick={() => onToggleFavorite(voicemail.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${
                voicemail.isFavorite
                  ? 'bg-zinc-900 border-red-900/40 text-red-500'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Heart className={`w-5 h-5 mb-1 transition-all ${
                voicemail.isFavorite ? 'fill-red-600 text-red-600 scale-110 animate-pulse' : ''
              }`} />
              <span className="font-sans text-[10px] font-extrabold uppercase tracking-widest">
                My List
              </span>
            </button>

            {/* Archive -> Memories */}
            <button
              id={`player-archive-btn-${voicemail.id}`}
              onClick={() => onToggleArchive(voicemail.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${
                voicemail.isArchived
                  ? 'bg-zinc-900 border-red-900/40 text-red-400'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Tv className={`w-5 h-5 mb-1 ${
                voicemail.isArchived ? 'text-red-500' : ''
              }`} />
              <span className="font-sans text-[10px] font-extrabold uppercase tracking-widest">
                {voicemail.isArchived ? 'Archived' : 'Archive'}
              </span>
            </button>

            {/* Delete -> Let Go */}
            <button
              id={`player-delete-btn-${voicemail.id}`}
              onClick={() => setShowDeleteConfirm(true)}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-800 text-zinc-400 hover:bg-red-950/20 hover:border-red-900/40 hover:text-red-500 transition-all duration-300 bg-zinc-950"
            >
              <Trash2 className="w-5 h-5 mb-1" />
              <span className="font-sans text-[10px] font-extrabold uppercase tracking-widest">
                Delete
              </span>
            </button>
          </div>
        </div>

        {/* Custom Deletion Confirmation Overlay inside the player */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-950/40 border border-red-900/50 rounded-full flex items-center justify-center text-red-500 mb-4 animate-bounce">
                <Trash2 className="w-8 h-8" />
              </div>
              <h4 className="font-sans text-lg font-extrabold text-white mb-2">Let go of this memory?</h4>
              <p className="font-sans text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
                Are you sure you want to delete this whispered voicemail episode? This action is permanent and cannot be undone.
              </p>
              <div className="flex items-center gap-3 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Keep It
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(voicemail.id);
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-sans font-bold uppercase tracking-wider text-white shadow-lg shadow-red-900/30 transition-colors cursor-pointer"
                >
                  Let Go
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
