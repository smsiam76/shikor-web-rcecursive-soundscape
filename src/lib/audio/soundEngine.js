import { SCALES, getScaleSignatureNotes } from "@/constants/scales";
import { buildPlaybackTimeline } from "@/lib/audio/noteMapper";

export const AMBIENT_TRACKS = {
  rain: { id: "rain", label: "Rain", urls: ["/sounds/rain.mp3", "/rain.mp3"] },
  wind: { id: "wind", label: "Wind", urls: ["/sounds/wind.mp3", "/wind.mp3"] },
  forest: { id: "forest", label: "Forest", urls: ["/sounds/forest.mp3", "/forest.mp3"] },
};

const BASS_VOICE_COUNT = 4;
const MELODY_VOICE_COUNT = 10;
const CHIME_VOICE_COUNT = 6;

class SoundEngine {
  constructor() {
    this.Tone = null;
    this.initialized = false;
    this.masterLimiter = null;
    this.masterGain = null;
    this.dryBus = null;
    this.reverb = null;
    this.delay = null;

    this.pools = {
      bass: [],
      melody: [],
      chime: [],
    };
    this.cursors = {
      bass: 0,
      melody: 0,
      chime: 0,
    };

    this.ambient = {
      rain: { status: "idle", player: null, gain: null, enabled: false, volume: 0.25 },
      wind: { status: "idle", player: null, gain: null, enabled: false, volume: 0.25 },
      forest: { status: "idle", player: null, gain: null, enabled: false, volume: 0.25 },
    };

    this.playbackToken = 0;
    this.scheduledIds = [];
    this.loopTimer = null;
    this.isPlaying = false;
  }

  async ensureStarted() {
    if (typeof window === "undefined") return false;

    if (!this.Tone) {
      this.Tone = await import("tone");
    }

    const Tone = this.Tone;
    if (Tone.getContext().state !== "running") {
      await Tone.start();
    }

    if (!this.initialized) {
      this.masterLimiter = new Tone.Limiter(-2).toDestination();
      this.masterGain = new Tone.Gain(0.92).connect(this.masterLimiter);

      this.reverb = new Tone.Reverb({
        decay: 4.8,
        preDelay: 0.04,
        wet: 0.42,
      }).connect(this.masterGain);

      this.delay = new Tone.FeedbackDelay({
        delayTime: 0.36,
        feedback: 0.24,
        wet: 0.18,
      }).connect(this.reverb);

      this.dryBus = new Tone.Gain(0.86).connect(this.delay);

      for (let i = 0; i < BASS_VOICE_COUNT; i += 1) {
        const panner = new Tone.Panner(0).connect(this.reverb);
        const filter = new Tone.Filter({
          type: "lowpass",
          frequency: 760,
          rolloff: -24,
          Q: 0.5,
        }).connect(panner);

        const synth = new Tone.Synth({
          oscillator: { type: "sine" },
          envelope: { attack: 0.14, decay: 0.6, sustain: 0.45, release: 2.2 },
        }).connect(filter);

        this.pools.bass.push({ synth, filter, panner, lastTime: 0 });
      }

      for (let i = 0; i < MELODY_VOICE_COUNT; i += 1) {
        const panner = new Tone.Panner(0).connect(this.dryBus);
        const filter = new Tone.Filter({
          type: "lowpass",
          frequency: 1900,
          rolloff: -12,
          Q: 0.7,
        }).connect(panner);

        const synth = new Tone.FMSynth({
          harmonicity: 2,
          modulationIndex: 1.8,
          oscillator: { type: "sine" },
          envelope: { attack: 0.04, decay: 0.45, sustain: 0.22, release: 1.5 },
          modulation: { type: "triangle" },
          modulationEnvelope: { attack: 0.01, decay: 0.28, sustain: 0.05, release: 0.4 },
        }).connect(filter);

        this.pools.melody.push({ synth, filter, panner, lastTime: 0 });
      }

      for (let i = 0; i < CHIME_VOICE_COUNT; i += 1) {
        const panner = new Tone.Panner(0).connect(this.delay);
        const filter = new Tone.Filter({
          type: "lowpass",
          frequency: 2400,
          rolloff: -12,
          Q: 0.5,
        }).connect(panner);

        const synth = new Tone.FMSynth({
          harmonicity: 3,
          modulationIndex: 2.2,
          oscillator: { type: "sine" },
          envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 1.8 },
          modulation: { type: "sine" },
          modulationEnvelope: { attack: 0.005, decay: 0.18, sustain: 0.02, release: 0.3 },
        }).connect(filter);

        this.pools.chime.push({ synth, filter, panner, lastTime: 0 });
      }

      this.initialized = true;
    }

