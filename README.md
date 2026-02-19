# 🎧 Retro Lo-Fi Radio Player (Next.js + Appwrite)

A minimal retro-styled live radio web application built with **Next.js + TailwindCSS**, powered by **Appwrite** as the backend.

This project combines a nostalgic console-style UI with modern React architecture and uses **Appwrite** to manage and fetch audio metadata (playlist, categories, streaming URLs).

Music is sourced from:
- 📡 Internet Archive (Public Domain / Creative Commons)
- ☁️ External storage (S3 / CDN)

---

## 🚀 Features

### 🎛 Retro Console UI
- Old-school audio console inspired layout
- Minimal aesthetic
- Smooth Tailwind transitions
- Fully responsive

### 🌗 Dark / Light Mode
- Toggle between themes
- Stored in `localStorage`
- Auto-applies on reload

### 🎵 Audio Playback
- HTML5 `<audio>` element
- Play / Pause toggle
- Volume Up / Down
- Mute support
- Animated level meter (UI simulation)

### 📂 Category System
Selectable categories:
- CHILL
- RETRO
- LOFI
- WORK

Categories and playlist data are fetched dynamically from **Appwrite Database**.

---

## 🗄 Backend: Appwrite Integration

This project uses **Appwrite** for:

- Storing audio metadata (title, URL, category)
- Managing playlists
- Fetching streaming URLs
- Future support for user accounts & synced playback

### Example Data Structure (Appwrite Collection)

| Field       | Type   | Description                    |
|------------|--------|--------------------------------|
| category   | string | chill / retro / lofi / work   |
| song_url   | string | MP3 streaming URL              |

The frontend fetches tracks using Appwrite SDK.

---

## 🎼 Music Source

The app supports music from:

### 📡 Internet Archive
Search example:
https://archive.org/search?query=lofi+music&and[]=mediatype%3A%22audio%22

You can:
- Stream directly
- Download and host locally
- Store URLs in Appwrite database

⚠ Always verify license before commercial usage.

---

## 🛠 Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/radio.git
cd radio
