import "@testing-library/jest-dom";

// Node 22+ ships a built-in `localStorage` (Web Storage API) that shadows jsdom's
// and throws `TypeError: ... is not a function` unless launched with
// `--localstorage-file=<path>`. Override with a plain in-memory Storage so tests
// get working get/set/remove/clear regardless of which global wins.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
});
