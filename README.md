# Shikor Web | Recursive Soundscapes

**Make recursion audible. Make simulation beautiful. Make the experience relaxing.**

An interactive generative audio-visual web app built for **Hub's Quest — Epoch 1** (UIU Developers Hub Solo Hackathon · Creative Coding). **Shikor Web | Recursive Soundscapes** turns recursive algorithms into animated tree and ripple simulations, mapping their structure directly into calm, evolving music.

## Features

* **Animated Entry & Setup Screen:** Choose a recursive function, set the depth ($n$) with a live node-count preview, pick a playback pattern and mood atmosphere, and toggle auto-play before entering the canvas.
* **Two Switchable Recursive Modes:**
  * **Fractal Tree:** Grows depth by depth from trunk to leaves with continuous wind sway, mouse-hover breeze push, note-synced glow, and drifting leaf petals.
  * **Recursive Ripples:** Blooms outward as nested rings with gentle orbital drift, hover surface disturbance, and echoing pulse rings.
* **DFS & BFS Musical Traversals:**
  * **DFS (Melody):** Walks left to right branch by branch, creating phrased arpeggios with natural rests whenever the recursion backtracks from a leaf.
  * **BFS (Chords):** Walks depth level by depth level, playing each generation together as soft stereo-strummed chord waves.
* **Click-to-Play Sub-Trees:** Click any branch or ring on the canvas to highlight, isolate, play, or export just that sub-tree.
* **Scale-Locked Procedural Audio:** Switch between **Pentatonic** (warm felt-like tone) and Japanese **Hirajoshi** (crisp plucked tone). A 3-layer synth engine (bass pad, FM melody, high leaf chimes) runs through low-pass filtering, stereo panning, reverb, and feedback delay.
* **Fresh Compositions on Demand:** Five composition profiles (`Bloom`, `Cascade`, `Drift`, `Echo`, `Stillness`) paired with key shifts and contour variations generate a new tune on each fresh play or **New Tune** click.
* **Ambient Sound Mixer:** Toggle and adjust volume for `rain.mp3`, `wind.mp3`, and `forest.mp3`. The app stays fault-tolerant if any file is missing.
* **Mood Presets, Zen Mode & Live HUD:** Smoothly transition palettes, scales, parameters, and ambience across **Sakura Breeze**, **Midnight Zen**, and **Monsoon Forest**. Press `Z` for distraction-free Zen Mode while keeping a subtle telemetry readout in the corner.
* **Offline Stereo `.wav` Export:** Renders 44.1 kHz, 16-bit PCM `.wav` audio via `Tone.Offline()` with active ambient loops and a clean fade-out so exported files play cleanly on macOS, Windows, and Safari.

## Recursion-to-Sound Mapping

| Recursive Property | Musical Element | Behavior |
| --- | --- | --- |
| **Recursion Depth ($d$)** | Register & Timbre | Deeper nodes move higher in the scale, soften their synth attack, and lower the low-pass filter cutoff. |
| **Branch Length / Ring Radius** | Rhythm & Sustain | Longer trunks and outer rings sustain slower, grounded tones; smaller deeper nodes play lighter, quicker notes. |
| **DFS Backtracking** | Phrasing & Harmony | Returning up the call stack adds proportional breathing pauses and anchors new phrases with a warm bass chord bed. |
| **Traversal Order** | Musical Texture | **DFS** creates single-line left-to-right arpeggios; **BFS** layers nodes at the same depth into soft chord waves. |
| **Horizontal Angle / Position** | Stereo Placement | Left and right spatial offsets map directly to `Tone.Panner` ($-0.9$ to $+0.9$). |
| **Base Cases (Leaves)** | Chimes & Particles | Leaf nodes trigger airy high chimes and release drifting petals or light particles. |
| **Angle / Spread / Decay / Sway** | Contour & Timing | Moving the sliders updates interval spread, note sustain, subtle timing rubato, and geometry in real time. |

