export type SubscriptionTier = 'basic' | 'pro' | 'premium';

export interface UserAccount {
  uid: string;
  email: string | null;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
}

export interface ViewerProfile {
  id: string;
  name: string;
  avatarUrl: string;
  isKid: boolean;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  genre: string;
  rating: string;
  year: number;
  duration: string;
  isPremium: boolean;
  type: 'movie' | 'series';
  requiredTier: SubscriptionTier;
}

export interface WatchlistItem {
  movieId: string;
  addedAt: string;
}

export interface HistoryItem {
  movieId: string;
  watchedAt: string;
  lastPosition: number;
}

export interface WatchParty {
  id: string;
  hostId: string;
  hostName: string;
  movieId: string;
  status: 'waiting' | 'playing' | 'paused' | 'finished';
  currentTime: number;
  participantCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface LiveReaction {
  id: string;
  emoji: string;
  userName: string;
  userId: string;
  timestamp: string;
}

export interface CommunityMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}
