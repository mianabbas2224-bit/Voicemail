import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceLetter } from './types';
import { RosePetals } from './components/RosePetals';
import { DailyGreetings } from './components/DailyGreetings';
import { VoicemailList } from './components/VoicemailList';
import { VoicemailPlayer } from './components/VoicemailPlayer';
import { VoicemailRecorder } from './components/VoicemailRecorder';
import { Heart, Plus, Sparkles, Calendar, BookOpen, Mic, X, Play, Info, Volume2, VolumeX, Star, Tv, LogOut, UserPlus, Bell } from 'lucide-react';
import { globalAudio } from './utils/audioEngine';

const LOCAL_STORAGE_KEY = 'fatima_voicemails_letters';

export interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string;
}

export const getDynamicCategory = (timestamp: number): 'Today' | 'This Month' | 'This Year' => {
  const ageMs = Date.now() - timestamp;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
  
  if (ageMs < oneDayMs) {
    return 'Today';
  } else if (ageMs < oneMonthMs) {
    return 'This Month';
  } else {
    return 'This Year';
  }
};

export default function App() {
  const [voicemails, setVoicemails] = useState<VoiceLetter[]>([]);
  const [selectedVoicemail, setSelectedVoicemail] = useState<VoiceLetter | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [selectedOverlayCategory, setSelectedOverlayCategory] = useState<'month' | 'year' | 'treasured' | null>(null);
  
  // Profile access state (Only Abbas and Fatima)
  const DEFAULT_PROFILES: Profile[] = [
    { id: 'abbas', name: 'Abbas', avatarColor: 'from-blue-600 to-indigo-800', avatarEmoji: '👑' },
    { id: 'fatima', name: 'Fatima', avatarColor: 'from-rose-500 to-red-700', avatarEmoji: '❤️' }
  ];
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [selectedProfileForLogin, setSelectedProfileForLogin] = useState<Profile | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isBgMusicOn, setIsBgMusicOn] = useState(true);
  const [notificationToast, setNotificationToast] = useState<{ message: string; voicemail?: VoiceLetter } | null>(null);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Track listened count for sweet toast trigger
  const [listenedCount, setListenedCount] = useState(0);
  const [showSecretToast, setShowSecretToast] = useState(false);

  // Initialize and load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: VoiceLetter[] = JSON.parse(stored);
        // Only keep genuine user-recorded voicemails whose id starts with 'custom-'
        const genuine = parsed.filter(v => typeof v.id === 'string' && v.id.startsWith('custom-'));
        setVoicemails(genuine);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(genuine));
      } else {
        // App starts empty as requested: "there should be no voice note unti both partners share"
        setVoicemails([]);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
      }
    } catch (e) {
      console.error('Failed to load local storage:', e);
      setVoicemails([]);
    }
  }, []);

  // Manage visibility and background ambient music
  useEffect(() => {
    if (!activeProfile) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Person is not actively using the app (tab hidden or window minimized). Stop the music!
        try {
          globalAudio.toggleAtmosphere('piano', false, 0);
        } catch (e) {
          console.error('Error pausing music on visibility hidden:', e);
        }
      } else {
        // Tab is back in focus. Play only if the user has music turned ON.
        if (isBgMusicOn) {
          try {
            globalAudio.init();
            globalAudio.toggleAtmosphere('piano', true, 0.35);
          } catch (e) {
            console.error('Error resuming music on visibility visible:', e);
          }
        }
      }
    };

    // If the user has it ON when they are inside the app, make sure it starts
    if (isBgMusicOn) {
      try {
        globalAudio.init();
        globalAudio.toggleAtmosphere('piano', true, 0.35);
      } catch (e) {
        console.error('Error starting piano:', e);
      }
    } else {
      try {
        globalAudio.toggleAtmosphere('piano', false, 0);
      } catch (e) {
        console.error('Error stopping piano:', e);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Make sure we stop music on unmount or switch profile
      try {
        globalAudio.toggleAtmosphere('piano', false, 0);
      } catch (e) {}
    };
  }, [activeProfile, isBgMusicOn]);

  // Auto-dismiss notification toasts after 6 seconds
  useEffect(() => {
    if (notificationToast) {
      const timer = setTimeout(() => {
        setNotificationToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [notificationToast]);

  // Handle mobile and browser physical back button for voicemail player
  useEffect(() => {
    if (!selectedVoicemail) return;

    const handlePopState = () => {
      setSelectedVoicemail(null);
    };

    window.history.pushState({ playerOpen: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedVoicemail]);

  // Save changes to local storage helper
  const saveToLocalStorage = (updated: VoiceLetter[]) => {
    setVoicemails(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save local storage:', e);
    }
  };

  // Add custom recorded voicemail
  const handleAddVoicemail = (newLetter: VoiceLetter) => {
    // Sender automatically listened to their own voicemail
    const letterWithListened = {
      ...newLetter,
      listenedBy: activeProfile ? [activeProfile.id] : [],
    };
    const updated = [letterWithListened, ...voicemails];
    saveToLocalStorage(updated);

    // In-app success notification toast
    setNotificationToast({
      message: `✨ Voicemail delivered successfully from ${newLetter.senderName}!`,
      voicemail: letterWithListened,
    });

    // Native HTML5 system notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`New Voicemail from ${newLetter.senderName}`, {
          body: `Episode: "${newLetter.title}"`,
          icon: '/icon.png',
        });
      } catch (e) {
        console.error('Failed to trigger native Notification:', e);
      }
    }
  };

  // Treasured Moments (Toggle Favorite)
  const handleToggleFavorite = (id: string) => {
    const updated = voicemails.map((letter) => {
      if (letter.id === id) {
        return { ...letter, isFavorite: !letter.isFavorite };
      }
      return letter;
    });
    saveToLocalStorage(updated);

    // If active player is viewing, keep it in sync
    if (selectedVoicemail && selectedVoicemail.id === id) {
      setSelectedVoicemail((prev) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  // Our Memories (Toggle Archive)
  const handleToggleArchive = (id: string) => {
    const updated = voicemails.map((letter) => {
      if (letter.id === id) {
        return { ...letter, isArchived: !letter.isArchived };
      }
      return letter;
    });
    saveToLocalStorage(updated);

    // If active player is viewing, keep it in sync
    if (selectedVoicemail && selectedVoicemail.id === id) {
      setSelectedVoicemail((prev) => prev ? { ...prev, isArchived: !prev.isArchived } : null);
    }
  };

  // Let Go (Delete)
  const handleDeleteVoicemail = (id: string) => {
    const updated = voicemails.filter((letter) => letter.id !== id);
    saveToLocalStorage(updated);
  };

  // Select voicemail to play
  const handleSelectVoicemail = (letter: VoiceLetter) => {
    setSelectedVoicemail(letter);

    // Mark as read/listened by active profile
    if (activeProfile) {
      const alreadyListened = letter.listenedBy?.includes(activeProfile.id);
      if (!alreadyListened) {
        const updatedListenedBy = [...(letter.listenedBy || []), activeProfile.id];
        const updatedVoicemails = voicemails.map((v) => {
          if (v.id === letter.id) {
            return { ...v, listenedBy: updatedListenedBy };
          }
          return v;
        });
        saveToLocalStorage(updatedVoicemails);
      }
    }
    
    // Track count for the sweet surprise message
    setListenedCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        // Trigger secret romantic message after listening to 3 letters
        setTimeout(() => {
          setShowSecretToast(true);
        }, 1200);
      }
      return next;
    });
  };

  const handlePlayFirstEpisode = () => {
    if (voicemails.length > 0) {
      handleSelectVoicemail(voicemails[0]);
    } else {
      setShowRecorder(true);
    }
  };

  const handleSelectProfile = (p: Profile) => {
    setSelectedProfileForLogin(p);
    setEmailInput('');
    setLoginError('');
  };

  const handleVerifyEmailAndLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileForLogin) return;
    const emailLower = emailInput.trim().toLowerCase();

    // Verify
    let isValid = false;
    if (selectedProfileForLogin.id === 'abbas') {
      isValid = (emailLower === 'abbasmian100@gmail.com' || emailLower.includes('abbas')) && emailLower.includes('@');
    } else if (selectedProfileForLogin.id === 'fatima') {
      isValid = (emailLower.includes('fatima') || emailLower === 'fatima@gmail.com') && emailLower.includes('@');
    }

    if (isValid) {
      setActiveProfile(selectedProfileForLogin);
      setEmailInput('');
      setLoginError('');
      try {
        globalAudio.init();
        globalAudio.toggleAtmosphere('piano', true, 0.35);
      } catch (e) {
        console.error(e);
      }

      // Check for unread voicemails
      const partnerVoicemails = voicemails.filter(
        (v) => v.senderName !== selectedProfileForLogin.name && !(v.listenedBy?.includes(selectedProfileForLogin.id))
      );
      if (partnerVoicemails.length > 0) {
        const latest = partnerVoicemails[0];
        setTimeout(() => {
          setNotificationToast({
            message: `You have ${partnerVoicemails.length} unread voicemail${partnerVoicemails.length > 1 ? 's' : ''} from ${latest.senderName}!`,
            voicemail: latest,
          });
        }, 1000);

        // HTML5 system notification
        if ('Notification' in window) {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              try {
                new Notification(`Voicemails for ${selectedProfileForLogin.name}`, {
                  body: `You have ${partnerVoicemails.length} unread voicemail${partnerVoicemails.length > 1 ? 's' : ''} waiting from ${latest.senderName}!`,
                  icon: '/icon.png',
                });
              } catch (e) {
                console.error('Failed to trigger native Notification:', e);
              }
            }
          });
        }
      }
    } else {
      setLoginError(`Incorrect email for ${selectedProfileForLogin.name}. Please enter your registered email.`);
    }
  };

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex flex-col items-center justify-center p-4 relative font-sans overflow-hidden">
        {/* Floating Rose Petals / Glowing Ember Particle System */}
        <RosePetals />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-red-950/20 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl w-full text-center space-y-8 relative z-10">
          <AnimatePresence mode="wait">
            {!selectedProfileForLogin ? (
              <motion.div
                key="profiles-list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 animate-fade-in"
              >
                {/* Brand Title exactly styled like the image font */}
                <div className="space-y-4 select-none flex flex-col items-center gap-0 relative">
                  <span className="font-montserrat font-black tracking-[0.2em] text-4xl sm:text-6xl text-white uppercase leading-none">
                    VOICEMAILS
                  </span>
                  <div className="flex items-baseline gap-2 sm:gap-3">
                    <span className="font-montserrat font-bold tracking-[0.25em] text-xs sm:text-base text-zinc-500 uppercase leading-none">
                      FOR
                    </span>
                    <span className="font-signature-vibes text-5xl sm:text-7xl text-red-500 leading-none drop-shadow-2xl font-normal inline-block">
                      Fatima
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-sans font-extrabold tracking-tight text-white select-none">
                    Who's watching?
                  </h1>
                  <p className="text-zinc-500 text-xs sm:text-sm max-w-md mx-auto">
                    This is a secure private space created for Abbas and Fatima. Please select your ID to verify.
                  </p>
                </div>

                {/* Profiles Grid */}
                <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 pt-4">
                  {DEFAULT_PROFILES.map((p) => (
                    <motion.div
                      key={p.id}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectProfile(p)}
                      className="flex flex-col items-center gap-3 group cursor-pointer"
                    >
                      {/* Avatar Square */}
                      <div className={`w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-tr ${p.avatarColor} rounded-xl border-2 border-transparent group-hover:border-white transition-all duration-300 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden`}>
                        <span className="text-4xl sm:text-5xl filter drop-shadow-md select-none">{p.avatarEmoji}</span>
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
                      </div>
                      <span className="text-zinc-400 group-hover:text-white font-sans text-xs sm:text-sm font-bold transition-colors">
                        {p.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full mx-auto bg-zinc-950 border border-zinc-850 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-tr ${selectedProfileForLogin.avatarColor} rounded-lg flex items-center justify-center font-bold text-white text-xl select-none`}>
                    {selectedProfileForLogin.avatarEmoji}
                  </div>
                  <div>
                    <h3 className="font-sans text-lg font-extrabold text-white">
                      Login as {selectedProfileForLogin.name}
                    </h3>
                    <p className="text-xs text-zinc-500">Secure partner authentication</p>
                  </div>
                </div>

                <form onSubmit={handleVerifyEmailAndLogin} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-sans font-extrabold uppercase tracking-widest text-zinc-500 mb-1.5">
                      Your Email ID
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      placeholder={`Enter ${selectedProfileForLogin.name}'s email...`}
                      className="w-full px-4 py-2.5 bg-zinc-900 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-red-600 text-sm text-white placeholder-zinc-700 font-bold"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-normal">
                      {selectedProfileForLogin.id === 'abbas' 
                        ? 'Verification is required for abbasmian100@gmail.com' 
                        : 'Verification is required for fatima@gmail.com'}
                    </p>
                  </div>

                  {loginError && (
                    <p className="text-xs text-red-500 font-medium">
                      {loginError}
                    </p>
                  )}

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProfileForLogin(null);
                        setEmailInput('');
                        setLoginError('');
                      }}
                      className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl font-sans text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-sans text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-900/20"
                    >
                      Verify & Enter
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const unreadVoicemails = activeProfile 
    ? voicemails.filter(v => v.senderName !== activeProfile.name && !(v.listenedBy?.includes(activeProfile.id)))
    : [];

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-20 relative font-sans overflow-x-hidden selection:bg-red-600/30 selection:text-white">
      
      {/* Floating Rose Petals / Glowing Ember Particle System */}
      <RosePetals />

      {/* Netflix Top Navigation Bar */}
      <nav className="w-full bg-gradient-to-b from-black/80 to-transparent py-4 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xs">
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Bold Brand Logo styled exactly like image font */}
          <div className="flex flex-col select-none leading-none">
            <span className="font-montserrat font-black tracking-[0.16em] text-[11px] sm:text-[13px] text-white">
              VOICEMAILS
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-montserrat font-bold tracking-[0.2em] text-[7px] text-red-600 uppercase">
                FOR
              </span>
              <span className="font-signature text-red-500 text-base sm:text-lg font-bold -mt-0.5 leading-none">
                Fatima
              </span>
            </div>
          </div>

          {/* Quick Nav Options */}
          <div className="hidden md:flex items-center gap-5 text-xs text-zinc-300 font-bold tracking-wide">
            <span className="text-white cursor-default">Home</span>
            <span className="hover:text-zinc-400 cursor-pointer transition-colors" onClick={() => setSelectedOverlayCategory('month')}>This Month</span>
            <span className="hover:text-zinc-400 cursor-pointer transition-colors" onClick={() => setSelectedOverlayCategory('year')}>This Year</span>
            <span className="hover:text-zinc-400 cursor-pointer transition-colors" onClick={() => setSelectedOverlayCategory('treasured')}>My List</span>
          </div>
        </div>

        {/* Right side items: Music Toggle + Bell + User Profile switcher dropdown */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Ambient Music Toggle Button */}
          <button
            onClick={() => {
              const nextState = !isBgMusicOn;
              setIsBgMusicOn(nextState);
            }}
            className="p-2 sm:px-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold font-sans select-none active:scale-95 shadow-md group relative"
            title="Toggle Background Music"
          >
            {isBgMusicOn ? (
              <>
                <Volume2 className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="hidden sm:inline text-[10px] tracking-wider uppercase font-extrabold text-zinc-300">Music: On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-zinc-500" />
                <span className="hidden sm:inline text-[10px] tracking-wider uppercase font-extrabold text-zinc-500">Music: Off</span>
              </>
            )}
          </button>

          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              className="p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-all flex items-center justify-center relative active:scale-95 shadow-md"
              title="Notifications"
            >
              <Bell className={`w-4 h-4 ${unreadVoicemails.length > 0 ? 'text-red-500 animate-pulse' : ''}`} />
              {unreadVoicemails.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-sans text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#141414] animate-bounce">
                  {unreadVoicemails.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotificationDropdown && (
                <>
                  {/* Backdrop overlay to click outside and close */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotificationDropdown(false)}
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-zinc-950 border border-zinc-850 rounded-xl shadow-2xl overflow-hidden z-50 text-left"
                  >
                    <div className="p-3 border-b border-zinc-900 flex items-center justify-between">
                      <span className="font-sans font-extrabold text-xs tracking-wider uppercase text-zinc-400">🔔 Notifications</span>
                      {unreadVoicemails.length > 0 && (
                        <span className="text-[10px] bg-red-950 text-red-400 font-bold px-2 py-0.5 rounded border border-red-900/40">
                          {unreadVoicemails.length} New
                        </span>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto no-scrollbar py-1">
                      {unreadVoicemails.length > 0 ? (
                        unreadVoicemails.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => {
                              handleSelectVoicemail(v);
                              setShowNotificationDropdown(false);
                            }}
                            className="p-3 hover:bg-zinc-900 cursor-pointer border-b border-zinc-900/50 last:border-0 flex gap-2.5 items-start transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0 border border-red-900/20 group-hover:bg-red-600/20 transition-colors">
                              <Play className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h6 className="font-sans font-bold text-xs text-white truncate group-hover:text-red-500 transition-colors">
                                {v.title}
                              </h6>
                              <p className="font-sans text-[10px] text-zinc-500 mt-0.5">
                                Sent by {v.senderName} • {v.dateString}
                              </p>
                              <p className="font-serif italic text-[11px] text-zinc-400 truncate mt-1">
                                "{v.noteText}"
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 px-4 text-center">
                          <Bell className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                          <p className="font-sans text-xs text-zinc-500 font-bold uppercase tracking-wider">All Caught Up</p>
                          <p className="font-sans text-[10px] text-zinc-600 mt-1">
                            No unread episodes from your partner.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile switcher drop-down on far right */}
          <div className="flex items-center gap-4 relative group">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-[10px] font-sans text-zinc-500 font-medium leading-none">Watching as</span>
              <span className="text-xs font-sans text-white font-bold leading-none mt-1">{activeProfile.name} {activeProfile.avatarEmoji}</span>
            </div>
            {/* Rounded square avatar resembling Netflix profile selectors */}
            <div className={`w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-tr ${activeProfile.avatarColor} rounded-lg flex items-center justify-center font-bold text-white text-sm select-none border border-white/10 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all`}>
              {activeProfile.avatarEmoji}
            </div>

            {/* Hover dropdown for switching profiles / signing out */}
            <div className="absolute right-0 top-full pt-2 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-300 z-50">
              <div className="w-48 bg-zinc-950 border border-zinc-850 rounded-xl p-2 shadow-2xl text-left">
                <p className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-zinc-500 px-3 py-1 border-b border-zinc-900 mb-1">
                  Profile Options
                </p>
                <button
                  onClick={() => {
                    setActiveProfile(null);
                    try {
                      globalAudio.toggleAtmosphere('piano', false, 0);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-900 text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Switch Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Netflix Movie Billboard (Hero Banner) */}
      <div className="w-full relative bg-gradient-to-b from-black/20 via-[#141414]/90 to-[#141414] py-10 sm:py-16 md:py-20 px-4 sm:px-12 border-b border-zinc-900 overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute top-1/2 left-1/4 w-[60vw] h-[60vw] bg-red-900/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-4xl mx-auto relative z-20 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-sans font-black tracking-widest text-red-500 bg-red-950/50 border border-red-900/40 px-2 py-0.5 rounded uppercase">
              N Series
            </span>
            <span className="text-xs text-zinc-400 font-medium tracking-wide">ROMANTIC MEMOIR PREMIERE</span>
          </div>

          {/* Main Title Styled exactly like image font */}
          <div className="py-4 sm:py-6 select-none flex flex-col items-start gap-0 relative">
            <h1 className="font-montserrat font-black tracking-[0.14em] text-4xl sm:text-6xl md:text-7xl text-white uppercase leading-none drop-shadow-md">
              VOICEMAILS
            </h1>
            <div className="flex items-baseline gap-2.5 mt-2 sm:mt-3">
              <span className="font-montserrat font-bold tracking-[0.2em] text-xs sm:text-lg md:text-xl text-zinc-400 uppercase leading-none">
                FOR
              </span>
              <span className="font-signature-vibes text-5xl sm:text-7xl md:text-8xl text-red-500 leading-none drop-shadow-2xl font-normal ml-1 inline-block">
                Fatima
              </span>
            </div>
          </div>

          {/* Sub-badges panel matching Netflix layout */}
          <div className="flex items-center gap-3 text-xs text-zinc-300 font-bold flex-wrap">
            <span className="text-green-500">99.8% Match</span>
            <span>2026</span>
            <span className="border border-zinc-700 px-1.5 py-0.2 rounded text-[9px] text-zinc-400">TV-MA</span>
            <span className="text-zinc-400">{voicemails.length} Episodes</span>
            <span className="border border-zinc-700 px-1 py-0.2 rounded text-[9px] tracking-widest font-mono text-zinc-400">UHD 4K</span>
            <span className="border border-zinc-700 px-1 py-0.2 rounded text-[9px] tracking-widest font-mono text-zinc-400">ATMOS</span>
          </div>

          <p className="text-sm sm:text-base text-zinc-300 font-sans font-light leading-relaxed max-w-xl">
            When words are not enough, these small envelopes of quiet whispers, soft laughter, and late-night thoughts are delivered in real-time. An interactive romantic audio portfolio created exclusively for Fatima.
          </p>

          <div className="flex items-center gap-3 pt-2">
            {/* Play/Listen Button */}
            <button
              id="speak-from-heart-btn"
              onClick={handlePlayFirstEpisode}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-zinc-200 active:scale-95 text-black rounded-xl text-xs sm:text-sm font-sans font-black uppercase tracking-wide transition-all shadow-md"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>{voicemails.length > 0 ? "Play First Episode" : "Start Series"}</span>
            </button>

            {/* Speak/Record Button */}
            <button
              onClick={() => setShowRecorder(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-sans font-black uppercase tracking-wide border border-zinc-700/60 transition-all"
            >
              <Mic className="w-4 h-4 text-red-500 animate-bounce" />
              <span>Speak from your heart</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 pt-4 relative z-20 space-y-8">
        
        {/* Section 1: Daily Match Greetings */}
        <DailyGreetings userName={activeProfile.name} />

        {/* Section 3: Historical Filter Buttons for Category Popup Sheets */}
        <div className="bg-zinc-900/60 border border-zinc-850 p-4 sm:p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-red-600" />
            <h3 className="font-sans text-xs font-black text-zinc-400 tracking-wider uppercase">
              Browse Memory Chapters
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full">
            <button
              id="btn-this-month"
              onClick={() => setSelectedOverlayCategory('month')}
              className="flex flex-col items-center justify-center p-3.5 bg-zinc-950 hover:bg-zinc-900 active:scale-95 text-white rounded-xl border border-zinc-800 shadow-sm transition-all text-center"
            >
              <Calendar className="w-5 h-5 text-red-500 mb-1.5" />
              <span className="font-sans text-[11px] sm:text-xs font-bold tracking-tight">This Month</span>
            </button>

            <button
              id="btn-this-year"
              onClick={() => setSelectedOverlayCategory('year')}
              className="flex flex-col items-center justify-center p-3.5 bg-zinc-950 hover:bg-zinc-900 active:scale-95 text-white rounded-xl border border-zinc-800 shadow-sm transition-all text-center"
            >
              <BookOpen className="w-5 h-5 text-zinc-400 mb-1.5" />
              <span className="font-sans text-[11px] sm:text-xs font-bold tracking-tight">This Year</span>
            </button>

            <button
              id="btn-treasured-moments"
              onClick={() => setSelectedOverlayCategory('treasured')}
              className="flex flex-col items-center justify-center p-3.5 bg-zinc-950 hover:bg-zinc-900 active:scale-95 text-white rounded-xl border border-zinc-800 shadow-sm transition-all text-center"
            >
              <Heart className="w-5 h-5 text-amber-500 fill-amber-500 mb-1.5" />
              <span className="font-sans text-[11px] sm:text-xs font-bold tracking-tight">Treasured</span>
            </button>
          </div>
        </div>

        {/* Section 4: Main Season Timeline List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <div>
              <h3 className="font-sans text-lg sm:text-xl text-white font-extrabold tracking-tight">Whispered Episodes</h3>
              <p className="font-sans text-xs text-zinc-500">Every sweet voice note delivered directly. Connect with headphones for full fidelity.</p>
            </div>
            
            <span className="text-[10px] font-sans font-black bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-400">
              {voicemails.length} EPISODES
            </span>
          </div>

          <VoicemailList
            voicemails={voicemails}
            onSelectVoicemail={handleSelectVoicemail}
            onToggleFavorite={handleToggleFavorite}
            onToggleArchive={handleToggleArchive}
            onDelete={handleDeleteVoicemail}
            activeProfileId={activeProfile?.id}
            activeProfileName={activeProfile?.name}
          />
        </div>

      </div>

      {/* Footer Info */}
      <footer className="mt-20 pt-10 border-t border-zinc-900 text-center text-zinc-600 text-xs flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 px-4 py-2 rounded-xl">
          <Info className="w-3.5 h-3.5 text-zinc-500" />
          <span className="font-sans">Offline Encryption: All episodes are safely cached inside your personal browser sandbox.</span>
        </div>
        <p className="font-sans font-bold text-zinc-500 mt-2 select-none">
          VOICEMAILS FOR FATIMA · Abbas Original Series
        </p>
      </footer>

      {/* 4. Interactive Dialog / Bottom Sheet Modals */}
      <AnimatePresence>
        {/* Category Overlay Sheet Modal */}
        {selectedOverlayCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOverlayCategory(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-2xl h-[85vh] bg-zinc-950 rounded-2xl p-5 shadow-2xl border border-zinc-850 flex flex-col relative z-10 overflow-hidden text-white"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  {selectedOverlayCategory === 'month' && <Calendar className="w-5 h-5 text-red-500" />}
                  {selectedOverlayCategory === 'year' && <BookOpen className="w-5 h-5 text-zinc-400" />}
                  {selectedOverlayCategory === 'treasured' && <Heart className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />}
                  <h3 className="font-sans text-lg text-white font-extrabold tracking-tight">
                    {selectedOverlayCategory === 'month' && "This Month's Episodes"}
                    {selectedOverlayCategory === 'year' && "This Year's Episodes"}
                    {selectedOverlayCategory === 'treasured' && 'My Treasured List'}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOverlayCategory(null)}
                  className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                <VoicemailList
                  voicemails={
                    selectedOverlayCategory === 'month'
                      ? voicemails.filter(v => getDynamicCategory(v.timestamp) === 'This Month')
                      : selectedOverlayCategory === 'year'
                      ? voicemails.filter(v => getDynamicCategory(v.timestamp) === 'This Year')
                      : voicemails.filter(v => v.isFavorite)
                  }
                  onSelectVoicemail={handleSelectVoicemail}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleArchive={handleToggleArchive}
                  onDelete={handleDeleteVoicemail}
                  hideToolbar={true}
                  activeProfileId={activeProfile?.id}
                  activeProfileName={activeProfile?.name}
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Voicemail Player Modal */}
        {selectedVoicemail && (
          <VoicemailPlayer
            voicemail={selectedVoicemail}
            onClose={() => {
              setSelectedVoicemail(null);
              if (window.history.state?.playerOpen) {
                window.history.back();
              }
            }}
            onToggleFavorite={handleToggleFavorite}
            onToggleArchive={handleToggleArchive}
            onDelete={handleDeleteVoicemail}
          />
        )}

        {/* Voicemail Recorder Modal */}
        {showRecorder && (
          <VoicemailRecorder
            onAddVoicemail={handleAddVoicemail}
            onClose={() => setShowRecorder(false)}
          />
        )}

        {/* Toast Notification Banner */}
        {notificationToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] bg-zinc-950 border border-red-600/40 text-white px-5 py-4 rounded-xl shadow-[0_0_25px_rgba(220,38,38,0.25)] flex items-center gap-4 max-w-md w-11/12"
          >
            <div className="w-10 h-10 bg-red-600/10 border border-red-600/30 rounded-lg flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <h5 className="font-sans font-extrabold text-[10px] tracking-wider uppercase text-zinc-400">🔔 Episode Alert</h5>
              <p className="font-sans font-bold text-xs sm:text-sm text-white mt-0.5 leading-tight">
                {notificationToast.message}
              </p>
              {notificationToast.voicemail && (
                <button
                  onClick={() => {
                    if (notificationToast.voicemail) {
                      handleSelectVoicemail(notificationToast.voicemail);
                    }
                    setNotificationToast(null);
                  }}
                  className="font-sans text-[10px] sm:text-[11px] font-extrabold text-red-500 hover:text-red-400 uppercase tracking-widest mt-1.5 text-left block"
                >
                  Listen Now →
                </button>
              )}
            </div>
            <button
              onClick={() => setNotificationToast(null)}
              className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Heartfelt Secret Message Toast */}
        {showSecretToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-950 border border-red-900/40 text-red-100 px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 max-w-sm w-11/12"
          >
            <Heart className="w-5 h-5 text-red-500 fill-red-500 flex-shrink-0 animate-bounce" />
            <div className="text-left">
              <h5 className="font-sans font-extrabold text-sm text-white">Quiet Gratitude</h5>
              <p className="font-serif italic text-xs text-red-200 leading-relaxed">
                "Thank you for keeping these small, quiet moments alive."
              </p>
            </div>
            <button
              onClick={() => setShowSecretToast(false)}
              className="text-red-400 hover:text-white text-xs font-sans font-bold uppercase ml-auto"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
