import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || 'be2ba274b0dd0de392a6efb81e062dea';

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Cinema API Proxy
  app.get('/api/cinema', async (req, res) => {
    try {
      const { type = 'all', query, page = 1 } = req.query;

      // 1. Fetch Genre Map
      const [movieGenresRes, tvGenresRes] = await Promise.all([
        axios.get(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`),
        axios.get(`${TMDB_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}`)
      ]);

      const genreMap = new Map();
      movieGenresRes.data.genres.forEach((g: any) => genreMap.set(g.id, g.name));
      tvGenresRes.data.genres.forEach((g: any) => genreMap.set(g.id, g.name));

      let tmdbResults = [];

      if (query) {
        const searchRes = await axios.get(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${query}&page=${page}`);
        tmdbResults = searchRes.data.results;
      } else {
        const endpoints = [];
        if (type === 'all' || type === 'movie') {
          endpoints.push(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`);
          endpoints.push(`${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`);
        }
        if (type === 'all' || type === 'tv') {
          endpoints.push(`${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`);
          endpoints.push(`${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&page=${page}`);
        }

        const responses = await Promise.all(endpoints.map(url => axios.get(url)));
        tmdbResults = responses.flatMap(r => r.data.results);
      }

      const movies = await Promise.all(tmdbResults
        .filter((m: any) => (m.title || m.name) && m.backdrop_path)
        .slice(0, 40) // Increased variety
        .map(async (m: any, index: number) => {
          const rating = m.vote_average || 0;
          let requiredTier: 'basic' | 'pro' | 'premium' = 'basic';
          
          if (rating >= 8.2) {
            requiredTier = 'premium';
          } else if (rating >= 7.0) {
            requiredTier = 'pro';
          }

          // Fetch Trailer with absolute safety
          let videoUrl = SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length];
          try {
            const videoType = m.title ? 'movie' : 'tv';
            const vidRes = await axios.get(`${TMDB_BASE_URL}/${videoType}/${m.id}/videos?api_key=${TMDB_API_KEY}`, { timeout: 3000 });
            const trailer = vidRes.data.results.find((v: any) => 
              (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube'
            );
            if (trailer) {
              videoUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
              console.log(`[CinemaEngine] Signal locked for ${m.title || m.name}: ${videoUrl}`);
            }
          } catch (e: any) {
            console.warn(`[CinemaEngine] Signal interference for ${m.id}: ${e.message}`);
          }

          return {
            id: String(m.id),
            title: m.title || m.name,
            description: m.overview,
            thumbnailUrl: `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`,
            videoUrl,
            genre: m.genre_ids?.map((id: number) => genreMap.get(id)).filter(Boolean).join(', ') || 'General',
            rating: rating.toFixed(1),
            year: new Date(m.release_date || m.first_air_date).getFullYear() || 2024,
            duration: `${Math.floor(Math.random() * 60) + 90}m`,
            isPremium: requiredTier !== 'basic',
            type: (m.title ? 'movie' : 'series') as 'movie' | 'series',
            requiredTier
          };
        }));

      // Deduplicate by ID
      const uniqueMovies = Array.from(new Map(movies.map(m => [m.id, m])).values());

      res.json(uniqueMovies);
    } catch (error: any) {
      console.error('TMDB Proxy Error:', error.message);
      res.status(500).json({ error: 'Failed to fetch cinema data' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ApexPrime Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
