// Saved progress (Continue) and the best score, in the browser (design: "Saving", "Best score").
// Every read and write is guarded: storage can be blocked, and the game must still run.

const SAVE_KEY = 'rghw.save.v1';
const BEST_KEY = 'rghw.best.v1';

/** Where a Continue picks up: the first room of the stage you reached, with the run so far. */
export interface SaveData {
  /** Index into the game's room list of the first room of the saved stage. */
  room: number;
  stage: number;
  score: number;
  deaths: number;
  boats: number;
  skipped: string[];
}

export interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const browserStore = (): Store | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

function read<T>(key: string, store: Store | null): T | null {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown, store: Store | null): void {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: progress lasts for this session */
  }
}

export function loadSave(store = browserStore()): SaveData | null {
  const s = read<Partial<SaveData>>(SAVE_KEY, store);
  if (!s || typeof s.room !== 'number' || s.room < 0) return null;
  return { stage: s.stage ?? 0, score: s.score ?? 0, deaths: s.deaths ?? 0, boats: s.boats ?? 0, skipped: s.skipped ?? [], room: s.room };
}

export function writeSave(s: SaveData, store = browserStore()): void {
  write(SAVE_KEY, s, store);
}

export function clearSave(store = browserStore()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadBest(store = browserStore()): number {
  const b = read<number>(BEST_KEY, store);
  return typeof b === 'number' && b > 0 ? b : 0;
}

/** Records `score` if it beats the best; returns the best after the update. */
export function recordBest(score: number, store = browserStore()): number {
  const best = loadBest(store);
  if (score > best) write(BEST_KEY, score, store);
  return Math.max(best, score);
}
