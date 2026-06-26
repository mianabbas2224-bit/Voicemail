export type ChapterType =
  | 'The First Laugh'
  | 'The Day We Missed Each Other'
  | 'Our First Eid Together'
  | 'Late Night Thoughts'
  | 'Just Because'
  | 'Under the Stars'
  | 'Whispered Secrets';

export type StoryCategory = 'Today' | 'This Month' | 'This Year' | 'Our Story';

export interface VoiceLetter {
  id: string;
  senderName: string;
  chapter?: string;
  category?: string;
  title: string;
  dateString: string; // E.g., "A quiet evening · 14 February 2026 · 9:42 PM"
  duration: string; // E.g., "1:42"
  noteText: string; // Romantic note accompanying the voicemail
  isFavorite: boolean; // Treasured Moments
  isArchived: boolean; // Our Memories
  audioBlobUrl?: string; // Recorded local audio
  synthPresetIndex?: number; // Pre-loaded ambient track preset index
  timestamp: number; // Unix timestamp for sorting
  listenedBy?: string[]; // Array of profile IDs who have listened
}

export interface AtmosphereSound {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  volume: number; // 0 to 1
  isPlaying: boolean;
}

export interface AppTheme {
  id: string;
  name: string;
  bgClass: string;
  cardClass: string;
  textClass: string;
  accentClass: string;
  textColor: string;
  accentColor: string;
}
