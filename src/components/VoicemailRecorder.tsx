import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceLetter } from '../types';
import { Mic, Square, Trash2, Heart, Sparkles, Send, X } from 'lucide-react';

interface VoicemailRecorderProps {
  onAddVoicemail: (newLetter: VoiceLetter, audioBlob: Blob) => void;
  onClose: () => void;
  activeProfile?: { id: string; name: string } | null;
}

export const generatePoeticTimestamp = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  let period = 'Quiet evening';
  if (hours >= 0 && hours < 4) period = 'Deep midnight';
  else if (hours >= 4 && hours < 8) period = 'Soft dawn';
  else if (hours >= 8 && hours < 12) period = 'Crisp morning';
  else if (hours >= 12 && hours < 17) period = 'Sunny afternoon';
  else if (hours >= 17 && hours < 20) period = 'Golden twilight';
  else if (hours >= 20 && hours < 24) period = 'Quiet evening';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${period} · ${day} ${month} ${year} · ${displayHours}:${minutes} ${ampm}`;
};

export const VoicemailRecorder: React.FC<VoicemailRecorderProps> = ({
  onAddVoicemail,
  onClose,
  activeProfile,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState('');
  const [noteText, setNoteText] = useState('');
  const [senderName, setSenderName] = useState(activeProfile?.name || 'Abbas');

  useEffect(() => {
    if (activeProfile?.name) {
      setSenderName(activeProfile.name);
    }
  }, [activeProfile]);

  const recipientName = activeProfile?.id === 'fatima' ? 'Abbas' : 'Fatima';
  const activeProfileName = activeProfile?.name || 'Abbas';

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [micVolume, setMicVolume] = useState(0); 
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const cleanupRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setRecordingError(null);
      cleanupRecording();
      audioChunksRef.current = [];
      setRecordingSeconds(0);
      setAudioBlobUrl(null);
      setAudioBlob(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      analyserRef.current = analyser;
      source.connect(analyser);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;
        setMicVolume(avg);
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

    } catch (e) {
      console.error('Failed to access microphone or record:', e);
      setRecordingError('Could not access microphone. Please check permissions and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    cleanupRecording();
  };

  const formatDuration = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeliver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioBlobUrl || !audioBlob) return;

    const newLetter: VoiceLetter = {
      id: 'custom-' + Date.now(),
      senderName: senderName || 'Abbas',
      chapter: chapter.trim() || undefined,
      category: 'Today', // Fallback, dynamically resolved at runtime
      title: title || 'A new recording',
      dateString: generatePoeticTimestamp(new Date()),
      duration: formatDuration(recordingSeconds || 15),
      noteText: noteText || 'Recorded with love...',
      isFavorite: false,
      isArchived: false,
      audioBlobUrl,
      timestamp: Date.now(),
    };

    onAddVoicemail(newLetter, audioBlob);
    onClose();
  };

  const handleReset = () => {
    setAudioBlobUrl(null);
    setAudioBlob(null);
    setRecordingSeconds(0);
  };  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start sm:items-center justify-center p-4 py-6 sm:py-12 scroll-smooth">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-xl bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-850 relative z-10 text-white my-auto flex flex-col max-h-[92vh] md:max-h-[88vh]"
      >
        {/* Fixed Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-900 relative flex justify-between items-start bg-zinc-950 rounded-t-2xl shrink-0">
          <div>
            <h3 className="font-sans text-xl sm:text-2xl text-white font-extrabold tracking-tight mb-1">
              Record New Episode
            </h3>
            <p className="font-sans text-xs text-zinc-400 font-light">
              Deliver a new voicemail to {recipientName} from {activeProfileName}. Speak slowly, leave a memory.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-md ml-4 shrink-0"
            title="Close Recorder"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* Record Panel */}
          <div className="flex flex-col items-center justify-center bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl shadow-sm relative overflow-hidden">
            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[9px] text-red-500 bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded font-mono font-black tracking-widest uppercase">
              <span className={`w-2 h-2 rounded-full bg-red-600 ${isRecording ? 'animate-ping' : ''}`} />
              <span>{isRecording ? 'RECORDING LIVE' : 'VOICE STREAM'}</span>
            </div>

            {/* Beating & blooming heartbeat visualizer */}
            <div className="relative w-full h-36 flex flex-col items-center justify-center mb-4 mt-6">
              {/* Blooming surrounding rings */}
              <motion.div
                className="absolute w-28 h-28 rounded-full border border-red-600/30 bg-red-600/5 pointer-events-none"
                animate={{
                  scale: isRecording ? 1 + (micVolume / 100) * 0.8 : 1,
                  opacity: isRecording ? [0.6, 0.2, 0.6] : 0.3,
                }}
                transition={{
                  duration: 2.0,
                  repeat: isRecording ? Infinity : undefined,
                  ease: "easeInOut"
                }}
              />

              {/* Glowing Heart Core */}
              <motion.div
                className="absolute pointer-events-none"
                animate={{
                  scale: isRecording ? 1 + (micVolume / 100) * 0.45 : 1,
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              >
                <Heart className={`w-12 h-12 ${isRecording ? 'text-red-600 fill-red-600 drop-shadow-[0_0_15px_rgba(229,9,20,0.6)]' : 'text-zinc-800 fill-none'} transition-colors duration-300`} />
              </motion.div>

              {/* Action button */}
              <button
                id="record-action-btn"
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 z-10 border-2 ${
                  isRecording
                    ? 'bg-red-600 border-red-500 shadow-red-900/40'
                    : audioBlobUrl
                    ? 'bg-red-700 border-red-600 shadow-red-900/30'
                    : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 shadow-zinc-950'
                }`}
              >
                {isRecording ? (
                  <Square className="w-5 h-5 fill-white text-white" />
                ) : (
                  <Mic className="w-5 h-5 fill-none" />
                )}
              </button>
            </div>

            <p className="font-serif italic text-sm text-zinc-300 text-center">
              {isRecording
                ? '"Speaking from your heart..."'
                : audioBlobUrl
                ? 'Your episode recording is sealed.'
                : 'Click the mic to begin recording.'}
            </p>

            <p className="font-mono text-[11px] text-zinc-400 mt-1.5 font-bold tracking-widest">
              {formatDuration(recordingSeconds)}
            </p>

            {audioBlobUrl && (
              <button
                id="record-reset-btn"
                type="button"
                onClick={handleReset}
                className="mt-4 px-4 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 rounded-xl flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-all font-semibold uppercase tracking-wider active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Record Again / Discard</span>
              </button>
            )}

            {recordingError && (
              <div className="mt-3 text-[11px] text-red-500 bg-red-950/30 border border-red-900/40 px-3.5 py-2 rounded-xl text-center font-sans font-medium tracking-wide">
                {recordingError}
              </div>
            )}
          </div>

          {/* Metadata Details Form */}
          <AnimatePresence>
            {audioBlobUrl && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleDeliver}
                className="space-y-5 pr-0.5 pb-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-sans font-extrabold uppercase tracking-widest text-zinc-500 mb-1.5">
                      Your Name
                    </label>
                    <input
                      id="recorder-sender-name"
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Abbas"
                      className="w-full px-4 py-2.5 bg-zinc-900 rounded-xl border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-red-600 text-sm text-white placeholder-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-sans font-extrabold uppercase tracking-widest text-zinc-500 mb-1.5">
                      Episode Title
                    </label>
                    <input
                      id="recorder-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="E.g., Starry Night Walk"
                      className="w-full px-4 py-2.5 bg-zinc-900 rounded-xl border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-red-600 text-sm text-white placeholder-zinc-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-sans font-extrabold uppercase tracking-widest text-zinc-500 mb-1.5">
                      Chapter (Optional)
                    </label>
                    <input
                      id="recorder-chapter"
                      type="text"
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      placeholder="E.g., Late Night Whisper (Or leave empty)"
                      className="w-full px-4 py-2.5 bg-zinc-900 rounded-xl border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-red-600 text-sm text-white placeholder-zinc-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-sans font-extrabold uppercase tracking-widest text-zinc-500 mb-1.5">
                    Written Accompanying Note
                  </label>
                  <textarea
                    id="recorder-note"
                    rows={3}
                    required
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Type a beautiful message to accompany your voice..."
                    className="w-full px-4 py-3 bg-zinc-900 rounded-xl border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-red-600 text-sm text-white placeholder-zinc-600 resize-none"
                  />
                </div>

                <div className="pt-4">
                  <button
                    id="deliver-love-btn"
                    type="submit"
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl active:scale-95 transition-all text-xs font-sans font-bold uppercase tracking-widest shadow-lg shadow-red-900/30"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Deliver Episode with Love</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
