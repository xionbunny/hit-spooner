import React, { useEffect, useCallback, ReactNode } from "react";
import { useStore } from "./store/useStore";

export const useKeyboardNavigation = (
  hitIds: string[],
  selectedIndex: number,
  setSelectedIndex: (index: number) => void,
  onAccept?: (hitId: string) => void,
  onPreview?: (hitId: string) => void
) => {
  const { paused } = useStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (paused) return;

      const totalHits = hitIds.length;
      if (totalHits === 0) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, totalHits - 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case "g":
          if (!e.shiftKey) {
            e.preventDefault();
            setSelectedIndex(0);
          }
          break;
        case "G":
          e.preventDefault();
          setSelectedIndex(totalHits - 1);
          break;
        case "Enter":
          e.preventDefault();
          if (onAccept && hitIds[selectedIndex]) {
            onAccept(hitIds[selectedIndex]);
          }
          break;
        case " ":
          e.preventDefault();
          if (onPreview && hitIds[selectedIndex]) {
            onPreview(hitIds[selectedIndex]);
          }
          break;
      }
    },
    [hitIds, selectedIndex, setSelectedIndex, onAccept, onPreview, paused]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { selectedIndex };
};

export const KeyboardShortcutsHelp: React.FC = () => {
  const shortcuts = [
    { key: "j / ↓", description: "Next HIT" },
    { key: "k / ↑", description: "Previous HIT" },
    { key: "g", description: "First HIT" },
    { key: "G", description: "Last HIT" },
    { key: "Enter", description: "Accept selected HIT" },
    { key: "Space", description: "Preview HIT" },
  ];

  return (
    <div style={{ fontSize: "11px", color: "#666", padding: "4px" }}>
      <strong>Keyboard:</strong> {shortcuts.map((s) => `${s.key}=${s.description}`).join(" | ")}
    </div>
  );
};
