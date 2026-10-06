# Demo Vault

A clean, minimal app for organizing your music demos. You can use it on your computer and your phone, and your files are saved in the cloud.

- **One-click upload:** drop an MP3 or WAV (or tap **+** on your phone). The app fills in the title, artist, embedded cover art, length, **BPM** and **key** (Camelot too). You check the details and hit **Save**. You can drop several files at once.
- **Cover-art grid** with a status badge on each demo (WIP / Ready / Sent / Signed), plus favorites, star ratings, genre, tags, collabs and notes.
- **Scrubbable waveforms** and a **sticky bottom player** that keeps playing while you browse. Lock-screen controls work on your phone.
- **Search and filters:** search by title, artist, `#tag` or key. Filter by genre, status, key, BPM range or rating. Sort by newest, oldest, title, BPM or top rated.
- **Installable on your phone:** open it in Safari or Chrome and choose *Add to Home Screen*.
- **Syncs everywhere:** audio and covers are stored privately in Supabase, so anything you upload on your laptop shows up on your phone.

---

## 1. Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open the link it prints (usually http://localhost:5173).

Until you add Supabase keys, the app runs in **local mode**: demos are saved in that browser only. That's handy for trying it out. Once you're connected, demos sync between devices.

## 2. Connect the cloud (Supabase, free)

1. Create a free account at [supabase.com](https://supabase.com) and click **New project**. Pick any name and password.
2. Open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the demos table and a private storage bucket. Only you can read your files.
3. Create your login: **Authentication → Users → Add user → Create new user**. Enter your email and a password, and tick *Auto Confirm User*.
4. Lock it down so nobody else can sign up: **Authentication → Sign In / Providers → turn off "Allow new users to sign up"**.
5. Get your keys: **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
6. In this folder, copy `.env.example` to `.env.local` and paste the keys in:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

7. Restart `npm run dev`. You'll see a sign-in screen. Log in with the user from step 3.

> **File size:** Supabase's free plan allows up to **50 MB per file**, which is about 4½ minutes of 16-bit WAV. MP3s are no problem. For longer WAVs, either upgrade to Pro ($25/mo, 100 GB, bigger files under *Storage → Settings*) or upload an MP3 version.

## 3. Put it online (Vercel, free)

1. Go to [vercel.com](https://vercel.com), sign in with GitHub, click **Add New → Project**, and import this repo.
2. It detects **Vite** automatically. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same values as above.
3. Click **Deploy**. You get a link like `demo-vault.vercel.app`. Every push to GitHub redeploys automatically.

## 4. Add it to your phone

- **iPhone:** open your Vercel link in **Safari**, tap **Share → Add to Home Screen**.
- **Android:** open it in **Chrome**, tap **⋮ → Install app**.

It opens full-screen like a normal app, with its own icon.

---

## Tips

- **Name exports `Artist - Title.wav`** and the app splits the artist and title for you. If the file has ID3 tags (title, artist, genre, BPM, key, cover), those take priority.
- Detected **BPM and key are best guesses**. They're marked *auto-detected* so you can double-check them. You can always change them.
- Drop an **image together with the audio** to use it as the cover art. Click any cover later to change it.
- **Spacebar** plays and pauses on desktop.
- Changes made on another device appear when you switch back to the app.

## Project layout

```
src/
  App.tsx                 library screen: grid, search, filters, drag-and-drop
  components/
    UploadModal.tsx       drop → auto-fill → save
    DemoModal.tsx         details, edit, favorite, download, delete
    PlayerBar.tsx         sticky bottom player
    Waveform.tsx          scrubbable waveform (wavesurfer.js)
  lib/
    analyze.ts            reads tags/art, decodes audio, computes waveform/BPM/key
    tempo.ts, keys.ts     BPM + key detection, Camelot notation
    player.ts             shared audio player + lock-screen controls
    cloudBackend.ts       Supabase storage + database
    localBackend.ts       in-browser storage (local mode)
supabase/schema.sql       database + storage setup
```
