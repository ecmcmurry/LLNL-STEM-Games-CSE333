const PROGRESS_KEY = 'ss_progress';
const STRUCTURE_KEY_PREFIX = 'ss_structure_';

// [LEVEL-PROGRESS] Loads the player's persistent progress (unlocked levels, stars)
export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : { unlockedLevels: [0], starsPerLevel: {} };
  } catch {
    return { unlockedLevels: [0], starsPerLevel: {} };
  }
}

// [LEVEL-PROGRESS] Saves updated progress object to persistent storage
export function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage might be full or unavailable; fail silently
  }
}

// [LEVEL-PROGRESS] Marks a level as completed and unlocks the next level
export function completeLevel(levelIndex, stars) {
  const progress = loadProgress();
  progress.starsPerLevel[levelIndex] = Math.max(
    stars,
    progress.starsPerLevel[levelIndex] ?? 0,
  );
  if (!progress.unlockedLevels.includes(levelIndex + 1)) {
    progress.unlockedLevels.push(levelIndex + 1);
  }
  saveProgress(progress);
  return progress;
}

// [BUILD-PHASE] Persists the player's current structure for a given level (autosave)
export function saveStructure(levelIndex, structure) {
  try {
    localStorage.setItem(
      STRUCTURE_KEY_PREFIX + levelIndex,
      JSON.stringify(structure),
    );
  } catch {
    // Fail silently on storage errors
  }
}

// [BUILD-PHASE] Loads a previously saved structure for a given level, or null
export function loadStructure(levelIndex) {
  try {
    const raw = localStorage.getItem(STRUCTURE_KEY_PREFIX + levelIndex);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// [BUILD-PHASE] Clears a saved structure for a level (used on "restart")
export function clearStructure(levelIndex) {
  try {
    localStorage.removeItem(STRUCTURE_KEY_PREFIX + levelIndex);
  } catch {
    // Fail silently
  }
}
