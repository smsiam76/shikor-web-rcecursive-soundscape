"use client";

import { useState } from "react";
import { FiEye, FiEyeOff, FiHelpCircle, FiX } from "react-icons/fi";

const SHORTCUTS = [
  { key: "Space", action: "Play / Stop" },
  { key: "N", action: "New tune" },
  { key: "M", action: "Tree / Ripples" },
  { key: "T", action: "DFS / BFS" },
  { key: "S", action: "Pentatonic / Hirajoshi" },
  { key: "1–3", action: "Switch presets" },
  { key: "Z", action: "Zen mode" },
  { key: "Click", action: "Play sub-tree" },
];

export default function StatusHud({
  activeDepth,
  maxDepth,
  nodeCount,
  activeNote,
  rootNote,
  scale,
  profileName,
  selectedSubtreeCount,
  isPlaying,
  isZenMode,
  accentColor,
  onClearSubtree,
  onToggleZen,
}) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <aside
        aria-label="Live recursion telemetry"
        className={`glass-pill fixed top-4 left-4 z-20 flex flex-wrap items-center gap-2.5 rounded-full px-3.5 py-2 text-[11px] font-mono text-neutral-300 transition-opacity duration-500 ${
          isZenMode ? "opacity-45 hover:opacity-90" : "opacity-100"
        }`}
      >
        <span
          className="h-1.5 w-1.5 rounded-full transition-opacity"
          style={{
            backgroundColor: accentColor,
            opacity: isPlaying ? 1 : 0.35,
          }}
          aria-hidden="true"
        />

        <span>
          depth <strong className="font-medium text-neutral-100">{activeDepth}</strong>/{maxDepth}
        </span>

        <span className="text-white/20" aria-hidden="true">
          ·
        </span>

        <span>
          nodes <strong className="font-medium text-neutral-100">{nodeCount}</strong>
        </span>

        <span className="text-white/20" aria-hidden="true">
          ·
        </span>

        <span className="min-w-[2.2rem] text-center font-medium text-white" aria-live="polite">
          {activeNote}
        </span>

        {!isZenMode && (
          <>
            <span className="hidden sm:inline text-white/20" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline text-neutral-400">
              {rootNote} {scale} · {profileName}
            </span>
          </>
        )}

        {selectedSubtreeCount > 0 && (
          <>
            <span className="text-white/20" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={onClearSubtree}
              aria-label="Clear selected sub-tree"
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-neutral-100 hover:bg-white/18 transition cursor-pointer"
            >
              <span>subtree {selectedSubtreeCount}</span>
              <FiX className="h-3 w-3" aria-hidden="true" />
            </button>
          </>
        )}
      </aside>

      <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
        {!isZenMode && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHelp((prev) => !prev)}
              aria-expanded={showHelp}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts"
              className="glass-pill flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 hover:bg-white/12 hover:text-white transition cursor-pointer"
            >
              <FiHelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            {showHelp && (
              <div
                role="dialog"
                aria-label="Keyboard shortcuts"
                className="glass-panel absolute top-10 right-0 w-56 rounded-2xl p-3.5 text-xs text-neutral-200"
              >
                <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-400">
                  <span>Shortcuts</span>
                  <button
                    type="button"
                    onClick={() => setShowHelp(false)}
                    aria-label="Close shortcuts"
                    className="rounded p-0.5 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <FiX className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {SHORTCUTS.map((item) => (
                    <li key={item.key} className="flex items-center justify-between gap-2">
                      <span className="text-neutral-400">{item.action}</span>
                      <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-neutral-100">
                        {item.key}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setShowHelp(false);
            onToggleZen();
          }}
          aria-pressed={isZenMode}
          aria-label={isZenMode ? "Exit Zen mode" : "Enter Zen mode"}
          title={isZenMode ? "Exit Zen mode (Z)" : "Zen mode (Z)"}
          className={`glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/14 hover:text-white transition-all cursor-pointer ${
            isZenMode ? "opacity-40 hover:opacity-100 focus-visible:opacity-100" : "opacity-100"
          }`}
        >
          {isZenMode ? (
            <>
              <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Show UI</span>
            </>
          ) : (
            <>
              <FiEyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Zen</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}