# Supabase Migration Guide

## Migration Complete! ✅

All Appwrite code has been replaced with Supabase.

## Setup Instructions

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key from Settings → API

### 2. Create the Songs Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create songs table
CREATE TABLE songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  song_url TEXT,
  song_urls TEXT[],
  audio_url TEXT,
  audio_urls TEXT[],
  urls TEXT[],
  songs TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for category lookups
CREATE INDEX songs_category_idx ON songs(category);

-- Enable Row Level Security (RLS)
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON songs
  FOR SELECT
  USING (true);
```

### 3. Insert Sample Data

```sql
-- Insert sample songs
INSERT INTO songs (category, song_urls) VALUES
  ('chill', ARRAY['https://example.com/chill1.mp3', 'https://example.com/chill2.mp3']),
  ('lofi', ARRAY['https://example.com/lofi1.mp3', 'https://example.com/lofi2.mp3']),
  ('retro', ARRAY['https://example.com/retro1.mp3', 'https://example.com/retro2.mp3']),
  ('work', ARRAY['https://example.com/work1.mp3', 'https://example.com/work2.mp3']);
```

### 4. Update Your Environment Variables

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SUPABASE_SONGS_TABLE=songs
```

### 5. Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add the environment variables in Vercel project settings
4. Deploy!

## Database Schema

The `songs` table supports multiple URL formats:

- **Single URL**: `song_url`, `audio_url`, or `url` (TEXT)
- **Multiple URLs**: `song_urls`, `audio_urls`, `urls`, or `songs` (TEXT ARRAY)

The player will randomly pick from arrays if present, otherwise fall back to single URL fields.

## What Changed

- ✅ Replaced Appwrite client with Supabase
- ✅ Updated all database queries from Appwrite syntax to Supabase
- ✅ Removed Appwrite dependencies
- ✅ Updated environment variables
- ✅ Kept all existing functionality (random track selection, category filtering, volume control, etc.)

## Files Modified

1. `src/lib/appwrite.js` → `src/lib/supabase.js`
2. `src/components/RetroPlayer.js`
3. `.env.local`
4. `package.json`
