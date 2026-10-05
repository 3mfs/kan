type DebugDetails = Record<string, unknown>;

/**
 * Emits drag-and-drop diagnostics only when the board URL contains
 * `?dndDebug=1`. This keeps normal browser consoles quiet while providing a
 * precise record of the final client-side drop decision when investigating a
 * report.
 */
export function debugBoardDnd(event: string, details: DebugDetails): void {
  if (
    typeof window === "undefined" ||
    new URLSearchParams(window.location.search).get("dndDebug") !== "1"
  ) {
    return;
  }

  window.console.info(`[Kan DnD] ${event}`, details);
}
