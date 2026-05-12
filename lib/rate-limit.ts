import "server-only";

type Bucket = { times: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  /** Identifiant unique (par ex. `${userId}:messages`) */
  key: string;
  /** Nombre max de requetes dans la fenetre */
  max: number;
  /** Taille de la fenetre en ms */
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(opts.key) ?? { times: [] };

  // Purge des timestamps trop vieux
  const cutoff = now - opts.windowMs;
  bucket.times = bucket.times.filter((t) => t > cutoff);

  if (bucket.times.length >= opts.max) {
    const oldest = bucket.times[0];
    const retryAfterMs = Math.max(0, oldest + opts.windowMs - now);
    buckets.set(opts.key, bucket);
    return { ok: false, remaining: 0, retryAfterMs };
  }

  bucket.times.push(now);
  buckets.set(opts.key, bucket);
  return {
    ok: true,
    remaining: opts.max - bucket.times.length,
    retryAfterMs: 0,
  };
}

// Garbage collection legere : si la map gonfle, on enleve les buckets vides
setInterval(
  () => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (b.times.length === 0 || b.times[b.times.length - 1] < now - 60_000) {
        buckets.delete(key);
      }
    }
  },
  5 * 60 * 1000,
).unref?.();
