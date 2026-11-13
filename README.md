# Demo Vault

A private, black-and-gold vault for your house music demos, with a direct line to the labels that sign them. It works on your computer and your phone.

## The Label Room

- **52 hand-picked labels** for Tech House, Deep House, Latin House and Minimal, including **5 Miami labels** (Chasin, Twisted Funk, Bad Barbie, Batuque, Stush). Every label was checked by hand in November 2026.
- **No LabelRadar.** Labels that only take demos through LabelRadar (Defected/Glitterbox, Toolroom, Armada, Monstercat) are left out because WAVs go over its upload limit. They're listed at the bottom of the page so you know why they're missing.
- **One button per label:**
  - **Trackstack** and **Demo page** labels open the label's own submission page, where you can upload the full WAV.
  - **Direct A&R** labels open **Gmail compose** with the label's demo address already in *To*, plus a subject and a pitch email built from your demo: title, genre, BPM, key (Camelot), your private link and your bio.
- **Pitch a demo:** open any demo and tap **Submit to labels**, or choose one under *Now pitching*. Paste a private SoundCloud, Dropbox or Drive link once and it goes into every email.
- **Track what you've sent:** tap **Mark sent** after you submit. The label shows the date, the demo moves to *Sent*, and you can hide labels that already have this demo.
- **Pitch profile:** set your artist name, city, bio, links, sign-off and (if you have several) which Gmail account to send from. You get a live preview of the email.
- Filter by **Miami**, genre or submission route, and search by label, city or founder.

The label list is in [`src/data/labels.ts`](src/data/labels.ts). Each entry is a few lines, so it's easy to add a label or update an address.

## The Vault

- **One-click upload:** drop an MP3 or WAV (or tap **+** on your phone). The app fills in the title, artist, embedded cover art, length, **BPM** and **key** (Camelot too). You check the details and hit **Save**.
- **Cover-art grid** with a status badge on each demo (WIP / Ready / Sent / Signed), plus favorites, star ratings, genre, tags, collabs and notes.
- **Scrubbable waveforms** and a **sticky bottom player**. Lock-screen controls work on your phone.
- **Search and filters** by title, artist, `#tag`, key, genre, status, BPM range or rating.
- **No cloud needed.** Demos, full-size WAVs, your pitch profile and your submission history are saved on your device. There are no file size limits and no accounts. Cloud sync is optional (step 2 below).

---

## 1. Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open the link it prints (usually http://localhost:5173).

By default everything is saved in that browser only, so you don't need an account or a server. To sync between devices, follow step 2.

## 2. Optional: sync between devices (Supabase, free)

Skip this if you only want the private, on-device vault. The Label Room works either way.

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

## Live site (GitHub Pages)

The app is hosted at **https://lukethecoderlel.github.io/Demos/**. To update it after a change:

```bash
npm run build:pages
```

Then push the contents of `dist/` to the `gh-pages` branch.

## Hosted version (single file)

```bash
npm run build:web
```

This builds `dist-web/demo-vault.html`, one self-contained page with no service worker, ready to host anywhere. On the hosted version, the Download button is hidden because hosted pages can't start file downloads.

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
  App.tsx                 app shell: Vault / Label Room tabs, grid, search, filters, drag-and-drop
  data/labels.ts          the curated label directory (routes, emails, notes)
  components/
    LabelsView.tsx        the Label Room: pitch bar, filters, label cards, Gmail / Trackstack buttons
    PitchProfileModal.tsx your pitch details + live email preview
    UploadModal.tsx       drop → auto-fill → save
    DemoModal.tsx         details, edit, favorite, download, delete
    PlayerBar.tsx         sticky bottom player
    Waveform.tsx          scrubbable waveform (wavesurfer.js)
  lib/
    pitch.ts              pitch profile, private links, submission log, Gmail compose links
    analyze.ts            reads tags/art, decodes audio, computes waveform/BPM/key
    tempo.ts, keys.ts     BPM + key detection, Camelot notation
    player.ts             shared audio player + lock-screen controls
    cloudBackend.ts       Supabase storage + database
    localBackend.ts       in-browser storage (local mode)
supabase/schema.sql       database + storage setup
```
