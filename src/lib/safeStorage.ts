// Privacy settings and storage quotas must not crash shopping or checkout.
export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Continue in memory. */
  }
}

export function removePreference(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* Optional preferences must not block sign-in or sign-out. */
  }
}

// Create per provider, never share authentication state between SSR requests.
// Restricted browsers can still sign in for the lifetime of the current page.
export function createBrowserTokenStorage() {
  const memory = new Map<string, string>();
  let memoryOnly = false;
  return {
    getItem(key: string): string | null {
      if (typeof window === "undefined") return null;
      if (!memoryOnly) {
        try {
          const value = window.localStorage.getItem(key);
          if (value === null) memory.delete(key);
          else memory.set(key, value);
          return value;
        } catch {
          memoryOnly = true;
        }
      }
      return memory.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (typeof window === "undefined") return;
      memory.set(key, value);
      if (!memoryOnly) {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          memoryOnly = true;
        }
      }
    },
    removeItem(key: string) {
      if (typeof window === "undefined") return;
      memory.delete(key);
      // Removal can succeed even when writes failed because storage was full.
      try {
        window.localStorage.removeItem(key);
      } catch {
        memoryOnly = true;
      }
    },
  };
}
