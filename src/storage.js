// The tracker was built inside Claude, where progress was saved with `window.storage`.
// On a normal website that doesn't exist, so this gives the app the same small API
// backed by the browser's localStorage. Progress is saved per browser, per device.
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      try {
        const value = window.localStorage.getItem(key);
        return value === null ? null : { key, value };
      } catch {
        return null; // storage blocked (e.g. some private-browsing modes)
      }
    },
    async set(key, value) {
      try {
        window.localStorage.setItem(key, value);
        return { key, value };
      } catch {
        return null;
      }
    },
    async delete(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return { key, deleted: true };
    },
  };
}
