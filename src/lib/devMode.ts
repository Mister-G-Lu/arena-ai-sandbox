/**
 * Dev capability — not a dev *account*.
 *
 * design/dev-tools.md §2 rejects binding cheats to a user row: the state worth
 * manipulating is client state, and the first-run experience (the whole cold
 * open) happens before anyone could log in. So dev mode is a boolean the
 * client computes at boot, from the build and the device.
 *
 * Tier 2 — environment gate. Auto-on where the origin is obviously not
 *          production: localhost, 127.0.0.1, *.local, *.e2b.app, file://.
 * Tier 3 — opt-in gate. `?dev=1` persists a localStorage flag for that browser
 *          profile; `?dev=0` clears it. Deliberately not a secret.
 *
 * Tier 1 (never shipping the code to production) is a build concern and Tier 4
 * (a server `dev` claim) only matters once the server owns spending. Neither
 * belongs in this file.
 *
 * Everything a dev grants is recorded: `devTouched` latches true forever and
 * the HUD wears a badge, so a cheated file can never be mistaken for a clean
 * playthrough — including one exported and mailed to somebody else.
 */

export const DEV_MODE_KEY = 'fr:dev-mode';

const DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);
const DEV_HOST_SUFFIXES = ['.local', '.e2b.app', '.localhost'];

/** Tier 2: is this origin obviously not production? */
export function isDevEnvironment(location: Location | URL | undefined = globalThis.location): boolean {
  if (!location) return false;
  const protocol = location.protocol ?? '';
  if (protocol === 'file:') return true;

  const hostname = (location.hostname ?? '').toLowerCase();
  if (!hostname) return false;
  if (DEV_HOSTNAMES.has(hostname)) return true;
  return DEV_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

function readStoredFlag(): boolean {
  try {
    return localStorage.getItem(DEV_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStoredFlag(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(DEV_MODE_KEY, '1');
    else localStorage.removeItem(DEV_MODE_KEY);
  } catch {
    // A browser with storage blocked simply cannot opt in. Tier 2 still works.
  }
}

/**
 * Tier 3: consume `?dev=1` / `?dev=0` from the URL and persist the result.
 * Returns the stored opt-in state afterwards.
 */
export function consumeDevQueryFlag(search: string = globalThis.location?.search ?? ''): boolean {
  let requested: string | null = null;
  try {
    requested = new URLSearchParams(search).get('dev');
  } catch {
    requested = null;
  }

  if (requested === '1') writeStoredFlag(true);
  else if (requested === '0') writeStoredFlag(false);

  return readStoredFlag();
}

/** The one answer the app asks for: may this client show dev capabilities? */
export function detectDevMode(
  location: Location | URL | undefined = globalThis.location,
): boolean {
  const optedIn = consumeDevQueryFlag(location?.search ?? '');
  return optedIn || isDevEnvironment(location);
}

/** Turn the Tier 3 opt-in on or off at runtime (the panel's own switch). */
export function setDevOptIn(enabled: boolean): void {
  writeStoredFlag(enabled);
}
