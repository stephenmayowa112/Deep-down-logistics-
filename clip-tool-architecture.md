# Architecture Plan: Local Opus Clips Alternative

A desktop tool that takes a local video or a URL, finds the best moments, cuts vertical clips, and lets you edit captions, restyle them, and extend clip duration before export.

## Core insight that makes everything work

Never destroy the source. A "clip" is metadata — an **ordered list of segments** pointing into the original video, e.g. `[{84.2→97.5}, {103.1→131.7}]` — plus the word-level transcript. This is an EDL (edit decision list), and it's what makes every editing feature cheap:

- **Extend duration** = widen a segment's in/out points; words falling in the window auto-populate captions.
- **Cut a section from the middle** = split one segment into two.
- **Add a section from elsewhere in the video** = insert another segment anywhere in the list.
- **Remove filler words** = many tiny segment splits, done automatically.

Nothing is re-transcribed or re-encoded until export.

## Pipeline (6 stages)

### 1. Ingest
- Local files: accept directly (mp4, mov, mkv...).
- Links: `yt-dlp` downloads from YouTube, X, TikTok, Vimeo, etc.
- Normalize with `ffmpeg`: extract a 16kHz mono WAV for transcription, generate a low-res proxy video for smooth preview scrubbing.

### 2. Transcribe (word-level timestamps are non-negotiable)
- **faster-whisper** (local, free, runs on CPU/GPU) with `word_timestamps=True`.
- Output: `[{word: "never", start: 12.41, end: 12.68}, ...]` — this single data structure powers captions, editing, karaoke highlighting, and clip boundary snapping.
- Alternative if you want cloud quality/speed: AssemblyAI or Deepgram APIs.

### 3. Find highlights
- Chunk the transcript into ~2–5 min windows, send to an LLM (Claude API, or local via Ollama) with a prompt like: *"Score each candidate segment 0–100 for hook strength, self-contained story, emotional peak. Return start/end timestamps + a title."*
- Refine boundaries mechanically: snap start/end to sentence boundaries and silence gaps (detect via `ffmpeg silencedetect` or word-gap analysis) so clips never start mid-word.
- No-LLM fallback: score by audio energy, speech rate, and keyword density — worse, but offline.

### 4. Canvas & layout (the frame system)
The clip renders onto a **canvas**, and the source video is just a layer on it:

- **Canvas aspect**: 9:16, 1:1, or 16:9 — switchable per clip, per export.
- **Video layer fill modes**:
  - *Fill*: video scaled to cover the whole canvas (cropped as needed — this is where auto-reframe kicks in).
  - *Fit*: video scaled down inside the canvas, free space above/below/around. User can drag to reposition and pinch/scroll to resize the video within the frame.
- **Background**: what shows behind a fitted video — solid color, gradient, blurred copy of the video, or an uploaded image.
- **Brand frame**: user uploads a PNG (with transparency) or image template — logo, borders, headline area, brand colors — that composites *over or behind* the video layer. Stored as a reusable brand kit so every clip exports on-brand. Headline/title text is its own layer with font + position.
- **Layer stack (bottom → top)**: background → video → brand frame → headline text → captions. Caption position is set relative to the canvas, not the video, so captions can sit in the empty space below a fitted video.

**Auto-reframe** (for fill mode): face detection per sampled frame (**MediaPipe** — light, local), smooth the crop path so the camera doesn't jitter, follow the active speaker. Fallback: center crop.

### 5. Edit (where your requirements live)
All edits mutate the clip's segment list and metadata, never the video. Two synced editing surfaces, like Opus:

**Timeline editor** (three tracks: video, captions, effects):
- **Extend/trim**: drag the first segment's in-handle or last segment's out-handle.
- **Split/cut**: position the playhead, hit split → segment breaks in two; delete either piece. This is how you cut the video at any section.
- Segments render as blocks; drag to reorder, gaps close automatically.

**Transcript editor** (text-driven, synced to the timeline):
- Select words → "remove section" → the corresponding video range is cut. Deleting text cuts video.
- "Add a section": browse the *full* source transcript, highlight any part, insert it into the clip — this is how you extend beyond the original clip or splice in a moment from elsewhere.
- **Filler-word removal**: auto-detect "um/uh" from the transcript and dead air from word-gap timing; one click splits them all out as micro-cuts.

**Captions**:
- **Edit text**: the caption editor is bound to the word array. Fix a misheard word → timing stays. Split/merge caption lines by regrouping words. Stored as overrides so re-runs never clobber them.
- **Styles**: a style = JSON preset `{font, size, fill, stroke, highlight color, position, words-per-line, animation: karaoke|word-pop|none}`. Ship 5–6 presets (Hormozi bold, minimal, karaoke, etc.) and let users tweak.

