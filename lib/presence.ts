import "server-only";

const presence = new Map<string, number>();

export function markActive(userId: string) {
  presence.set(userId, Date.now());
}

export function getLastActive(userId: string): number | null {
  return presence.get(userId) ?? null;
}

export function getAllLastActive(): Record<string, number> {
  return Object.fromEntries(presence);
}

// GC : nettoie les inactifs depuis > 1h pour eviter la fuite memoire
setInterval(
  () => {
    const cutoff = Date.now() - 3600_000;
    for (const [k, t] of presence) if (t < cutoff) presence.delete(k);
  },
  10 * 60_000,
).unref?.();