    return true;
  }

  triggerVoice(voiceData, time) {
    if (!this.initialized) return;

    const layer = voiceData.layer && this.pools[voiceData.layer] ? voiceData.layer : "melody";
    const pool = this.pools[layer];
    if (!pool || pool.length === 0) return;

    const slot = pool[this.cursors[layer]];
    this.cursors[layer] = (this.cursors[layer] + 1) % pool.length;

    const now = this.Tone.now();
    const safeTime = Math.max(time, now + 0.01, slot.lastTime + 0.018);
    slot.lastTime = safeTime;

    const scaleDef = SCALES[voiceData.scale] || SCALES.pentatonic;
    const timbre = scaleDef.timbre;

    if (layer === "melody") {
      slot.synth.harmonicity.setValueAtTime(timbre.harmonicity, safeTime);
      slot.synth.modulationIndex.setValueAtTime(timbre.modulationIndex, safeTime);
    }

    slot.synth.envelope.attack = voiceData.attack;
    slot.synth.envelope.release = voiceData.release;
    slot.filter.frequency.setValueAtTime(voiceData.filterCutoff, safeTime);
    slot.panner.pan.setValueAtTime(voiceData.pan, safeTime);

    slot.synth.triggerAttackRelease(
      voiceData.note,
      voiceData.duration,
      safeTime,
      voiceData.velocity
    );
  }

  async previewScale(scaleId, rootNote = "C") {
    const ready = await this.ensureStarted();
    if (!ready) return;

    const notes = getScaleSignatureNotes(scaleId, rootNote);
    const scaleDef = SCALES[scaleId] || SCALES.pentatonic;
    const now = this.Tone.now() + 0.03;

    this.triggerVoice(
      {
        layer: "bass",
        scale: scaleId,
        note: `${rootNote}2`,
        duration: 1.6,
        velocity: 0.34,
        attack: 0.08,
        release: 1.5,
        filterCutoff: 850,
        pan: 0,
      },
      now
    );

    notes.forEach((note, idx) => {
      this.triggerVoice(
        {
          layer: "melody",
          scale: scaleId,
          note,
          duration: 0.65,
          velocity: 0.36,
          attack: 0.025 * scaleDef.timbre.attackScale,
          release: 1.15 * scaleDef.timbre.releaseScale,
          filterCutoff: 1900 + scaleDef.timbre.cutoffBias,
          pan: -0.45 + (idx / Math.max(1, notes.length - 1)) * 0.9,
        },
        now + idx * 0.14
      );
    });
  }

  clearScheduled() {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    if (this.Tone) {
      const transport = this.Tone.getTransport();
      for (const id of this.scheduledIds) {
        transport.clear(id);
      }
      transport.stop();
      transport.position = 0;
    }
    this.scheduledIds = [];
  }

  stopPlayback() {
    this.playbackToken += 1;
    this.isPlaying = false;
    this.clearScheduled();
  }

  async playSequence(steps, options = {}, callbacks = {}) {
    if (!steps || steps.length === 0) return;

    const token = ++this.playbackToken;
    const ready = await this.ensureStarted();
    if (!ready || token !== this.playbackToken) return;

    this.clearScheduled();
    this.isPlaying = true;

    const { loop = false } = options;
    const Tone = this.Tone;
    const transport = Tone.getTransport();
    const draw = Tone.getDraw();
    let passIndex = 0;

    const schedulePass = () => {
      if (token !== this.playbackToken) return;

      const timeline = buildPlaybackTimeline(steps, {
        ...options,
        passIndex,
      });
      passIndex += 1;

      this.clearScheduled();
      transport.position = 0;

      for (const event of timeline.events) {
        const eventId = transport.schedule((audioTime) => {
          if (token !== this.playbackToken) return;

          for (const voice of event.voices) {
            this.triggerVoice(voice, audioTime + voice.offset);
          }

          draw.schedule(() => {
            if (token !== this.playbackToken) return;
            callbacks.onStep?.({
              ids: event.nodeIds,
              note: event.leadNote,
              depth: event.depth,
              notes: event.voices.map((v) => v.note),
            });
          }, audioTime);
        }, event.time);

        this.scheduledIds.push(eventId);
      }

      const endDelayMs = Math.max(
        300,
        Math.round((loop ? timeline.loopDuration : timeline.totalDuration) * 1000)
      );

      this.loopTimer = setTimeout(() => {
        if (token !== this.playbackToken) return;
        if (loop) {
          schedulePass();
        } else {
          this.isPlaying = false;
          this.clearScheduled();
          callbacks.onComplete?.();
        }
      }, endDelayMs);

      transport.start("+0.02");
    };

    schedulePass();
  }

  async loadAmbientTrack(trackId, forceRetry = false) {
    const entry = this.ambient[trackId];
    const meta = AMBIENT_TRACKS[trackId];
    if (!entry || !meta) return "missing";
    if (entry.status === "ready") return "ready";
    if (entry.status === "loading") return "loading";
    if (entry.status === "missing" && !forceRetry) return "missing";

    entry.status = "loading";

    try {
      let decodedBuffer = null;
      const rawCtx = this.Tone.getContext().rawContext;

      for (const url of meta.urls) {
        const response = await fetch(url, { cache: "no-store" });
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || contentType.includes("text/html")) {
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength < 128) continue;

        decodedBuffer = await rawCtx.decodeAudioData(arrayBuffer.slice(0));
        break;
      }

      if (!decodedBuffer) {
        entry.status = "missing";
        return "missing";
      }

      const Tone = this.Tone;
      const gain = new Tone.Gain(0).connect(this.masterLimiter);
      const player = new Tone.Player(decodedBuffer).connect(gain);
      player.loop = true;
      player.fadeIn = 0.6;
      player.fadeOut = 0.6;

      entry.gain = gain;
      entry.player = player;
      entry.status = "ready";
      return "ready";
    } catch {
      entry.status = "missing";
      return "missing";
    }
  }

  async syncAmbient(ambientConfig, { retryMissing = false } = {}) {
    if (!ambientConfig) return this.getAmbientStatuses();

    const anyEnabled = Object.values(ambientConfig).some((item) => item?.enabled);
    if (!this.initialized && !anyEnabled) {
      return this.getAmbientStatuses();
    }

    if (anyEnabled) {
      await this.ensureStarted();
    }

    if (!this.initialized) return this.getAmbientStatuses();

    const tasks = Object.keys(AMBIENT_TRACKS).map(async (trackId) => {
      const cfg = ambientConfig[trackId] || { enabled: false, volume: 0.25 };
      const entry = this.ambient[trackId];
      entry.enabled = Boolean(cfg.enabled);
      entry.volume = cfg.volume ?? 0.25;

      if (
        entry.enabled &&
        (entry.status === "idle" || (retryMissing && entry.status === "missing"))
      ) {
        await this.loadAmbientTrack(trackId, retryMissing);
      }

      if (entry.status === "ready" && entry.player && entry.gain) {
        const targetGain = entry.enabled ? Math.max(0, Math.min(0.65, entry.volume * 0.65)) : 0;

        if (entry.enabled && entry.player.state !== "started") {
          entry.player.start();
        }

        entry.gain.gain.rampTo(targetGain, 0.35);

        if (!entry.enabled && entry.player.state === "started") {
          setTimeout(() => {
            if (!entry.enabled && entry.player && entry.player.state === "started") {
              entry.player.stop();
            }
          }, 420);
        }
      }
    });

    await Promise.all(tasks);
    return this.getAmbientStatuses();
  }

  getAmbientStatuses() {
    return {
      rain: this.ambient.rain.status,
      wind: this.ambient.wind.status,
      forest: this.ambient.forest.status,
    };
  }
}

export const soundEngine = new SoundEngine();