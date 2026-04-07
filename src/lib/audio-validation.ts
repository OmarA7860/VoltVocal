import "server-only";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

/** MIME types browsers typically send for MediaRecorder / mic capture. */
const ALLOWED_MIME_PREFIXES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
  "audio/m4a",
  "audio/x-wav",
] as const;

function maxAudioBytes(): number {
  const raw = process.env.MAX_AUDIO_BYTES;
  if (!raw) return DEFAULT_MAX_BYTES;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 50 * 1024 * 1024) : DEFAULT_MAX_BYTES;
}

export function validateAudioFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No audio file was uploaded." };
  }

  const limit = maxAudioBytes();
  if (file.size > limit) {
    return {
      ok: false,
      error: `Audio file is too large (max ${Math.round(limit / (1024 * 1024))} MB).`,
    };
  }

  const type = (file.type || "").toLowerCase().trim();
  if (!type) {
    return {
      ok: false,
      error: "Audio file type is missing. Please record again using the app.",
    };
  }

  const allowed = ALLOWED_MIME_PREFIXES.some((prefix) =>
    type.startsWith(prefix),
  );

  if (!allowed) {
    return {
      ok: false,
      error: "Unsupported audio format. Use the in-app recorder.",
    };
  }

  return { ok: true };
}
