const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const SCALES = {
  pentatonic: {
    id: "pentatonic",
    label: "Pentatonic",
    intervals: [0, 2, 4, 7, 9],
  },
  hirajoshi: {
    id: "hirajoshi",
    label: "Hirajoshi",
    intervals: [0, 2, 3, 7, 8],
  },
};

export const SCALE_OPTIONS = Object.values(SCALES);

export function getScaleNotes(scaleId = "pentatonic", rootNote = "C", minOctave = 3, maxOctave = 5) {
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