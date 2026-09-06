/**
 * Read a JSON-encoded UI preference from localStorage.
 *
 * Extracted because useDarkMode and useSkin each carried a byte-identical copy
 * of it. Returns the fallback on the server, on a missing key, and on
 * unparseable JSON — the last of which the originals did not handle: a
 * hand-edited or half-written localStorage value threw inside an effect and
 * took the layout down with it.
 */
export function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (stored === null) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}
