import "server-only";

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

const CONTROL_CHARS = /[ --]/g;

/**
 * Valide le contenu d'un message :
 *  - retire les caracteres de controle
 *  - trim
 *  - min/max longueur (defaut: 2..500)
 *  - rejette un seul caractere repete >= 3 fois (ex "aaa", "eee")
 *  - rejette si >= 3 URLs
 */
export function validateMessage(
  raw: unknown,
  { max = 500, min = 2 }: { max?: number; min?: number } = {},
): ValidationResult {
  if (typeof raw !== "string") {
    return { ok: false, reason: "Contenu invalide." };
  }

  const cleaned = raw.replace(CONTROL_CHARS, "").trim();

  if (cleaned.length < min) {
    return {
      ok: false,
      reason:
        min === 1
          ? "Le message est vide."
          : `Le message est trop court (min. ${min} caracteres).`,
    };
  }
  if (cleaned.length > max) {
    return {
      ok: false,
      reason: `Le message est trop long (${cleaned.length}/${max}).`,
    };
  }

  // Mono-caractere repete (ex "aaa", "eeee") -- meme court
  if (cleaned.length >= 3 && /^(.)\1+$/.test(cleaned)) {
    return { ok: false, reason: "Ce message ressemble a du spam." };
  }

  // Trop d'URLs
  const urls = cleaned.match(/https?:\/\/\S+/gi) ?? [];
  if (urls.length >= 3) {
    return { ok: false, reason: "Trop de liens dans un seul message." };
  }

  return { ok: true, value: cleaned };
}

export function validateUserId(raw: unknown): raw is string {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(raw);
}
