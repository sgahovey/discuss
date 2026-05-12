import "server-only";

type Strike = { at: number; reason: string };
type Recent = { at: number; length: number };

type State = {
  strikes: Strike[];
  bannedUntil: number;
  lastContent?: string;
  lastContentAt?: number;
  duplicateCount?: number;
  recent: Recent[];
};

const states = new Map<string, State>();

const STRIKE_WINDOW_MS = 10 * 60_000; // 10 min
const BAN_THRESHOLDS: Array<{ strikes: number; banMs: number }> = [
  { strikes: 3, banMs: 5 * 60_000 },
  { strikes: 5, banMs: 30 * 60_000 },
  { strikes: 8, banMs: 2 * 3600_000 },
];

const DUPLICATE_WINDOW_MS = 30_000;
const DUPLICATE_TRIP_AT = 3;

// Burst : > 4 messages dans 8s = on bloque le 5e
const BURST_WINDOW_MS = 8_000;
const BURST_MAX = 4;

// Low-signal : 4 messages en 30s avec une moyenne <= 5 chars = spam court
const LOWSIGNAL_WINDOW_MS = 30_000;
const LOWSIGNAL_MIN_COUNT = 4;
const LOWSIGNAL_AVG_THRESHOLD = 5;

// Slow-mode : delai minimum entre 2 messages
const MIN_DELAY_MS = 800;

function getState(userId: string): State {
  let s = states.get(userId);
  if (!s) {
    s = { strikes: [], bannedUntil: 0, recent: [] };
    states.set(userId, s);
  }
  return s;
}

function pruneStrikes(s: State) {
  const now = Date.now();
  s.strikes = s.strikes.filter((x) => now - x.at < STRIKE_WINDOW_MS);
}
function pruneRecent(s: State) {
  const cutoff = Date.now() - 60_000;
  s.recent = s.recent.filter((r) => r.at > cutoff);
}

export type BanInfo = { banned: true; retryAfterMs: number; reason: string };
export type OkInfo = { banned: false };

export function checkBan(userId: string): BanInfo | OkInfo {
  const s = getState(userId);
  const now = Date.now();
  if (s.bannedUntil > now) {
    return {
      banned: true,
      retryAfterMs: s.bannedUntil - now,
      reason: "Bloque temporairement pour spam.",
    };
  }
  return { banned: false };
}

export function addStrike(userId: string, reason: string): BanInfo | OkInfo {
  const s = getState(userId);
  pruneStrikes(s);
  s.strikes.push({ at: Date.now(), reason });

  let ban = 0;
  for (const t of BAN_THRESHOLDS) {
    if (s.strikes.length >= t.strikes) ban = t.banMs;
  }
  if (ban > 0) s.bannedUntil = Date.now() + ban;

  if (s.bannedUntil > Date.now()) {
    return {
      banned: true,
      retryAfterMs: s.bannedUntil - Date.now(),
      reason: `Trop de spam. Bloque ${formatDuration(s.bannedUntil - Date.now())}.`,
    };
  }
  return { banned: false };
}

export function detectDuplicate(userId: string, content: string): boolean {
  const s = getState(userId);
  const now = Date.now();
  const within =
    s.lastContent === content &&
    s.lastContentAt !== undefined &&
    now - s.lastContentAt < DUPLICATE_WINDOW_MS;

  if (within) {
    s.duplicateCount = (s.duplicateCount ?? 1) + 1;
    s.lastContentAt = now;
    return s.duplicateCount >= DUPLICATE_TRIP_AT;
  }
  s.lastContent = content;
  s.lastContentAt = now;
  s.duplicateCount = 1;
  return false;
}

/** Le user envoie trop vite (>= 4 messages dans les 8 dernieres secondes). */
export function detectBurst(userId: string): boolean {
  const s = getState(userId);
  pruneRecent(s);
  const cutoff = Date.now() - BURST_WINDOW_MS;
  const inWindow = s.recent.filter((r) => r.at > cutoff).length;
  return inWindow >= BURST_MAX;
}

/** Le user spam plein de messages tres courts (moyenne <= 5 chars sur 30s). */
export function detectLowSignal(userId: string, nextLength: number): boolean {
  const s = getState(userId);
  pruneRecent(s);
  const cutoff = Date.now() - LOWSIGNAL_WINDOW_MS;
  const window = s.recent.filter((r) => r.at > cutoff);
  // On simule l'ajout du futur message dans la fenetre
  const counted = [...window, { at: Date.now(), length: nextLength }];
  if (counted.length < LOWSIGNAL_MIN_COUNT) return false;
  const avg = counted.reduce((sum, r) => sum + r.length, 0) / counted.length;
  return avg <= LOWSIGNAL_AVG_THRESHOLD;
}

/** Slow-mode : retourne le delai minimum a attendre, 0 sinon. */
export function detectTooFast(userId: string): number {
  const s = getState(userId);
  if (s.recent.length === 0) return 0;
  const last = s.recent[s.recent.length - 1];
  const elapsed = Date.now() - last.at;
  return elapsed < MIN_DELAY_MS ? MIN_DELAY_MS - elapsed : 0;
}

/** A appeler apres tous les checks, AVANT l'insert en base. */
export function recordMessage(userId: string, length: number) {
  const s = getState(userId);
  s.recent.push({ at: Date.now(), length });
  pruneRecent(s);
}

export function formatDuration(ms: number): string {
  if (ms < 60_000) return `pendant ${Math.ceil(ms / 1000)}s`;
  const min = Math.ceil(ms / 60_000);
  if (min < 60) return `pendant ${min} min`;
  const h = Math.ceil(min / 60);
  return `pendant ${h}h`;
}

setInterval(
  () => {
    const cutoff = Date.now() - 3600_000;
    for (const [k, s] of states) {
      pruneStrikes(s);
      pruneRecent(s);
      const stale =
        s.bannedUntil < cutoff &&
        s.strikes.length === 0 &&
        s.recent.length === 0 &&
        (s.lastContentAt ?? 0) < cutoff;
      if (stale) states.delete(k);
    }
  },
  10 * 60_000,
).unref?.();
