import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface DailyGreetingsProps {
  userName?: string;
}

const GREETINGS = [
  "I hope today is kind to you, my love.",
  "Someone left you a little piece of their heart.",
  "Take a moment. Listen.",
  "Some memories sound better than words.",
  "Your voice is my favorite place in the entire world.",
  "Every silence is filled with whispers of you.",
  "You are the poem I never knew how to write."
];

const DEV_THOUGHTS = [
  "No matter how busy the world gets, my thoughts always find their way back to you.",
  "I love the sound of your name. It sounds like a secret promise.",
  "If love had a sound, it would be your soft breathing next to me.",
  "You make the ordinary feel like a beautifully written story.",
  "Thank you for keeping these small, quiet moments alive with me.",
  "Even on the stormiest days, you are my warm, safe harbor."
];

export const DailyGreetings: React.FC<DailyGreetingsProps> = ({ userName = "Fatima" }) => {
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [showRevealed, setShowRevealed] = useState(false);

  // Pick a greeting based on the current date of the week (keeps it steady for the day)
  const dayIndex = new Date().getDay() % GREETINGS.length;
  const todayGreeting = GREETINGS[dayIndex];

  const handleNextThought = () => {
    setShowRevealed(true);
    setThoughtIndex((prev) => (prev + 1) % DEV_THOUGHTS.length);
  };

  return (
    <div className="rounded-3xl bg-zinc-900/90 p-6 md:p-8 shadow-xl border border-zinc-800 relative overflow-hidden transition-all duration-500 hover:border-red-600/30">
      {/* Decorative gradient glowing aura like Netflix banners */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-red-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-zinc-800/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-sans font-extrabold text-red-600 tracking-wider bg-red-600/10 px-2 py-0.5 rounded-md uppercase">
              N Original
            </span>
            <span className="text-xs text-zinc-400 font-medium">Daily Matching Quote</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-sans text-white font-bold tracking-tight leading-tight">
            "{todayGreeting}"
          </h1>
          <p className="font-sans text-xs text-zinc-400 mt-2.5 font-light">
            Selected exclusively for you. Every quiet whisper is a pathway to an unforgettable chapter.
          </p>
        </div>

        <div className="flex-shrink-0">
          <button
            id="reveal-heartbeat-btn"
            onClick={handleNextThought}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all duration-300 shadow-lg shadow-red-900/20"
          >
            <Sparkles className="w-4 h-4 text-white fill-white/20" />
            <span>{showRevealed ? 'Next Secret Quote' : 'Reveal Heartbeat Note'}</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showRevealed && (
          <motion.div
            key={thoughtIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="mt-6 pt-5 border-t border-zinc-800 flex items-start gap-3 relative z-10"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2.5 flex-shrink-0" />
            <p className="font-serif italic text-base md:text-lg text-zinc-300 leading-relaxed">
              "{DEV_THOUGHTS[thoughtIndex]}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
