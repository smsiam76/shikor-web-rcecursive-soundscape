import { SCALES } from "@/constants/scales";
import { buildTraversalSteps } from "@/lib/recursion/traversal";
import { buildPlaybackTimeline, getCompositionMeta } from "@/lib/audio/noteMapper";
import { AMBIENT_TRACKS } from "@/lib/audio/soundEngine";

const MAX_EXPORT_SECONDS = 55;
const SAMPLE_RATE = 44100;

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export function encodeAudioBufferToWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channelData = [];
  for (let ch = 0; ch < numChannels; ch += 1) {
    channelData.push(audioBuffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numFrames; i += 1) {
    for (let ch = 0; ch < numChannels; ch += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      const int16 = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

async function fetchAmbientBuffers(ambientConfig) {
  if (!ambientConfig) return [];
  const results = [];

  for (const trackId of Object.keys(AMBIENT_TRACKS)) {
    const cfg = ambientConfig[trackId];
    if (!cfg || !cfg.enabled || (cfg.volume ?? 0) <= 0.005) continue;

    const meta = AMBIENT_TRACKS[trackId];
    for (const url of meta.urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || contentType.includes("text/html")) continue;

        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer.byteLength < 128) continue;

        results.push({
          id: trackId,
          volume: cfg.volume,
          arrayBuffer,
        });
        break;
      } catch {
        continue;
      }
    }
  }

  return results;
}