### 6. Render & export
- Compile the word array + style preset into an **ASS subtitle file** (ASS supports per-word karaoke timing `\k` tags, colors, outlines, positioning).
- Multi-segment clips: `trim` each segment from the source and `concat` them in the filter graph (frame-accurate, re-encoded once at export). Caption timings are remapped from source time → output time across the joins.
- Build an ffmpeg filter graph mirroring the layer stack: background color/image → `scale` + `crop` (fill) or `scale` + `overlay` at x,y (fit) for the video layer → `overlay` the brand-frame PNG → `drawtext` for headline → `ass=captions.ass` on top. One command, against the **original** source (not the proxy).
- Export presets: 9:16, 1:1, 16:9 — same clip, re-rendered per aspect with its own layout.

## UI design (modeled on Opus Clip's actual interface)

Three screens:

### Screen 1 — Home / import
Big drop zone: paste a link or drag in a file. Below it, a list of past projects. That's it — the "one-click" feel comes from hiding everything else until processing is done.

### Screen 2 — Project results (clip grid)
After processing, a grid of clip cards (grid/list toggle top-left). Each card: thumbnail, duration, AI-generated title, and a **virality score (0–99)** — scored on hook strength, flow, and trend fit; clips sort by score, highest first. Checkboxes on cards enable **bulk edit**: select several clips → apply a brand template / caption style / aspect ratio to all at once.

### Screen 3 — Clip editor (the core screen)
Classic three-zone layout:

- **Center — canvas**: live preview at the chosen aspect. A **Layout dropdown sits on the canvas itself** (Fill, Fit, Split for 2 speakers, Three/Four speakers, Screenshare top + speaker bottom, Gameplay 30/70). Layout is set **per segment** — select a segment on the timeline, then change its layout. Double-click the video (or a Crop icon) opens a **Manual Reframe** window to drag the crop precisely. Captions are draggable text boxes directly on the canvas.
- **Left — transcript panel**: full text synced to playback; select words to cut video, "Add a Section" to splice from elsewhere, filler-word removal button.
- **Right — settings panel**: brand template dropdown (top right), clip layout settings, caption style presets + font/color/position/animation controls, aspect ratio, B-roll and emoji toggles.
- **Bottom — timeline**: three tracks (video, captions, effects), draggable trim handles, split/merge at playhead, spacebar play/pause, 1.5x preview speed.

### Brand template page (separate settings screen)
Reusable template = primary/secondary colors, font family + weight, logo image + corner placement + opacity, caption preset, enabled layouts. Applied per-clip via the editor dropdown or in bulk. This maps directly to the `BrandKit` entity in the data model.

## Stack recommendation (desktop)

| Layer | Choice | Why |
|---|---|---|
| Shell/UI | **Tauri** (or Electron) + React | Native desktop, web UI for the timeline/caption editor |
| Engine | **Python sidecar** (FastAPI, localhost) | Best ecosystem: faster-whisper, yt-dlp, MediaPipe all Python |
| Video ops | ffmpeg (bundled binary) | Cutting, audio extract, subtitle burn, everything |
| Preview | HTML5 `<video>` on proxy + canvas/CSS caption overlay | Live caption preview without rendering; render only on export |
| Storage | SQLite + project folder | Sources, transcripts (JSON), clips, style presets |

Key preview trick: don't render video to preview edits. Overlay captions live in the UI (DOM/canvas synced to `video.currentTime`), and preview multi-segment cuts by auto-seeking the proxy: when playback hits a segment's end, jump `currentTime` to the next segment's start. Cuts, caption edits, and style changes all preview instantly; ffmpeg only runs at export.

## Data model

```
Source   { id, path, url?, duration, proxy_path, wav_path }
Transcript { source_id, words: [{text, start, end, edited_text?}] }
Clip     { id, source_id, title, score,
           segments: [{start, end, layout?}],  // ordered EDL; per-segment layout override
           caption_overrides, style_id, canvas_id, crop_keyframes }
Canvas   { id, aspect: 9:16|1:1|16:9, fill_mode: fill|fit,
           video_transform: {x, y, scale},
           background: {type: color|gradient|blur|image, value},
           brand_frame_id?, headline: {text, font, position} }
BrandKit { id, name, frame_png_path, logo_path, colors, fonts }
Style    { id, name, font, size, colors, stroke, position,
           words_per_line, animation }
```

## Build order (MVP → full)

1. **Week 1–2**: ingest (local + yt-dlp) → faster-whisper transcription → manual clip in/out selection → burn basic captions with ffmpeg. *Already useful.*
2. **Week 3–4**: LLM highlight detection, timeline UI with draggable in/out handles (= duration extend), caption text editing.
3. **Week 5–6**: style presets + karaoke ASS rendering, live caption preview overlay; canvas editor (aspect switch, fill/fit, drag-resize video, backgrounds).
4. **Later**: brand kits (uploadable frames, headline layer), face-tracked auto-reframe, batch export, B-roll/emoji auto-insertion.

## Costs
Fully local (faster-whisper + Ollama): $0/clip, needs a decent machine. Hybrid (local video ops + Claude API for highlight picking): pennies per video — usually the sweet spot.
