import React, { useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  limit
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { 
  UserAccount, 
  Movie, 
  WatchParty, 
  SubscriptionTier, 
  ViewerProfile, 
  WatchlistItem, 
  HistoryItem,
  CommunityMessage 
} from './types';

interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

function handleFirestoreError(error: any, opType: FirestoreErrorInfo['operationType'], path: string | null) {
  if (error.code === 'permission-denied') {
    const info: FirestoreErrorInfo = {
      error: error.message,
      operationType: opType,
      path: path,
      authInfo: {
        userId: auth.currentUser?.uid || 'none',
        email: auth.currentUser?.email || 'none',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || false,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(info));
  }
  console.error(`Firestore Error [${opType}] at [${path}]:`, error);
}

import { 
  Play, 
  Users, 
  LogOut, 
  Tv, 
  ChevronRight, 
  X, 
  MessageSquare, 
  Crown, 
  Search,
  Check,
  Plus,
  History,
  Bookmark,
  Home,
  PlayCircle,
  ChevronDown,
  Mail,
  Lock,
  Phone,
  ArrowLeft,
  Settings,
  ShieldCheck,
  Zap,
  Star,
  Heart,
  Flame,
  Smile,
  Calendar,
  LayoutGrid,
  Clapperboard,
  User as UserIcon,
  CreditCard,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence, useIsPresent } from 'motion/react';
import ReactPlayer from 'react-player';

// --- MOCK DATA ---
const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackDualEye.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4'
];

const GENRES = ['Action', 'Sci-Fi', 'Thriller', 'Cyberpunk', 'Documentary', 'Drama', 'Adventure', 'Fantasy'];

const tierWeight = { basic: 0, pro: 1, premium: 2 };
const isTierSufficient = (userTier: string = 'basic', requiredTier: string = 'basic') => {
  return (tierWeight as any)[userTier] >= (tierWeight as any)[requiredTier];
};

const MOCK_MOVIES: Movie[] = [
  {
    id: 'm1',
    title: 'Interstellar Odyssey',
    description: 'A team of explorers travel beyond this galaxy to discover whether mankind has a future among the stars.',
    thumbnailUrl: 'https://picsum.photos/seed/space1/800/450',
    videoUrl: SAMPLE_VIDEOS[0],
    genre: 'Sci-Fi',
    rating: '8.7',
    year: 2024,
    duration: '2h 49m',
    isPremium: true,
    type: 'movie',
    requiredTier: 'premium'
  },
  {
    id: 'm2',
    title: 'Neon Nights',
    description: 'A detective navigates the underworld of a futuristic city to solve a corporate conspiracy.',
    thumbnailUrl: 'https://picsum.photos/seed/neon/800/450',
    videoUrl: SAMPLE_VIDEOS[1],
    genre: 'Cyberpunk',
    rating: '7.9',
    year: 2025,
    duration: '2h 12m',
    isPremium: true,
    type: 'series',
    requiredTier: 'pro'
  },
  {
    id: 'm3',
    title: 'The Silent Peak',
    description: 'Survival becomes the only goal for a mountaineer trapped in the Himalayas.',
    thumbnailUrl: 'https://picsum.photos/seed/peak/800/450',
    videoUrl: SAMPLE_VIDEOS[7],
    genre: 'Thriller',
    rating: '8.1',
    year: 2023,
    duration: '1h 55m',
    isPremium: true,
    type: 'movie',
    requiredTier: 'premium'
  },
  {
    id: 'm4',
    title: 'Ocean Deep',
    description: 'Discover the secrets of the world\'s most forgotten depths in this stunning documentary.',
    thumbnailUrl: 'https://picsum.photos/seed/ocean/800/450',
    videoUrl: SAMPLE_VIDEOS[9],
    genre: 'Documentary',
    rating: '8.4',
    year: 2024,
    duration: '1h 30m',
    isPremium: false,
    type: 'movie',
    requiredTier: 'basic'
  }
];

const AVATARS = [
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Anita',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Cooper',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Milo',
];

const UPCOMING_MOVIES: Movie[] = [
  {
    id: 'u1',
    title: 'The Singularity',
    description: 'A mind-bending journey into the future of artificial intelligence and human consciousness.',
    thumbnailUrl: 'https://picsum.photos/seed/singularity/800/450',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    genre: 'Sci-Fi',
    rating: '9.2',
    year: 2026,
    duration: 'Trailer',
    isPremium: true,
    type: 'movie',
    requiredTier: 'pro'
  },
  {
    id: 'u2',
    title: 'Void Runner',
    description: 'In the farthest reaches of space, one pilot must navigate a collapsing wormhole.',
    thumbnailUrl: 'https://picsum.photos/seed/void/800/450',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    genre: 'Action',
    rating: '8.8',
    year: 2026,
    duration: 'Trailer',
    isPremium: true,
    type: 'movie',
    requiredTier: 'premium'
  },
  {
    id: 'u3',
    title: 'Echoes of Atlas',
    description: 'The ancient gods return to a world that has forgotten them.',
    thumbnailUrl: 'https://picsum.photos/seed/atlas/800/450',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    genre: 'Fantasy',
    rating: '8.5',
    year: 2025,
    duration: 'Trailer',
    isPremium: false,
    type: 'movie',
    requiredTier: 'basic'
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ViewerProfile | null>(null);
  const [profiles, setProfiles] = useState<ViewerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeParty, setActiveParty] = useState<WatchParty | null>(null);
  const [activeSoloMovie, setActiveSoloMovie] = useState<Movie | null>(null);
  const [parties, setParties] = useState<WatchParty[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showPricing, setShowPricing] = useState(false);
  const [showCommunityChat, setShowCommunityChat] = useState(false);
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [movies, setMovies] = useState<Movie[]>(MOCK_MOVIES);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'upcoming' | 'menu'>('home');
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  // --- APEX CINEMA ENGINE (TMDB PROXY) ---
  useEffect(() => {
    const fetchProtocol = async () => {
      try {
        const response = await fetch('/api/cinema?type=all');
        const data = await response.json();
        if (Array.isArray(data)) setMovies(data);
      } catch (error) {
        console.error('Protocol Fetch Error:', error);
      }
    };
    fetchProtocol();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const deepSearch = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/cinema?query=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        if (Array.isArray(data)) setSearchResults(data);
      } catch (error) {
        console.error('Deep Search Protocol Failure:', error);
      } finally {
        setIsSearching(false);
      }
    }, 600);
    return () => clearTimeout(deepSearch);
  }, [searchQuery]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          setAccount(userDoc.data() as UserAccount);
        } else {
          const newAccount: UserAccount = {
            uid: authUser.uid,
            email: authUser.email,
            subscriptionTier: 'basic',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', authUser.uid), newAccount);
          setAccount(newAccount);
          setShowPricing(true);
        }
      } else {
        setUser(null);
        setAccount(null);
        setSelectedProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // --- PROFILES LOADING ---
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'profiles'), 
      (snap) => {
        const pData = snap.docs.map(d => ({ id: d.id, ...d.data() } as ViewerProfile));
        setProfiles(pData);
        if (pData.length === 0 && !loading) {
          // Create initial profile if none exists
          const initialProfile: ViewerProfile = {
            id: 'p1',
            name: user.displayName || 'Me',
            avatarUrl: AVATARS[0],
            isKid: false
          };
          setDoc(doc(db, 'users', user.uid, 'profiles', initialProfile.id), initialProfile)
            .catch(e => handleFirestoreError(e, 'create', `/users/${user.uid}/profiles/p1`));
          setSelectedProfile(initialProfile);
        }
      },
      (error) => handleFirestoreError(error, 'list', `/users/${user.uid}/profiles`)
    );
    return unsub;
  }, [user, loading]);

  // --- WATCHLIST & HISTORY LOADING ---
  useEffect(() => {
    if (!user || !selectedProfile) return;
    const unsubW = onSnapshot(collection(db, 'users', user.uid, 'profiles', selectedProfile.id, 'watchlist'), 
      (snap) => {
        setWatchlist(snap.docs.map(d => d.id));
      },
      (error) => handleFirestoreError(error, 'list', `/users/${user.uid}/profiles/${selectedProfile.id}/watchlist`)
    );
    const unsubH = onSnapshot(query(collection(db, 'users', user.uid, 'profiles', selectedProfile.id, 'history'), orderBy('watchedAt', 'desc'), limit(10)), 
      (snap) => {
        setHistory(snap.docs.map(d => d.data() as HistoryItem));
      },
      (error) => handleFirestoreError(error, 'list', `/users/${user.uid}/profiles/${selectedProfile.id}/history`)
    );
    return () => { unsubW(); unsubH(); };
  }, [user, selectedProfile]);

  // --- PARTIES LOADING ---
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'parties'), where('status', 'in', ['waiting', 'playing', 'paused']));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setParties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WatchParty)));
      },
      (error) => handleFirestoreError(error, 'list', '/parties')
    );
    return unsubscribe;
  }, [user]);

  // --- ACTIONS ---
  const toggleWatchlist = async (movieId: string) => {
    if (!user || !selectedProfile) return;
    const ref = doc(db, 'users', user.uid, 'profiles', selectedProfile.id, 'watchlist', movieId);
    const exists = watchlist.includes(movieId);
    if (exists) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { movieId, addedAt: new Date().toISOString() });
    }
  };

  const addToHistory = async (movieId: string, pos: number = 0) => {
    if (!user || !selectedProfile) return;
    const ref = doc(db, 'users', user.uid, 'profiles', selectedProfile.id, 'history', movieId);
    await setDoc(ref, {
      movieId,
      watchedAt: new Date().toISOString(),
      lastPosition: pos
    });
  };

  const startParty = async (movie: Movie) => {
    if (!user || !account || !selectedProfile) return;
    if (movie.isPremium && account.subscriptionTier === 'basic') {
      setShowPricing(true);
      return;
    }
    const partyData = {
      hostId: user.uid,
      hostName: selectedProfile.name,
      movieId: movie.id,
      status: 'playing',
      currentTime: 0,
      participantCount: 1,
      createdAt: new Date().toISOString()
    };
    try {
      const docRef = await addDoc(collection(db, 'parties'), partyData);
      setActiveParty({ id: docRef.id, ...partyData } as WatchParty);
      addToHistory(movie.id);
    } catch (error) {
      console.error('Error starting party:', error);
      alert('Failed to start party. Check your connection.');
    }
  };

  const handleAddProfile = async () => {
    if (!user || !newProfileName.trim()) return;
    const id = `p${Date.now()}`;
    const profile: ViewerProfile = {
      id,
      name: newProfileName.trim(),
      avatarUrl: AVATARS[profiles.length % AVATARS.length],
      isKid: false
    };
    try {
      await setDoc(doc(db, 'users', user.uid, 'profiles', id), profile);
      setIsAddingProfile(false);
      setNewProfileName('');
    } catch (error) {
      console.error('Profile Creation Error:', error);
      alert('Could not create profile. Please try again.');
    }
  };

  const handleWatchSolo = (movie: Movie) => {
    setActiveSoloMovie(movie);
    addToHistory(movie.id);
  };

  if (loading) return <LoadingScreen />;

  if (!user) return <AuthScreen />;

  if (!selectedProfile) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-dark-bg p-8">
      <div className="atmosphere" />
      <h1 className="text-4xl font-serif font-black mb-12 uppercase tracking-widest text-glow">Who's Watching?</h1>
      
      <div className="flex flex-wrap justify-center gap-12 max-w-4xl">
        {profiles.map(p => (
          <motion.div 
            whileHover={{ scale: 1.1, y: -5 }}
            key={p.id} 
            onClick={() => setSelectedProfile(p)}
            className="flex flex-col items-center gap-4 cursor-pointer group"
          >
            <div className="w-36 h-36 rounded-3xl overflow-hidden border-4 border-transparent group-hover:border-netflix-red transition-all shadow-2xl group-hover:shadow-netflix-red/20 relative">
              <img src={p.avatarUrl} alt={p.name} className="w-full h-full bg-white/5" />
              <div className="absolute inset-0 bg-netflix-red opacity-0 group-hover:opacity-10 transition-opacity" />
            </div>
            <span className="text-xl font-bold text-white/40 group-hover:text-white uppercase tracking-tighter transition-colors">{p.name}</span>
          </motion.div>
        ))}

        {!isAddingProfile ? (
          <motion.div 
            whileHover={{ scale: 1.1 }}
            onClick={() => setIsAddingProfile(true)}
            className="flex flex-col items-center gap-4 cursor-pointer group"
          >
            <div className="w-36 h-36 rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center group-hover:bg-white/5 group-hover:border-white/40 transition-all">
              <Plus className="w-12 h-12 text-white/20 group-hover:text-white group-hover:rotate-90 transition-all duration-500" />
            </div>
            <span className="text-xl font-bold text-white/20 group-hover:text-white uppercase tracking-tighter">Add Profile</span>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 w-36"
          >
             <div className="w-36 h-36 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center p-4">
                <input 
                  autoFocus
                  type="text" 
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  placeholder="Name"
                  className="w-full bg-transparent border-b border-white text-center text-lg focus:outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleAddProfile()}
                />
             </div>
             <div className="flex gap-2">
                <button onClick={handleAddProfile} className="p-2 bg-netflix-red rounded-lg"><Check className="w-4 h-4" /></button>
                <button onClick={() => setIsAddingProfile(false)} className="p-2 bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-app-bg selection:bg-netflix-red selection:text-white relative">
      <div className="atmosphere" />
      
      <AnimatePresence mode="wait">
        {activeSoloMovie ? (
          <SoloPlayer 
            key="solo-player"
            movie={activeSoloMovie} 
            user={user}
            profile={selectedProfile}
            onExit={() => setActiveSoloMovie(null)} 
          />
        ) : activeParty ? (
          <PartyRoom 
            key="party-room"
            party={activeParty} 
            user={user} 
            profile={selectedProfile}
            onExit={() => setActiveParty(null)} 
            movie={movies.find(m => m.id === activeParty.movieId) || movies[0]}
          />
        ) : (
          <motion.div 
            key="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Navbar 
              account={account} 
              selectedProfile={selectedProfile}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onLogout={() => { setSelectedProfile(null); signOut(auth); }} 
              onPricingClick={() => setShowPricing(true)} 
              onSwitchProfile={() => setSelectedProfile(null)}
              onChatToggle={() => setShowCommunityChat(!showCommunityChat)}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onProfileClick={() => setShowProfileDetails(true)}
            />
            
            <main className="pt-20 pb-32 lg:pb-20">
              {searchQuery ? (
              <div className="max-w-7xl mx-auto pt-12 space-y-12">
                <div className="px-12 flex flex-col gap-2">
                  <h2 className="text-4xl font-black uppercase tracking-tighter" id="search-title">Global Search</h2>
                  <p className="text-white/60 font-bold uppercase tracking-widest text-xs">
                    {isSearching ? 'Scanning global cinema metadata...' : `Matching "${searchQuery}"`}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-12" role="region" aria-labelledby="search-title">
                  {isSearching ? (
                     [1,2,3,4].map(i => (
                       <div key={i} className="aspect-video rounded-3xl bg-white/5 animate-pulse border border-white/5" />
                     ))
                  ) : searchResults.length > 0 ? (
                    searchResults.map(movie => (
                      <MovieCard 
                        key={movie.id} 
                        movie={movie} 
                        onWatch={() => handleWatchSolo(movie)} 
                        onStartParty={() => startParty(movie)}
                        currentTier={account?.subscriptionTier}
                        onToggleWatchlist={() => toggleWatchlist(movie.id)}
                        isWatchlisted={watchlist.includes(movie.id)}
                        onPricingClick={() => setShowPricing(true)}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-20 flex flex-col items-center gap-4 text-white/40">
                      <Search className="w-12 h-12" aria-hidden="true" />
                      <p className="text-xl font-bold uppercase tracking-widest italic text-center">No deep search results found matching your query</p>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'upcoming' ? (
              <UpcomingTrailersView 
                movies={UPCOMING_MOVIES} 
                onWatchTrailer={(movie) => handleWatchSolo(movie)}
                currentTier={account?.subscriptionTier}
              />
            ) : activeTab === 'menu' ? (
              <MenuView 
                 watchlist={movies.filter(m => watchlist.includes(m.id))}
                 onWatch={(movie) => handleWatchSolo(movie)}
                 account={account}
                 onPricingClick={() => setShowPricing(true)}
              />
            ) : (
              <>
                <Hero 
                  movie={movies[0] || MOCK_MOVIES[0]} 
                  currentTier={account?.subscriptionTier}
                  onWatch={() => handleWatchSolo(movies[0] || MOCK_MOVIES[0])} 
                  onStartParty={() => startParty(movies[0] || MOCK_MOVIES[0])}
                  onPricingClick={() => setShowPricing(true)}
                />
                
                <div className="max-w-7xl mx-auto space-y-4">
                  {history.length > 0 && (
                    <ContentGrid 
                      title="Continue Watching" 
                      icon={<History className="w-5 h-5 text-green-400" aria-hidden="true" />}
                      content={
                        <MasonryWrapper cols={4}>
                          {movies.filter(m => history.some(h => h.movieId === m.id)).map(movie => (
                            <MovieCard 
                              key={movie.id} 
                              movie={movie} 
                              onWatch={() => handleWatchSolo(movie)} 
                              onStartParty={() => startParty(movie)}
                              currentTier={account?.subscriptionTier}
                              onToggleWatchlist={() => toggleWatchlist(movie.id)}
                              isWatchlisted={watchlist.includes(movie.id)}
                              onPricingClick={() => setShowPricing(true)}
                            />
                          ))}
                        </MasonryWrapper>
                      }
                    />
                  )}

                  <ContentGrid 
                    title="Watch Parties" 
                    icon={<Users className="w-5 h-5 text-netflix-red" aria-hidden="true" />}
                    content={
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-12">
                        {parties.length > 0 ? parties.map(party => {
                          const movie = movies.find(m => m.id === party.movieId);
                          if (!movie) return null;
                          return <PartyCard key={party.id} party={party} movie={movie} onJoin={() => setActiveParty(party)} />;
                        }) : <p className="text-white/20 italic px-4">No live parties. Start one!</p>}
                      </div>
                    }
                  />

                  {watchlist.length > 0 && (
                    <ContentGrid 
                      title="My List" 
                      icon={<Bookmark className="w-5 h-5 text-blue-400" aria-hidden="true" />}
                      content={
                        <MasonryWrapper cols={4}>
                          {movies.filter(m => watchlist.includes(m.id)).map(movie => (
                            <MovieCard 
                              key={movie.id} 
                              movie={movie} 
                              onWatch={() => handleWatchSolo(movie)} 
                              onStartParty={() => startParty(movie)}
                              currentTier={account?.subscriptionTier}
                              onToggleWatchlist={() => toggleWatchlist(movie.id)}
                              isWatchlisted={true}
                              onPricingClick={() => setShowPricing(true)}
                            />
                          ))}
                        </MasonryWrapper>
                      }
                    />
                  )}

                  <ContentGrid 
                    title="Cinema Library" 
                    icon={<Play className="w-5 h-5 text-white/40" aria-hidden="true" />}
                    content={
                      <MasonryWrapper cols={4}>
                        {movies.slice(0, 16).map(movie => (
                          <MovieCard 
                            key={movie.id} 
                            movie={movie} 
                            onWatch={() => handleWatchSolo(movie)} 
                            onStartParty={() => startParty(movie)}
                            currentTier={account?.subscriptionTier}
                            onToggleWatchlist={() => toggleWatchlist(movie.id)}
                            isWatchlisted={watchlist.includes(movie.id)}
                            onPricingClick={() => setShowPricing(true)}
                            isTierSufficient={isTierSufficient}
                          />
                        ))}
                      </MasonryWrapper>
                    }
                  />
                </div>
              </>
            )}
          </main>

          <AnimatePresence>
            {showCommunityChat && (
              <CommunityChatPanel 
                user={user} 
                profile={selectedProfile}
                onClose={() => setShowCommunityChat(false)} 
              />
            )}
          </AnimatePresence>
          
          <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        </motion.div>
      )}
    </AnimatePresence>

      <AnimatePresence>
        {showPricing && (
          <PricingModal 
            currentTier={account?.subscriptionTier || 'basic'} 
            onClose={() => setShowPricing(false)} 
            onUpgrade={async (tier) => {
              if (user) {
                await updateDoc(doc(db, 'users', user.uid), { subscriptionTier: tier });
                setAccount(prev => prev ? { ...prev, subscriptionTier: tier } : null);
                setShowPricing(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileDetails && (
          <ProfileDetailsModal 
            account={account}
            profile={selectedProfile}
            onClose={() => setShowProfileDetails(false)}
            onLogout={() => { setSelectedProfile(null); signOut(auth); setShowProfileDetails(false); }}
            onPricingClick={() => { setShowPricing(true); setShowProfileDetails(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function LoadingScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-black">
      <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
        <h1 className="text-4xl font-black text-netflix-red tracking-[0.2em] italic uppercase">APEXPRIME</h1>
      </motion.div>
    </div>
  );
}

function ProfileDetailsModal({ account, profile, onClose, onLogout, onPricingClick }: any) {
  const stats = [
    { label: 'Watched movies', value: 42, icon: <Clapperboard className="w-4 h-4 text-netflix-red" /> },
    { label: 'Watch parties', value: 12, icon: <Users className="w-4 h-4 text-blue-400" /> },
    { label: 'Global Rank', value: 'Top 5%', icon: <Star className="w-4 h-4 text-yellow-500" /> },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl"
    >
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 40 }}
        className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-netflix-red/20 to-transparent" />
        <div className="p-12 space-y-10 relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-end gap-6">
              <div className="w-32 h-32 rounded-[2.5rem] border-4 border-white overflow-hidden shadow-2xl">
                <img src={profile?.avatarUrl} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="pb-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic">{profile?.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    <UserIcon className="w-3 h-3" /> Viewer ID: {profile?.id}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-all outline-none">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-3">
                <div className="p-2 bg-black/20 rounded-xl w-fit">{stat.icon}</div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{stat.label}</p>
                  <p className="text-xl font-black">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
                  <Crown className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/40">Protocol Tier</p>
                  <p className="text-xl font-black uppercase tracking-tight">{account?.subscriptionTier} User</p>
                </div>
              </div>
              <button 
                onClick={onPricingClick}
                className="px-6 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/90 transition-all"
              >
                Manage Level
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onLogout}
              className="flex-1 py-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white transition-all"
            >
              Sign Out Securely
            </button>
             <button className="p-5 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all">
                <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function UpcomingTrailersView({ movies, onWatchTrailer, currentTier }: any) {
  return (
    <div className="max-w-7xl mx-auto py-12 px-12 space-y-16">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-netflix-red/10 rounded-2xl border border-netflix-red/20 text-netflix-red">
            <Calendar className="w-6 h-6" />
          </div>
          <h2 className="text-5xl font-black uppercase tracking-tighter italic">Upcoming Protocol</h2>
        </div>
        <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-xs">Exclusively fetching future cinematic data</p>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {movies.map((movie: Movie) => (
          <div key={movie.id} className="group relative grid lg:grid-cols-2 gap-12 items-center bg-white/5 p-12 rounded-[3.5rem] border border-white/10 hover:border-white/20 transition-all overflow-hidden">
             <div className="absolute -top-24 -right-24 w-96 h-96 bg-netflix-red/10 blur-[100px] pointer-events-none group-hover:bg-netflix-red/20 transition-all" />
             
             <div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 cursor-pointer" onClick={() => onWatchTrailer(movie)}>
                <img src={movie.thumbnailUrl} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" alt="" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-all">
                   <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-all shadow-white/10">
                      <Play className="w-8 h-8 text-black fill-current translate-x-0.5" />
                   </div>
                </div>
                <div className="absolute top-8 left-8 bg-netflix-red px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                   Trailer Early Access
                </div>
             </div>

             <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-netflix-red font-black text-sm uppercase tracking-widest">{movie.year} Launch</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <h3 className="text-6xl font-black uppercase tracking-tighter leading-[0.9]">{movie.title}</h3>
                  <div className="flex items-center gap-4 text-xs font-bold text-white/40 uppercase tracking-widest">
                    <span>{movie.genre}</span>
                    <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                    <span>Hyperscale Metadata Ready</span>
                  </div>
                </div>
                
                <p className="text-xl text-white/40 leading-relaxed font-light line-clamp-3">{movie.description}</p>
                
                <div className="flex items-center gap-4 pt-4">
                   <button 
                    onClick={() => onWatchTrailer(movie)}
                    className="px-10 py-5 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/90 transition-all active:scale-95 shadow-xl shadow-white/5"
                   >
                     Preview Protocol
                   </button>
                   <button className="p-5 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all">
                      <Bell className="w-5 h-5" />
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuView({ watchlist, onWatch, account, onPricingClick }: any) {
  const categories = [
    { title: 'Global Cinema', icon: <Play className="w-5 h-5" />, items: ['Action', 'Sci-Fi', 'Thriller', 'Cyberpunk', 'Documentary'] },
    { title: 'Social Cinema', icon: <Users className="w-5 h-5" />, items: ['Watch Parties', 'Community Hub', 'Global Chat'] },
    { title: 'Account Meta', icon: <Settings className="w-5 h-5" />, items: ['Security Protocol', 'Encryption Settings', 'Billing Neural Link'] },
  ];

  return (
    <div className="max-w-7xl mx-auto py-12 px-12 space-y-16">
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] space-y-10">
           <div className="space-y-2">
              <h3 className="text-3xl font-black uppercase tracking-tighter">My Protocol List</h3>
              <p className="text-white/40 uppercase text-[10px] font-black tracking-widest">Your synchronized cinematic queue</p>
           </div>
           
           <div className="space-y-4">
             {watchlist.length > 0 ? watchlist.slice(0, 3).map((movie: Movie) => (
                <div key={movie.id} onClick={() => onWatch(movie)} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 hover:border-netflix-red/50 cursor-pointer transition-all group">
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-10 rounded-lg overflow-hidden border border-white/10">
                         <img src={movie.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase tracking-tight group-hover:text-netflix-red transition-all">{movie.title}</p>
                         <p className="text-[9px] text-white/40 uppercase font-bold">{movie.genre}</p>
                      </div>
                   </div>
                   <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-all" />
                </div>
             )) : <p className="text-white/20 italic">No content queued in your protocol.</p>}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
           <div className="col-span-1 bg-netflix-red p-10 rounded-[3rem] space-y-6 flex flex-col justify-between shadow-2xl shadow-netflix-red/20">
              <Crown className="w-10 h-10 text-white" />
              <div className="space-y-2">
                 <p className="text-xs font-black tracking-widest opacity-80 uppercase">Current Tier</p>
                 <h4 className="text-3xl font-black uppercase tracking-tighter">{account?.subscriptionTier}</h4>
              </div>
              <button 
                onClick={onPricingClick}
                className="w-full py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl"
              >
                Change Level
              </button>
           </div>
           <div className="col-span-1 bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-6 flex flex-col justify-between hover:bg-white/10 transition-all cursor-pointer">
              <Bell className="w-10 h-10 text-white/40" />
              <div className="space-y-2">
                 <p className="text-xs font-black tracking-widest opacity-80 uppercase">Alerts</p>
                 <h4 className="text-3xl font-black uppercase tracking-tighter">03 NEW</h4>
              </div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest underline italic">Check Hub</p>
           </div>
           <div className="col-span-2 bg-white p-10 rounded-[3rem] flex items-center justify-between group cursor-pointer hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-8">
                 <div className="p-4 bg-black rounded-3xl">
                    <CreditCard className="w-8 h-8 text-white" />
                 </div>
                 <div>
                    <h4 className="text-2xl font-black uppercase text-black tracking-tighter">Neural Billing</h4>
                    <p className="text-xs text-black/40 font-bold uppercase tracking-widest">Next cycle: May 12, 2026</p>
                 </div>
              </div>
              <div className="p-4 bg-black/5 rounded-full group-hover:bg-netflix-red group-hover:text-white transition-all">
                 <ChevronRight className="w-6 h-6" />
              </div>
           </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {categories.map((cat, i) => (
          <div key={i} className="space-y-6 p-8 border-l border-white/10">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/5 rounded-xl border border-white/10 text-white/40">{cat.icon}</div>
              <h4 className="font-black uppercase tracking-widest text-xs italic">{cat.title}</h4>
            </div>
            <ul className="space-y-3">
              {cat.items.map((item, j) => (
                <li key={j} className="text-xl font-bold text-white/40 hover:text-white transition-all cursor-pointer uppercase tracking-tighter">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<'landing' | 'email' | 'signup'>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch(e) { setError('Login failed'); }
  };

  const handleEmailAuth = async (isSignup: boolean) => {
    setError('');
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch(e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center relative overflow-hidden p-6">
      <div className="absolute inset-0 atmosphere" />
      <div className="absolute inset-x-0 top-12 flex justify-center z-20">
        <h1 className="text-4xl font-serif font-black text-netflix-red tracking-tighter uppercase">Apex<span className="text-white">Prime</span></h1>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 w-full max-w-md glass-morphism rounded-[2.5rem] p-10 space-y-8"
      >
        {mode === 'landing' ? (
          <div className="space-y-8 text-center pt-4">
             <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tight">Welcome to the future of cinema.</h2>
              <p className="text-white/50 font-light">Join millions watching together in synchronized high-fidelity streaming.</p>
            </div>
            <div className="space-y-4">
              <button 
                onClick={() => setMode('signup')}
                className="w-full py-4 bg-netflix-red text-white font-black rounded-2xl hover:bg-netflix-red/90 transition-all flex items-center justify-center gap-3"
              >
                Join ApexPrime
              </button>
              <div className="flex items-center gap-4 py-2 text-white/20">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-bold uppercase tracking-widest leading-none">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <button 
                onClick={handleGoogle}
                className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale opacity-70" alt="G" />
                Sign in with Google
              </button>
              <button 
                onClick={() => setMode('email')}
                className="w-full text-white/40 text-sm hover:text-white transition-colors"
              >
                Already have an account? Sign In
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button onClick={() => setMode('landing')} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="text-white/40 text-sm">{mode === 'signup' ? 'Start your 7-day free cinema trial today.' : 'Login to resume your watch list.'}</p>
            </div>
            
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-white/20" aria-hidden="true" />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-label="Email Address"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-netflix-red focus:bg-white/10 focus:ring-2 focus:ring-netflix-red/50 transition-all font-bold"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-white/20" aria-hidden="true" />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-label="Password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-netflix-red focus:bg-white/10 focus:ring-2 focus:ring-netflix-red/50 transition-all font-bold"
              />
            </div>
            {error && <p className="text-red-400 text-xs px-2" role="alert">{error}</p>}
            <button 
              onClick={() => handleEmailAuth(mode === 'signup')}
              aria-label={mode === 'signup' ? 'Create your account' : 'Sign in to your account'}
              className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-white/90 transition-all shadow-xl shadow-white/5 active:scale-95 focus:ring-4 focus:ring-white/30"
            >
              {mode === 'signup' ? 'Sign Up' : 'Login'}
            </button>
          </div>

            <div className="text-center pt-4">
               <p className="text-xs text-white/20">By continuing, you agree to our Terms of Cinema and Privacy Protocol.</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function BottomNavigation({ activeTab, setActiveTab }: any) {
  const tabs = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'upcoming', label: 'Trailers', icon: <PlayCircle className="w-5 h-5" /> },
    { id: 'menu', label: 'Menu', icon: <LayoutGrid className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden px-4 pb-4 pt-2 backdrop-blur-3xl bg-black/60 border-t border-white/5">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-90 ${
              activeTab === tab.id ? 'text-netflix-red' : 'text-white/40'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function Navbar({ account, selectedProfile, onLogout, onPricingClick, onSwitchProfile, onChatToggle, searchQuery, setSearchQuery, activeTab, setActiveTab, onProfileClick }: any) {
  const tabs = [
    { id: 'home', label: 'Home', icon: <Play className="w-3 h-3" /> },
    { id: 'upcoming', label: 'Upcoming & Trailers', icon: <Calendar className="w-3 h-3" /> },
    { id: 'menu', label: 'Menu', icon: <LayoutGrid className="w-3 h-3" /> },
  ];

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 px-4 md:px-10 py-4 md:py-6 backdrop-blur-md bg-black/40 border-b border-glass-border"
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6 md:gap-12">
          <h2 
            className="text-xl md:text-2xl font-black text-netflix-red tracking-tighter uppercase cursor-pointer focus:outline-none focus:ring-2 focus:ring-netflix-red rounded-lg px-2" 
            onClick={() => { setActiveTab('home'); setSearchQuery(''); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && (setActiveTab('home'), setSearchQuery(''))}
            aria-label="ApexPrime Home"
          >
            Apex<span className="text-white">Prime</span>
          </h2>
          <div className="hidden lg:flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all focus:outline-none ${
                   activeTab === tab.id 
                    ? 'bg-white text-black shadow-lg shadow-white/5' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-8">
          <div className="relative group hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-netflix-red transition-all" aria-hidden="true" />
            <input 
              type="text" 
              placeholder="Search library..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search movie library"
              className="bg-white/5 border border-white/10 rounded-full py-2 pl-12 pr-6 text-xs focus:outline-none focus:border-netflix-red focus:bg-white/10 focus:ring-2 focus:ring-netflix-red/50 transition-all w-48 lg:w-96"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 cursor-pointer hover:text-white focus:text-white outline-none"
              >
                <X className="w-full h-full" />
              </button>
            )}
          </div>

          <button 
            onClick={onChatToggle}
            aria-label="Toggle Community Chat"
            className="w-5 h-5 text-white/40 cursor-pointer hover:text-netflix-red focus:text-netflix-red focus:outline-none transition-all active:scale-95 touch-manipulation"
          >
            <MessageSquare className="w-full h-full" />
          </button>
          
          <div className="flex items-center gap-2 md:gap-4 bg-white/5 border border-white/10 rounded-full pl-3 md:pl-4 pr-1 py-1 group cursor-pointer hover:bg-white/10 focus-within:ring-2 focus-within:ring-netflix-red/50 transition-all">
             <button 
               className="flex items-center gap-2 focus:outline-none" 
               onClick={onPricingClick}
               aria-label={`Current subscription: ${account?.subscriptionTier}. Click to view pricing.`}
             >
               <Crown className={`w-3 h-3 ${account?.subscriptionTier === 'premium' ? 'text-yellow-500' : 'text-white/40'}`} />
               <span className="text-[10px] font-black uppercase tracking-tighter text-white/60 hidden sm:inline">{account?.subscriptionTier}</span>
             </button>
             <div className="relative group/user">
                <button 
                  onClick={onProfileClick}
                  aria-label="View Profile Details"
                  className="w-8 h-8 rounded-full border border-white/10 cursor-pointer focus:ring-2 focus:ring-netflix-red focus:outline-none p-0 overflow-hidden shadow-lg hover:border-white transition-all active:scale-90"
                >
                  <img 
                    src={selectedProfile?.avatarUrl} 
                    className="w-full h-full object-cover" 
                    alt="Current Profile Avatar" 
                  />
                </button>
             </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero({ movie, onWatch, onStartParty, currentTier, onPricingClick }: { movie: Movie, onWatch: () => void, onStartParty: () => void, currentTier?: string, onPricingClick: () => void }) {
  const isLocked = !isTierSufficient(currentTier || 'basic', movie.requiredTier);

  const handleAction = () => {
    if (isLocked) onPricingClick();
    else onWatch();
  };

  return (
    <section className="relative h-[60vh] md:h-[85vh] w-full flex items-center px-6 md:px-12 overflow-hidden mx-auto max-w-7xl mt-4 rounded-[2rem] md:rounded-[3rem] border border-glass-border shadow-2xl" aria-labelledby="hero-title">
      <div className="absolute inset-0">
        <img src={movie.thumbnailUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
        <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black 0%, transparent 70%" />
      </div>

      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative z-10 max-w-2xl space-y-4 md:space-y-8 md:pl-8 pt-20"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-netflix-red text-white text-[10px] font-black uppercase tracking-widest rounded-lg">{movie.type}</span>
            <span className="text-white/60 text-xs font-bold uppercase tracking-wider">{movie.genre}</span>
          </div>
          <h1 id="hero-title" className="text-4xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] drop-shadow-2xl">{movie.title}</h1>
        </div>
        
        <p className="text-white/60 text-sm md:text-lg max-w-lg font-bold uppercase tracking-wide leading-relaxed line-clamp-3 md:line-clamp-none">
          {movie.description}
        </p>

        <div className="flex flex-wrap gap-3 md:gap-4 pt-4">
          <button 
            onClick={handleAction}
            aria-label={isLocked ? `Upgrade to watch ${movie.title}` : `Start watching ${movie.title}`}
            className={`flex-1 sm:flex-none px-6 md:px-12 py-3 md:py-5 font-black uppercase text-xs md:text-sm tracking-widest rounded-xl md:rounded-2xl transition-all hover:scale-105 shadow-xl active:scale-95 focus:ring-4 outline-none flex items-center justify-center gap-3 ${
              isLocked 
                ? 'bg-netflix-red text-white hover:bg-netflix-red/90 shadow-netflix-red/20 focus:ring-netflix-red/50' 
                : 'bg-white text-black hover:bg-white/90 shadow-white/5 focus:ring-white/30'
            }`}
          >
            {isLocked ? <Lock className="w-5 h-5" aria-hidden="true" /> : <Play className="fill-current w-5 h-5" aria-hidden="true" />}
            {isLocked ? 'Upgrade' : 'Play'}
          </button>
          
          {!isLocked && (
            <button 
              onClick={onStartParty}
              className="flex-1 sm:flex-none px-6 md:px-10 py-3 md:py-5 bg-white/5 backdrop-blur-xl text-white font-black rounded-xl md:rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 focus:ring-4 focus:ring-white/10 outline-none active:scale-95"
            >
              <Users className="w-5 h-5" /> Party
            </button>
          )}
        </div>
      </motion.div>
    </section>
  );
}

function MasonryWrapper({ children, cols = 4 }: { children: React.ReactNode, cols?: number }) {
  const colClass = {
    2: 'columns-2',
    3: 'columns-2 md:columns-3',
    4: 'columns-2 md:columns-4'
  }[cols as 2 | 3 | 4];

  return (
    <div className={`${colClass} gap-4 md:gap-6 px-4 md:px-12`}>
      {children}
    </div>
  );
}

function ContentGrid({ title, icon, content }: { title: string, icon: React.ReactNode, content: React.ReactNode }) {
  return (
    <section className="py-6 md:py-12 space-y-4 md:space-y-8 animate-in fade-in duration-700">
      <div className="px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-2 bg-white/5 rounded-xl border border-white/10">{icon}</div>
          <h3 className="text-lg md:text-2xl font-black tracking-tighter uppercase">{title}</h3>
        </div>
        <div className="flex items-center gap-1 group cursor-pointer text-white/20 hover:text-white transition-all">
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">View All</span>
          <ChevronRight className="w-3 h-3 md:w-4 h-4" />
        </div>
      </div>
      {content}
    </section>
  );
}

function MovieCard({ movie, onWatch, onStartParty, currentTier, onToggleWatchlist, isWatchlisted, onPricingClick }: any) {
  const isLocked = !isTierSufficient(currentTier || 'basic', movie.requiredTier);
  const handleMainAction = () => {
    if (isLocked) onPricingClick();
    else onWatch();
  };

  const getTierIcon = () => {
    if (movie.requiredTier === 'premium') return <Crown className="w-3 h-3 text-yellow-500" />;
    if (movie.requiredTier === 'pro') return <Zap className="w-3 h-3 text-netflix-red" />;
    return <Play className="w-3 h-3 text-white/40" />;
  };

  const aspectClass = movie.type === 'series' ? 'aspect-[2/3]' : 'aspect-video';

  return (
    <div 
      className={`group relative ${aspectClass} rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer bg-dark-card border border-glass-border hover:scale-[1.02] active:scale-[0.98] hover:ring-2 hover:ring-netflix-red/50 focus:ring-4 focus:ring-netflix-red focus:outline-none transition-all duration-500 shadow-xl break-inside-avoid mb-4 md:mb-6 touch-manipulation`}
      role="button"
      tabIndex={0}
      onClick={handleMainAction}
      onKeyDown={(e) => e.key === 'Enter' && handleMainAction()}
      aria-label={`${isLocked ? 'Upgrade to watch' : 'Watch'} ${movie.title}. Released in ${movie.year}, rating ${movie.rating}. Requires ${movie.requiredTier} tier.`}
    >
      <img src={movie.thumbnailUrl} className="w-full h-full object-cover grayscale-[0.2] transition-all opacity-80" alt="" aria-hidden="true" referrerPolicy="no-referrer" />
      
      {/* Tier Badge */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-20 flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-black/60 backdrop-blur-md rounded-lg md:rounded-xl border border-white/10">
        {getTierIcon()}
        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/80">{movie.requiredTier}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 md:p-8 pt-10 md:pt-20 bg-gradient-to-t from-black via-black/95 to-transparent md:translate-y-20 md:group-hover:translate-y-0 transition-all">
        <h4 className="font-black text-sm md:text-xl mb-1 md:mb-2 uppercase tracking-tight leading-none line-clamp-1">{movie.title}</h4>
        <div className="flex items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-bold text-white/60 mb-2 md:mb-6 uppercase tracking-wider">
          <span>{movie.year}</span>
          <span className="bg-white/10 px-1.5 md:px-2 py-0.5 rounded-md border border-white/5">{movie.rating}</span>
          <span className="hidden xs:inline">{movie.duration}</span>
        </div>
        
        <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); handleMainAction(); }}
            className={`flex-1 py-2 md:py-3.5 text-[8px] md:text-xs font-black rounded-lg md:rounded-xl border flex items-center justify-center gap-2 transition-all active:scale-95 focus:ring-2 outline-none ${
              isLocked ? 'bg-netflix-red border-netflix-red text-white' : 'bg-white border-white text-black hover:bg-white/90'
            }`}
          >
            {isLocked ? <Lock className="w-2 md:w-3 h-2 md:h-3" aria-hidden="true" /> : <Play className="w-2 md:w-3 h-2 md:h-3 fill-current" aria-hidden="true" />}
            {isLocked ? 'Upgrade' : 'Watch'}
          </button>
          {!isLocked && (
            <button 
              onClick={(e) => { e.stopPropagation(); onStartParty(); }}
              className="p-2 md:p-3.5 bg-white/10 rounded-lg md:rounded-xl border border-white/10 text-white hover:bg-white/20 transition-all focus:ring-2 focus:ring-netflix-red outline-none active:scale-95"
            >
              <Users className="w-3 md:w-4 h-3 md:h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {isLocked && <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all" />}
    </div>
  );
}

function SoloPlayer({ movie, user, profile, onExit }: { movie: Movie, user: any, profile: any, onExit: () => void }) {
  const isPresent = useIsPresent();
  const [messages, setMessages] = useState<any[]>([]);
  const [fadingMessages, setFadingMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<any>(null);
  const Player = ReactPlayer as any;

  useEffect(() => {
    const q = query(collection(db, 'community_chat'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snap) => {
      const newMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse() as any[];
      setMessages(newMsgs);
      
      // Auto-fade logic for new messages
      const latest = newMsgs[newMsgs.length - 1];
      if (latest && latest.timestamp > new Date(Date.now() - 2000).toISOString()) {
        const id = Math.random().toString(36).substr(2, 9);
        setFadingMessages(prev => [...prev, { ...latest, fadeId: id }]);
        setTimeout(() => {
          setFadingMessages(prev => prev.filter(m => m.fadeId !== id));
        }, 5000);
      }
    });
    return () => unsubscribe();
  }, []);

  const send = async (e: any) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !profile) return;
    try {
      await addDoc(collection(db, 'community_chat'), {
        userId: user.uid,
        userName: profile.name,
        text: inputText,
        timestamp: new Date().toISOString()
      });
      setInputText('');
    } catch (err) {
      console.error('Chat error:', err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col pt-12 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${movie.title}`}
    >
      <div className="absolute top-8 left-12 z-[210] flex items-center gap-6">
        <button 
          onClick={onExit}
          aria-label="Exit theater and return to library"
          className="p-4 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 hover:bg-white/10 transition-all focus:ring-4 focus:ring-netflix-red outline-none shadow-2xl"
        >
          <ArrowLeft className="w-6 h-6" aria-hidden="true" />
        </button>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{movie.title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">Personal Theater Mode</span>
            <span className="w-1 h-1 bg-white/20 rounded-full" />
            <span className="text-[10px] text-netflix-red uppercase font-black tracking-widest animate-pulse">Live Metadata Sync</span>
          </div>
        </div>
      </div>

      <div className="absolute top-8 right-12 z-[210] flex items-center gap-4">
         <button 
          onClick={() => setShowChat(!showChat)}
          className={`p-4 rounded-2xl border transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest ${showChat ? 'bg-netflix-red border-netflix-red text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
         >
           <MessageSquare className="w-4 h-4" /> {showChat ? 'Chat Active' : 'Chat Hidden'}
         </button>
      </div>

      <div className="flex-1 w-full flex items-center justify-center p-6 relative">
          <div className="w-full max-w-6xl aspect-video rounded-[3rem] overflow-hidden shadow-[0_0_150px_rgba(229,9,20,0.15)] border border-white/10 relative bg-black">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-3xl p-12 text-center">
              <div className="p-8 bg-red-500/10 rounded-full border border-red-500/20">
                <ShieldCheck className="w-16 h-16 text-red-500" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black uppercase tracking-tight">Cinema Data Pipeline Lost</h3>
                <p className="max-w-md text-white/40 leading-relaxed font-bold uppercase tracking-widest text-xs">The requested cinematic protocol could not be established. Please check your neural link and retry.</p>
              </div>
              <button 
                onClick={onExit}
                className="px-8 py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/90 transition-all"
              >
                Return to Hub
              </button>
            </div>
          ) : (
            <div className="w-full h-full relative group">
              <Player
                url={movie.videoUrl}
                width="100%"
                height="100%"
                controls
                playing={isPresent && !error}
                playsinline
                muted={isMuted}
                onError={() => setError('Source could not be loaded')}
                config={{
                  youtube: {
                    rel: 0
                  }
                }}
              />
              {isMuted && (
                <button 
                  onClick={() => setIsMuted(false)}
                  className="absolute bottom-16 right-8 z-[220] bg-black/60 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-black/80 transition-all text-white"
                >
                  <Zap className="w-3 h-3 text-netflix-red animate-pulse" />
                  Tap to Unmute Audio
                </button>
              )}
            </div>
          )}

          {/* Fading Messages Overlay */}
          <div className="absolute inset-x-0 bottom-24 p-12 pointer-events-none flex flex-col items-start gap-3 z-[205]">
             <AnimatePresence>
                {showChat && fadingMessages.map((msg) => (
                  <motion.div
                    key={msg.fadeId}
                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className="bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl rounded-bl-sm flex flex-col gap-0.5"
                  >
                    <span className="text-[9px] font-black uppercase text-netflix-red tracking-widest">{msg.userName}</span>
                    <p className="text-xs font-bold text-white/90">{msg.text}</p>
                  </motion.div>
                ))}
             </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating Chat Input */}
      <AnimatePresence>
        {showChat && !error && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-lg z-[220]"
          >
             <form onSubmit={send} className="relative group p-1 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] focus-within:border-netflix-red/50 transition-all">
                <input 
                  type="text" 
                  placeholder="Broadcast to community..." 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="w-full bg-transparent py-5 pl-8 pr-20 text-sm font-bold focus:outline-none"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 bg-netflix-red text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-netflix-red/20 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                  Send
                </button>
             </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PartyCard({ party, movie, onJoin }: any) {
  return (
    <div 
      onClick={onJoin}
      onKeyDown={(e) => e.key === 'Enter' && onJoin()}
      tabIndex={0}
      role="button"
      aria-label={`Join watch party for ${movie.title} hosted by ${party.hostName}. ${party.participantCount} users watching.`}
      className="flex-shrink-0 w-[400px] group glass-morphism rounded-[2.5rem] overflow-hidden hover:border-netflix-red/50 transition-all cursor-pointer p-4 border border-white/5 focus:ring-4 focus:ring-netflix-red focus:outline-none"
    >
      <div className="relative h-56 rounded-[2rem] overflow-hidden" aria-hidden="true">
        <img src={movie.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" referrerPolicy="no-referrer" />
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-netflix-red px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse shadow-xl shadow-netflix-red/40">
           <Tv className="w-3 h-3" /> Live
        </div>
        <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/60 backdrop-blur rounded-full flex items-center gap-2 border border-white/10 shadow-2xl">
          <Users className="w-4 h-4" />
          <span className="text-xs font-black">{party.participantCount} Watching</span>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <h4 className="font-black text-xl truncate uppercase tracking-tight">{movie.title}</h4>
          <p className="text-xs text-white/40 uppercase tracking-[0.2em] mt-1 font-bold">Party Room Active</p>
        </div>
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 p-1 border border-white/10 overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${party.hostName}`} className="w-full h-full rounded-full" alt="" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase font-black">Hosted by</p>
              <p className="text-sm font-bold">{party.hostName}</p>
            </div>
          </div>
          <div className="p-3 bg-white text-black rounded-full hover:scale-110 transition-all active:scale-95 shadow-lg group-hover:bg-netflix-red group-hover:text-white transition-colors">
             <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingModal({ currentTier, onClose, onUpgrade }: any) {
  const tiers = [
    { 
      id: 'basic', 
      name: 'Essential', 
      price: 'R99.00', 
      icon: <Tv className="w-8 h-8 text-white/40" />,
      features: ['720p Streaming', 'Basic Movie Catalog', '1 Profile', '1 Concurrent Stream'] 
    },
    { 
      id: 'pro', 
      name: 'Cinema Pro', 
      price: 'R179.00', 
      icon: <Zap className="w-8 h-8 text-netflix-red" />,
      features: ['1080p Streaming', 'Cinema Pro Library', 'Watch Parties', '2 Profiles', '2 Concurrent Streams'] 
    },
    { 
      id: 'premium', 
      name: 'Apex Ultra', 
      price: 'R230.00', 
      icon: <Crown className="w-8 h-8 text-yellow-500" />,
      features: ['4K Ultra HD + HDR', 'Premium Vault Access', 'Exclusive Content', '5 Profiles', '4 Concurrent Streams'] 
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
    >
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose} aria-hidden="true" />
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="relative z-10 w-full max-w-5xl bg-dark-card border border-glass-border rounded-[3rem] p-16 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="atmosphere opacity-20" />
        <button 
          onClick={onClose}
          aria-label="Close pricing and return to gallery"
          className="absolute top-10 right-10 p-4 bg-white/5 rounded-full hover:bg-white/10 transition-all border border-white/10 focus:ring-4 focus:ring-netflix-red outline-none"
        >
          <X className="w-6 h-6 text-white/60" aria-hidden="true" />
        </button>
        <div className="flex flex-col md:flex-row items-start justify-between gap-12 relative z-10">
          <div className="max-w-xs space-y-6">
            <h2 id="pricing-modal-title" className="text-6xl font-black tracking-tighter uppercase leading-[0.9] text-glow">Select Your Protocol.</h2>
            <p className="text-white/60 text-lg leading-relaxed font-light">Each tier unlocks deeper levels of cinematographic immersion and social capabilities.</p>
            <div className="pt-8 flex flex-col gap-4 text-[10px] font-black uppercase tracking-widest text-white/40">
              <p className="flex items-center gap-2" aria-label="Security check: Apex Encryption enabled">
                <ShieldCheck className="w-4 h-4 text-netflix-red" aria-hidden="true" /> Secured by Apex Encryption
              </p>
              <p className="flex items-center gap-2" aria-label="Cancellation policy: One-click cancellation">
                <Check className="w-4 h-4 text-green-500" aria-hidden="true" /> Cancel with a single click
              </p>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {tiers.map(t => (
              <div key={t.id} className={`p-8 rounded-[2rem] border transition-all flex flex-col justify-between relative group/tier ${currentTier === t.id ? 'bg-netflix-red border-netflix-red shadow-2xl shadow-netflix-red/30 scale-105 z-20' : 'bg-white/5 border-white/10 hover:border-white/40'}`}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl ${currentTier === t.id ? 'bg-white/20' : 'bg-white/5'}`}>{t.icon}</div>
                    {currentTier === t.id && <span className="text-[10px] font-black uppercase bg-white/30 px-3 py-1.5 rounded-lg tracking-widest shadow-xl" aria-label="Your current active plan">In Use</span>}
                  </div>
                  <div>
                    <h4 className="text-xl font-black uppercase tracking-tight leading-none mb-1">{t.name}</h4>
                    <p className="text-3xl font-black" aria-label={`Monthly subscription price: ${t.price}`}>{t.price}<span className="text-[10px] font-black text-white/40 ml-1">/MO</span></p>
                  </div>
                  <ul className="space-y-3" aria-label={`Included features for ${t.name}`}>
                    {t.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-xs font-bold text-white/70">
                        <div className={`w-1 h-1 rounded-full ${currentTier === t.id ? 'bg-white' : 'bg-white/40'}`} aria-hidden="true" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  onClick={() => onUpgrade(t.id)}
                  disabled={currentTier === t.id}
                  aria-label={currentTier === t.id ? `Currently on ${t.name}` : `Select ${t.name} Protocol`}
                  className={`w-full py-5 mt-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all focus:ring-4 focus:ring-white/30 outline-none active:scale-95 ${currentTier === t.id ? 'bg-black/40 text-white/40 cursor-not-allowed' : 'bg-white text-black hover:bg-white/90 shadow-2xl shadow-white/10'}`}
                >
                  {currentTier === t.id ? 'Current Protocol' : 'Select Protocol'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CommunityChatPanel({ user, profile, onClose }: any) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'community_chat'), orderBy('timestamp', 'asc'), limit(50));
    return onSnapshot(q, 
      (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityMessage)));
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
      },
      (error) => handleFirestoreError(error, 'list', '/community_chat')
    );
  }, []);

  const send = async (e: any) => {
    e.preventDefault();
    if (!text.trim()) return;
    await addDoc(collection(db, 'community_chat'), {
      userId: user.uid,
      userName: profile.name,
      text,
      timestamp: new Date().toISOString()
    });
    setText('');
  };

  return (
    <motion.div 
      initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
      className="fixed top-0 right-0 w-96 h-screen z-[60] glass-morphism border-l border-white/5 shadow-2xl flex flex-col p-8"
      role="complementary"
      aria-label="Global Community Chat"
    >
      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-netflix-red" aria-hidden="true" />
          <h3 className="font-black uppercase tracking-tighter">Apex Global Chat</h3>
        </div>
        <button 
          onClick={onClose}
          aria-label="Close chat panel"
          className="w-5 h-5 text-white/40 cursor-pointer hover:text-white focus:text-white outline-none"
        >
          <X className="w-full h-full" aria-hidden="true" />
        </button>
      </div>

      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto space-y-6 scrollbar-hide px-2"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map(m => (
          <div key={m.id} className="flex flex-col gap-1.5 animate-in slide-in-from-right-4">
             <span className="text-[10px] font-black uppercase text-white/60">{m.userName}</span>
             <p className="text-sm bg-white/5 border border-white/5 p-4 rounded-[1.5rem] rounded-tl-none leading-relaxed text-white/90 group-hover:bg-white/10 transition-all">{m.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="mt-8 relative">
        <input 
          type="text" 
          placeholder="Message world..." 
          value={text}
          onChange={e => setText(e.target.value)}
          aria-label="Send a message to the community"
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-netflix-red focus:bg-white/10 focus:ring-2 focus:ring-netflix-red/50 transition-all font-bold"
        />
        <button type="submit" className="hidden">Send</button>
      </form>
    </motion.div>
  );
}

function PartyRoom({ party, user, profile, onExit, movie }: any) {
  const isPresent = useIsPresent();
  const [messages, setMessages] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [partyState, setPartyState] = useState(party);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const playerRef = useRef<any>(null);
  const Player = ReactPlayer as any;
  const isHost = party.hostId === user.uid;

  useEffect(() => {
    const pRef = doc(db, 'parties', party.id);
    const subP = onSnapshot(pRef, 
      (doc) => {
        if (doc.exists()) setPartyState({ id: doc.id, ...doc.data() });
        else onExit();
      },
      (error) => handleFirestoreError(error, 'get', `/parties/${party.id}`)
    );
    const mQuery = query(collection(db, 'parties', party.id, 'messages'), orderBy('timestamp', 'asc'));
    const subM = onSnapshot(mQuery, 
      (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (error) => handleFirestoreError(error, 'list', `/parties/${party.id}/messages`)
    );

    const rQuery = query(collection(db, 'parties', party.id, 'reactions'), orderBy('timestamp', 'desc'), limit(15));
    const subR = onSnapshot(rQuery, (snap) => {
      setReactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    updateDoc(pRef, { participantCount: party.participantCount + 1 })
      .catch(e => handleFirestoreError(e, 'update', `/parties/${party.id}`));
    return () => {
      subP(); subM(); subR();
      updateDoc(pRef, { participantCount: Math.max(0, (partyState?.participantCount || 1) - 1) })
        .catch(e => console.error('Silent update error on exit:', e));
    };
  }, []);

  // Sync Video Logic
  useEffect(() => {
    if (!playerRef.current || isHost) return;
    
    // Sync Time if delta > 3 seconds
    const currentTime = playerRef.current.getCurrentTime();
    if (Math.abs(currentTime - partyState.currentTime) > 3) {
      playerRef.current.seekTo(partyState.currentTime, 'seconds');
    }
  }, [partyState, isHost]);

  // Host update pulse
  useEffect(() => {
    if (!isHost) return;
    const interval = setInterval(() => {
      if (playerRef.current) {
        updateDoc(doc(db, 'parties', party.id), {
          currentTime: playerRef.current.getCurrentTime()
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isHost]);

  const pushAction = async (status: string) => {
    if (!isHost || !playerRef.current) return;
    await updateDoc(doc(db, 'parties', party.id), {
      status,
      currentTime: playerRef.current.getCurrentTime()
    });
  };

  const addReaction = async (emoji: string) => {
    await addDoc(collection(db, 'parties', party.id, 'reactions'), {
      emoji,
      userId: user.uid,
      userName: profile.name,
      timestamp: new Date().toISOString()
    });
  };

  const send = async (e: any) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await addDoc(collection(db, 'parties', party.id, 'messages'), {
      userId: user.uid,
      userName: profile.name,
      text: inputText,
      timestamp: new Date().toISOString()
    });
    setInputText('');
  };

  return (
    <div className="h-screen w-full flex flex-col pt-24 pb-6 px-10 bg-transparent overflow-hidden lg:flex-row gap-6 relative">
      <div className="atmosphere" />
      <div className="flex-1 flex flex-col h-full bg-black/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden relative border border-white/5 shadow-2xl">
        <div className="absolute top-8 left-8 z-40 flex items-center gap-4">
           <button onClick={onExit} className="p-4 bg-white/5 backdrop-blur rounded-2xl border border-white/10 hover:bg-white/10 transition-all"><ArrowLeft className="w-5 h-5" /></button>
           <div className="px-6 py-3 glass-morphism rounded-2xl flex items-center gap-4">
              <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full shadow-[0_0_12px_#00ff88] animate-pulse ${partyState.status === 'playing' ? 'bg-[#00ff88]' : 'bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.5)]'}`} />
                 <span className="text-[10px] font-black uppercase tracking-widest">{partyState.status === 'playing' ? 'Cinema Broadcast' : 'Stream Paused'}</span>
              </div>
              <span className="h-4 w-px bg-white/10" />
              <span className="text-sm font-black uppercase">{movie?.title}</span>
           </div>
        </div>

        <div className="flex-1 w-full bg-black flex items-center justify-center relative group/video">
          {videoError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-3xl p-12 text-center">
              <div className="p-8 bg-red-500/10 rounded-full border border-red-500/20">
                <ShieldCheck className="w-16 h-16 text-red-500" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black uppercase tracking-tight">Sync Pipeline Lost</h3>
                <p className="max-w-md text-white/40 leading-relaxed font-bold uppercase tracking-widest text-xs">The broadcast signal was interrupted. This usually occurs when the cinema data source is unavailable.</p>
              </div>
              <button 
                onClick={onExit}
                className="px-8 py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/90 transition-all"
              >
                Return to Hub
              </button>
            </div>
          ) : (
            <div className="w-full h-full relative">
              <Player 
                ref={playerRef}
                url={movie?.videoUrl} 
                width="100%"
                height="100%"
                controls={isHost}
                playing={isPresent && partyState.status === 'playing'}
                playsinline
                muted={isMuted}
                onPlay={() => isHost && pushAction('playing')}
                onPause={() => isHost && pushAction('paused')}
                onError={() => setVideoError('Source Load Failed')}
                config={{
                  youtube: {
                    rel: 0
                  }
                }}
              />
              {isMuted && (
                <button 
                  onClick={() => setIsMuted(false)}
                  className="absolute bottom-8 right-8 z-[220] bg-black/60 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-black/80 transition-all text-white shadow-2xl"
                >
                  <Flame className="w-4 h-4 text-netflix-red animate-bounce" />
                  Engage Audio Stream
                </button>
              )}
            </div>
          )}
          
          {/* Reaction Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {reactions.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ y: 400, x: 100 + (i * 20) % 200, opacity: 1, scale: 0.5 }}
                animate={{ y: -100, opacity: 0, scale: 2 }}
                transition={{ duration: 4, ease: "easeOut" }}
                className="absolute bottom-0 text-4xl"
              >
                {r.emoji}
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-white/40 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded backdrop-blur">
                  {r.userName}
                </span>
              </motion.div>
            ))}
          </div>

          {!isHost && partyState.status === 'paused' && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
               <div className="flex flex-col items-center gap-4">
                  <div className="p-8 bg-white/5 rounded-full border border-white/10">
                     <Play className="w-12 h-12 text-white/20" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-white/40">Waiting for Host</p>
               </div>
            </div>
          )}
        </div>

        <div className="p-10 border-t border-white/5 flex items-center justify-between bg-black/20">
           <div className="flex items-center gap-8">
              <div className="space-y-1">
                 <h4 className="text-xl font-black uppercase tracking-tight">{movie?.title}</h4>
                 <p className="text-xs text-white/40 uppercase font-black tracking-widest">Active Stream • Hosted by {partyState.hostName}</p>
              </div>

              {/* Reaction Shortcuts */}
              <div className="flex items-center gap-2 p-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur">
                 <button onClick={() => addReaction('❤️')} className="p-3 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90 text-netflix-red"><Heart className="w-5 h-5 fill-current" /></button>
                 <button onClick={() => addReaction('🔥')} className="p-3 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90 text-orange-500"><Flame className="w-5 h-5 fill-current" /></button>
                 <button onClick={() => addReaction('😂')} className="p-3 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90 text-yellow-400"><Smile className="w-5 h-5 fill-current" /></button>
                 <button onClick={() => addReaction('⚡')} className="p-3 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90 text-blue-400"><Zap className="w-5 h-5 fill-current" /></button>
              </div>
           </div>

           <div className="flex items-center gap-4">
              <div className="flex -space-x-4">
                 {[1,2,3].map(i => <div key={i} className="w-12 h-12 rounded-full bg-white/5 border-2 border-dark-bg" />)}
                 <div className="w-12 h-12 rounded-full bg-netflix-red border-2 border-dark-bg flex items-center justify-center text-xs font-black shadow-lg">+{partyState.participantCount}</div>
              </div>
           </div>
        </div>
      </div>
      <aside className="w-full lg:w-[350px] flex flex-col h-full glass-morphism rounded-[3rem] border border-white/5">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
           <h3 className="font-black uppercase tracking-tighter flex items-center gap-3">
              Party Replay <span className="text-[10px] bg-netflix-red/20 text-netflix-red px-2 py-0.5 rounded italic">Social</span>
           </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
           {messages.map(m => (
              <div key={m.id} className="flex gap-4 animate-in slide-in-from-right-2">
                 <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden flex-shrink-0">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${m.userName}`} alt="A" />
                 </div>
                 <div>
                    <span className="text-[10px] font-black uppercase text-white/40 block mb-1">{m.userName}</span>
                    <p className="text-sm leading-relaxed">{m.text}</p>
                 </div>
              </div>
           ))}
        </div>
        <div className="p-8 bg-black/20">
           <form onSubmit={send} className="relative">
              <input 
                type="text" value={inputText} onChange={e => setInputText(e.target.value)} 
                placeholder="React to current frame..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:border-white/30 transition-all font-medium" 
              />
           </form>
        </div>
      </aside>
    </div>
  );
}