export async function exportSoundscapeWav({
  structure,
  traversal,
  scale,
  rootNote,
  params,
  mode,
  seed,
  selectedNodeId,
  ambient,
  presetName = "soundscape",
}) {
  if (!structure) return null;

  const Tone = await import("tone");
  const meta = getCompositionMeta(seed, rootNote);
  const steps = buildTraversalSteps(structure, traversal, selectedNodeId, {
    strumOrder: meta.profile.strumOrder,
  });

  if (steps.length === 0) return null;

  const timeline = buildPlaybackTimeline(steps, {
    scale,
    rootNote,
    tempo: params.tempo,
    traversal,
    mode,
    params,
    seed,
    passIndex: 0,
  });

  const renderDuration = Math.min(
    MAX_EXPORT_SECONDS,
    Math.max(4, timeline.totalDuration + 1.4)
  );
  const fadeOutDuration = Math.min(1.6, renderDuration * 0.25);
  const fadeStart = Math.max(0.5, renderDuration - fadeOutDuration);
  const scaleDef = SCALES[scale] || SCALES.pentatonic;
  const timbre = scaleDef.timbre;

  const ambientRawTracks = await fetchAmbientBuffers(ambient);

  const renderedToneBuffer = await Tone.Offline(
    async (context) => {
      const masterLimiter = new Tone.Limiter(-2).toDestination();
      const masterGain = new Tone.Gain(0.92).connect(masterLimiter);
      masterGain.gain.setValueAtTime(0.92, fadeStart);
      masterGain.gain.linearRampToValueAtTime(0.0001, renderDuration);

      const reverb = new Tone.Reverb({
        decay: 4.6,
        preDelay: 0.04,
        wet: 0.42,
      }).connect(masterGain);

      if (reverb.ready) {
        await reverb.ready;
      }

      const delay = new Tone.FeedbackDelay({
        delayTime: 0.36,
        feedback: 0.24,
        wet: 0.18,
      }).connect(reverb);

      const dryBus = new Tone.Gain(0.86).connect(delay);
      const buckets = new Map();

      function getVoiceSlot(voice) {
        const layer = voice.layer || "melody";
        const key = `${layer}-${voice.depth}`;

        if (!buckets.has(key)) {
          const poolSize = layer === "bass" ? 3 : traversal === "bfs" ? 6 : 4;
          const slots = [];

          for (let i = 0; i < poolSize; i += 1) {
            const targetBus =
              layer === "bass" ? reverb : layer === "chime" ? delay : dryBus;
            const panner = new Tone.Panner(0).connect(targetBus);
            const filter = new Tone.Filter({
              type: "lowpass",
              frequency: voice.filterCutoff,
              rolloff: layer === "bass" ? -24 : -12,
              Q: layer === "melody" ? 0.7 : 0.5,
            }).connect(panner);

            let synth;
            if (layer === "bass") {
              synth = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: {
                  attack: voice.attack,
                  decay: 0.6,
                  sustain: 0.45,
                  release: voice.release,
                },
              }).connect(filter);
            } else if (layer === "chime") {
              synth = new Tone.FMSynth({
                harmonicity: 3,
                modulationIndex: 2.2,
                oscillator: { type: "sine" },
                envelope: {
                  attack: voice.attack,
                  decay: 0.3,
                  sustain: 0.1,
                  release: voice.release,
                },
                modulation: { type: "sine" },
                modulationEnvelope: {
                  attack: 0.005,
                  decay: 0.18,
                  sustain: 0.02,
                  release: 0.3,
                },
              }).connect(filter);
            } else {
              synth = new Tone.FMSynth({
                harmonicity: timbre.harmonicity,
                modulationIndex: timbre.modulationIndex,
                oscillator: { type: "sine" },
                envelope: {
                  attack: voice.attack,
                  decay: 0.45,
                  sustain: 0.22,
                  release: voice.release,
                },
                modulation: { type: "triangle" },
                modulationEnvelope: {
                  attack: 0.01,
                  decay: 0.28,
                  sustain: 0.05,
                  release: 0.4,
                },
              }).connect(filter);
            }

            slots.push({ synth, filter, panner, lastTime: -1 });
          }

          buckets.set(key, { slots, cursor: 0 });
        }

        const bucket = buckets.get(key);
        const slot = bucket.slots[bucket.cursor];
        bucket.cursor = (bucket.cursor + 1) % bucket.slots.length;
        return slot;
      }

      for (const event of timeline.events) {
        if (event.time >= fadeStart) break;

        for (const voice of event.voices) {
          const triggerTime = event.time + (voice.offset || 0);
          if (triggerTime >= fadeStart) continue;

          const slot = getVoiceSlot(voice);
          const safeTime = Math.max(0.02, triggerTime, slot.lastTime + 0.02);
          if (safeTime >= fadeStart) continue;

          slot.lastTime = safeTime;
          slot.filter.frequency.setValueAtTime(voice.filterCutoff, safeTime);
          slot.panner.pan.setValueAtTime(voice.pan, safeTime);
          slot.synth.triggerAttackRelease(
            voice.note,
            Math.min(voice.duration, Math.max(0.15, fadeStart - safeTime)),
            safeTime,
            voice.velocity
          );
        }
      }

      for (const track of ambientRawTracks) {
        try {
          const decoded = await context.rawContext.decodeAudioData(track.arrayBuffer.slice(0));
          const targetGain = Math.max(0, Math.min(0.6, track.volume * 0.6));
          const ambGain = new Tone.Gain(0).connect(masterLimiter);
          ambGain.gain.setValueAtTime(0, 0);
          ambGain.gain.linearRampToValueAtTime(targetGain, 0.8);
          ambGain.gain.setValueAtTime(targetGain, fadeStart);
          ambGain.gain.linearRampToValueAtTime(0.0001, renderDuration);

          const player = new Tone.Player(decoded).connect(ambGain);
          player.loop = true;
          player.start(0);
        } catch {
          continue;
        }
      }
    },
    renderDuration,
    2,
    SAMPLE_RATE
  );

  const audioBuffer = renderedToneBuffer.get();
  if (!audioBuffer) return null;

  const wavBlob = encodeAudioBufferToWav(audioBuffer);
  const slug = presetName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filename = `recursive-soundscapes-${slug}-${mode}-${traversal}.wav`;

  const downloadUrl = URL.createObjectURL(wavBlob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1500);

  return { filename, duration: renderDuration };
}