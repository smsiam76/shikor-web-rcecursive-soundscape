const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const ROOT_OPTIONS = ["C", "D", "E", "F", "G", "A"];

export const SCALES = {
  pentatonic: {
    id: "pentatonic",
    label: "Pentatonic",
    intervals: [0, 2, 4, 7, 9],
    signatureOffsets: [0, 2, 4, 5, 7],
    chordRoots: [0, 3, 4, 2],
    timbre: {
      oscillator: "sine",
      modulation: "triangle",
      harmonicity: 2,
      modulationIndex: 1.4,
      attackScale: 1.15,
      releaseScale: 1.25,
      cutoffBias: 0,
      chimeMix: 0.75,
    },
  },
  hirajoshi: {
    id: "hirajoshi",
    label: "Hirajoshi",
    intervals: [0, 2, 3, 7, 8],
    signatureOffsets: [0, 1, 2, 3, 4, 5],
    chordRoots: [0, 4, 2, 1],
    timbre: {
      oscillator: "triangle",
      modulation: "sine",
      harmonicity: 3.01,
      modulationIndex: 4.2,
      attackScale: 0.42,
      releaseScale: 0.9,
      cutoffBias: 420,
      chimeMix: 1.0,
    },
  },
};

export const SCALE_OPTIONS = Object.values(SCALES);

export function getScaleNotes(scaleId = "pentatonic", rootNote = "C", minOctave = 2, maxOctave = 6) {
  const scale = SCALES[scaleId] || SCALES.pentatonic;
  const rootIndex = NOTE_NAMES.indexOf(rootNote);
  const safeRoot = rootIndex === -1 ? 0 : rootIndex;
  const notes = [];

  for (let octave = minOctave; octave <= maxOctave; octave += 1) {
    for (const semitone of scale.intervals) {
      const midi = (octave + 1) * 12 + safeRoot + semitone;
      const noteName = NOTE_NAMES[midi % 12];
      const noteOctave = Math.floor(midi / 12) - 1;
      notes.push(`${noteName}${noteOctave}`);
    }
  }

  return notes;
}

export function getScaleSignatureNotes(scaleId = "pentatonic", rootNote = "C") {
  const scale = SCALES[scaleId] || SCALES.pentatonic;
  const notes = getScaleNotes(scaleId, rootNote, 3, 5);
  return scale.signatureOffsets
    .map((offset) => notes[Math.min(notes.length - 1, 3 + offset)])
    .filter(Boolean);
}