## Tech Stack

* **Framework:** Next.js (App Router, plain JavaScript)
* **Styling & Motion:** Tailwind CSS v4, Framer Motion, React Icons
* **Audio & Offline Export:** Tone.js (`tone`) + custom 16-bit PCM `.wav` encoder
* **Canvas Rendering:** Native HTML5 `<canvas>` (HiDPI, `requestAnimationFrame`)

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repository-url>
cd shikor-web
npm install
```

### 2. Ambient Audio Files

Ambient loop `.mp3` files live directly inside the `public/` folder:

```text
public/
├── rain.mp3
├── wind.mp3
└── forest.mp3
```

> If any file is missing, the app skips it cleanly without crashing.

### 3. Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. Headphones are recommended for stereo panning.

### 4. Production Build

```bash
npm run build
npm start
```

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / Stop playback |
| `N` | Compose a new tune (fresh profile and key) |
| `M` | Switch between Fractal Tree and Recursive Ripples |
| `T` | Toggle between DFS (Melody) and BFS (Chords) |
| `S` | Switch between Pentatonic and Hirajoshi scales |
| `1` / `2` / `3` | Switch presets (Sakura Breeze, Midnight Zen, Monsoon Forest) |
| `Z` | Toggle Zen Mode (hide or show controls) |
| `Esc` | Exit Zen Mode or clear sub-tree selection |

## Project Structure

```text
shikor-web/
├── public/
│   ├── rain.mp3
│   ├── wind.mp3
│   └── forest.mp3
├── src/
│   ├── app/
│   │   ├── globals.css              # Dark organic base, glass surfaces, range sliders
│   │   ├── layout.jsx               # Root layout & Google Fonts (Inter, JetBrains Mono)
│   │   ├── providers.jsx            # Client wrapper
│   │   └── page.jsx                 # Home entry page
│   ├── constants/
│   │   ├── presets.js               # Sakura Breeze, Midnight Zen, Monsoon Forest configs
│   │   └── scales.js                # Pentatonic & Hirajoshi intervals and synth timbres
│   ├── lib/
│   │   ├── recursion/
│   │   │   ├── fractalTree.js       # Fractal tree generator, wind layout, hit-testing
│   │   │   ├── recursiveRipples.js  # Recursive ripple generator, drift layout, hit-testing
│   │   │   └── traversal.js         # Shared left-to-right DFS, BFS, and sub-tree lookup
│   │   └── audio/
│   │       ├── noteMapper.js        # Composition profiles & recursion-to-music timeline mapper
│   │       ├── soundEngine.js       # Tone.js 3-layer synth engine, FX chain, ambient mixer
│   │       └── wavExporter.js       # Tone.Offline() renderer & 16-bit PCM .wav encoder
│   └── components/
│       ├── SoundscapeApp.jsx        # Shared state, playback lifecycle, keyboard controls
│       ├── EntryOverlay.jsx         # Animated welcome & initial setup screen
│       ├── SoundscapeCanvas.jsx     # HiDPI HTML5 canvas, growth animation, petals, hit-testing
│       ├── ControlDock.jsx          # Floating glass dock, grouped sliders, presets, export
│       ├── AmbientMixer.jsx         # Rain, Wind, and Forest loop toggles & volume sliders
│       └── StatusHud.jsx            # Corner telemetry HUD, shortcut guide, Zen Mode toggle
├── README.md
└── PROMPT_LOG.md                    # Full AI prompt chain and responses
```

## Hackathon Compliance & Credits

* **Event:** Hub's Quest — Epoch 1 (UIU Developers Hub)
* **AI Usage Log:** The full prompt chain and agent responses used during development are documented in `PROMPT_LOG.md`.
* **Ambient Audio Credits:** Add attribution here for `rain.mp3`, `wind.mp3`, and `forest.mp3` (e.g., Pixabay / itch.io).