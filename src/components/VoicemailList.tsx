import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceLetter, StoryCategory } from '../types';
import { Play, Heart, Archive, Search, Filter, Sparkles, Tv, Star, Trash2 } from 'lucide-react';

interface VoicemailListProps {
  voicemails: VoiceLetter[];
  onSelectVoicemail: (letter: VoiceLetter) => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDelete?: (id: string) => void;
  hideToolbar?: boolean;
  activeProfileId?: string;
  activeProfileName?: string;
}

export const VoicemailList: React.FC<VoicemailListProps> = ({
  voicemails,
  onSelectVoicemail,
  onToggleFavorite,
  onToggleArchive,
  onDelete,
  hideToolbar = false,
  activeProfileId,
  activeProfileName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'all' | 'treasured' | 'memories'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dynamically extract chapters that actually exist in the voicemails list
  const dynamicChapters = Array.from(
    new Set(voicemails.map((v) => v.chapter).filter((c) => typeof c === 'string' && c.trim() !== ''))
  );

  // Filter voicemails
  const filteredVoicemails = voicemails.filter((item) => {
    if (hideToolbar) return true;

    // 1. Text Search
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.noteText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.senderName.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Chapter Filter
    const matchesChapter = selectedChapter === 'All' || item.chapter === selectedChapter;

    // 3. Tab Filter (Treasured / Remembered)
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'treasured' && item.isFavorite) ||
      (activeTab === 'memories' && item.isArchived);

    return matchesSearch && matchesChapter && matchesTab;
  });

  // Sort by date (newest first)
  const sortedVoicemails = [...filteredVoicemails].sort((a, b) => b.timestamp - a.timestamp);

  const hasAnyResults = sortedVoicemails.length > 0;

  return (
    <div className="space-y-6 relative z-20">
      
      {/* Netflix-style Search & Filter Toolbar */}
      {!hideToolbar && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
          
          {/* Search */}
          <div className={`${dynamicChapters.length > 0 ? 'md:col-span-4' : 'md:col-span-6'} relative flex items-center`}>
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 pointer-events-none" />
            <input
              id="timeline-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search episodes or phrases..."
              className="w-full pl-11 pr-4 py-2.5 bg-zinc-950 focus:bg-zinc-950/80 rounded-xl text-xs font-sans text-white placeholder-zinc-500 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-red-600 transition-all duration-300"
            />
          </div>

          {/* Chapter Filter - Only show if chapters have actually been added */}
          {dynamicChapters.length > 0 && (
            <div className="md:col-span-4 relative flex items-center">
              <Filter className="w-4 h-4 text-zinc-500 absolute left-4 pointer-events-none" />
              <select
                id="timeline-chapter-select"
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full pl-11 pr-8 py-2.5 bg-zinc-950 focus:bg-zinc-950/80 rounded-xl text-xs font-sans text-zinc-300 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-red-600 transition-all duration-300 appearance-none cursor-pointer"
              >
                <option value="All">All Chapters</option>
                {dynamicChapters.map((chap) => (
                  <option key={chap} value={chap}>{chap}</option>
                ))}
              </select>
              <div className="absolute right-4 pointer-events-none text-zinc-500 text-[10px]">▼</div>
            </div>
          )}

          {/* Netflix Filter Tabs */}
          <div className={`${dynamicChapters.length > 0 ? 'md:col-span-4' : 'md:col-span-6'} flex bg-zinc-950 p-1 rounded-xl border border-zinc-800`}>
            <button
              id="tab-all-memories"
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-bold tracking-wide transition-all ${
                activeTab === 'all'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All Episodes
            </button>
            <button
              id="tab-treasured-moments"
              onClick={() => setActiveTab('treasured')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-bold tracking-wide transition-all flex items-center justify-center gap-1 ${
                activeTab === 'treasured'
                  ? 'bg-zinc-800 text-red-500 shadow-sm'
                  : 'text-zinc-500 hover:text-red-400'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-red-600 text-red-600" />
              <span>My List</span>
            </button>
            <button
              id="tab-our-memories"
              onClick={() => setActiveTab('memories')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-bold tracking-wide transition-all flex items-center justify-center gap-1 ${
                activeTab === 'memories'
                  ? 'bg-zinc-800 text-red-400 shadow-sm'
                  : 'text-zinc-500 hover:text-red-300'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-zinc-400" />
              <span>Memories</span>
            </button>
          </div>

        </div>
      )}

      {/* Episodes List formatted as Netflix Series Episodes layout */}
      <div className="space-y-4">
        {hasAnyResults ? (
          <div className="flex flex-col gap-4 w-full">
            {sortedVoicemails.map((item, index) => {
              const isUnread = activeProfileId && 
                item.senderName !== activeProfileName && 
                !(item.listenedBy?.includes(activeProfileId));

              return (
                <motion.div
                  id={`letter-card-${item.id}`}
                  key={item.id}
                  whileHover={{ x: 6, backgroundColor: 'rgba(39, 39, 42, 0.4)' }}
                  transition={{ duration: 0.2 }}
                  className={`bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 flex items-center justify-between gap-4 transition-all group overflow-hidden relative ${
                    isUnread ? 'border-l-4 border-l-red-600 bg-zinc-900/90 shadow-[0_0_15px_rgba(220,38,38,0.15)]' : ''
                  }`}
                >
                {/* Horizontal Episode Layout */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  {/* Episode Numbering index */}
                  <span className="font-sans font-black text-2xl sm:text-3xl text-zinc-700 group-hover:text-red-600/60 transition-colors w-6 text-center select-none">
                    {index + 1}
                  </span>

                  {/* Fully clickable episode content as a native button for flawless mobile performance */}
                  <button
                    type="button"
                    onClick={() => onSelectVoicemail(item)}
                    className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 text-left focus:outline-none cursor-pointer group/btn"
                  >
                    {/* Simulated video poster with live pulsing soundwave */}
                    <div className="w-20 sm:w-32 h-14 sm:h-20 bg-zinc-950 rounded-lg relative overflow-hidden flex-shrink-0 border border-zinc-800/80 group-hover/btn:border-red-600/40 transition-colors flex items-center justify-center">
                      {/* Glowing background shapes */}
                      <div className="absolute inset-0 bg-gradient-to-t from-red-950/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                      
                      {/* Miniature heartbeat/audio bars in the video frame */}
                      <div className="flex items-end gap-1 h-8">
                        {[...Array(6)].map((_, barIdx) => (
                          <motion.div
                            key={barIdx}
                            className="w-0.5 sm:w-1 bg-red-600 rounded-full"
                            animate={{
                              height: ['15%', '85%', '15%'],
                            }}
                            transition={{
                              duration: 1.2 + barIdx * 0.15,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>

                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/btn:opacity-100 transition-opacity">
                        <div className="p-2 bg-red-600 rounded-full text-white shadow-lg">
                          <Play className="w-4 h-4 fill-white" />
                        </div>
                      </div>

                      {/* Duration badge */}
                      <span className="absolute bottom-1 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider text-white">
                        {item.duration}
                      </span>
                    </div>

                    {/* Metadata and synopsis description */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isUnread && (
                          <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-sans font-black tracking-widest text-white bg-red-600 rounded uppercase animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            <span>NEW EPISODE</span>
                          </span>
                        )}
                        {item.chapter && item.chapter.trim() !== '' && (
                          <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-sans font-black tracking-widest text-red-500 bg-red-950/40 border border-red-900/30 rounded uppercase">
                            {item.chapter}
                          </span>
                        )}
                        {item.isFavorite && (
                          <span className="text-[9px] font-bold text-amber-500 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-500" />
                            <span>Treasured</span>
                          </span>
                        )}
                      </div>

                      <h4 className="font-sans text-sm sm:text-base text-white font-bold truncate group-hover/btn:text-red-500 transition-colors">
                        {item.title}
                      </h4>

                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <p className="font-mono text-[9px] text-zinc-500">
                          from <span className="text-zinc-400 font-bold">{item.senderName}</span> • {item.dateString}
                        </p>
                        
                        {item.reactions && item.reactions.length > 0 && (
                          <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-850/60 px-1.5 py-0.5 rounded-full">
                            {item.reactions.map((r, rIdx) => {
                              const isByFatima = r.profileId === 'fatima';
                              return (
                                <motion.span
                                  key={rIdx}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: [0, 1.3, 1] }}
                                  className="inline-block text-[11px] cursor-default"
                                  title={`Reacted ${r.emoji} by ${isByFatima ? 'Fatima' : 'Abbas'}`}
                                >
                                  {r.emoji}
                                </motion.span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <p className="font-serif italic text-[11px] sm:text-xs text-zinc-400 line-clamp-1 sm:line-clamp-2 mt-1 leading-relaxed max-w-lg">
                        "{item.noteText}"
                      </p>
                    </div>
                  </button>
                </div>

                {/* Perfect single row, highly aligned interactive actions */}
                <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                  {/* Favorite / List toggle action */}
                  <button
                    id={`card-favorite-btn-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item.id);
                    }}
                    className={`p-2 rounded-full border border-zinc-800 transition-all duration-300 hover:bg-zinc-800 ${
                      item.isFavorite ? 'text-red-500 border-red-900/40 bg-red-950/20' : 'text-zinc-500 hover:text-red-500'
                    }`}
                    title={item.isFavorite ? "Remove from List" : "Add to List"}
                  >
                    <Heart className={`w-4 h-4 ${item.isFavorite ? 'fill-red-600 text-red-600' : ''}`} />
                  </button>

                  {/* Archive / Memories toggle action */}
                  <button
                    id={`card-archive-btn-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleArchive(item.id);
                    }}
                    className={`p-2 rounded-full border border-zinc-800 transition-all duration-300 hover:bg-zinc-800 ${
                      item.isArchived ? 'text-red-400 border-zinc-700 bg-zinc-850' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title={item.isArchived ? "Unarchive" : "Archive"}
                  >
                    <Tv className="w-4 h-4" />
                  </button>

                  {/* Delete / Let Go action directly from list */}
                  {onDelete && (
                    <button
                      id={`card-delete-btn-${item.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(item.id);
                      }}
                      className="p-2 rounded-full border border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-900/40 hover:bg-red-950/20 transition-all duration-300"
                      title="Delete Voicemail"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Listen Play Button */}
                  <button
                    id={`card-play-btn-${item.id}`}
                    onClick={() => onSelectVoicemail(item)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-sans font-bold tracking-wide active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Play className="w-3 h-3 fill-black text-black" />
                    <span className="hidden sm:inline">Play</span>
                  </button>
                </div>
              </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-zinc-850 p-6">
            <Heart className="w-10 h-10 text-red-600/50 mx-auto mb-3 animate-pulse" />
            <h4 className="font-sans text-sm font-bold text-zinc-400 uppercase tracking-wider">No Whispered Episodes Yet</h4>
            <p className="font-sans text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Begin your shared romantic series! Press <strong className="text-zinc-300">"Speak from your heart"</strong> above to deliver your first genuine voicemail to each other.
            </p>
          </div>
        )}
      </div>
      
      {/* Custom Deletion Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingId(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-zinc-950 rounded-2xl p-6 sm:p-8 shadow-2xl border border-zinc-850 relative z-10 text-center"
            >
              <div className="w-14 h-14 bg-red-950/40 border border-red-900/40 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              
              <h4 className="font-sans text-base sm:text-lg text-white font-extrabold tracking-tight mb-2">
                Let go of this memory?
              </h4>
              <p className="font-sans text-xs text-zinc-400 leading-relaxed mb-6">
                Are you sure you want to delete this whispered voicemail episode? This action is permanent and cannot be undone.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-805 border border-zinc-800 rounded-xl text-xs font-sans font-bold uppercase tracking-widest text-zinc-300 transition-colors cursor-pointer"
                >
                  Keep It
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDelete && deletingId) {
                      onDelete(deletingId);
                    }
                    setDeletingId(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-widest shadow-lg shadow-red-900/30 transition-colors cursor-pointer"
                >
                  Let Go
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
