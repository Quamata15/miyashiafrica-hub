// Small per-browser lists: recently viewed products (#17) and the comparison tray (#14).
const get = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
const set = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } window.dispatchEvent(new Event(`miyashi:${k}`)); };

export const recentlyViewed = {
  list: () => get("miyashi_recent"),
  add: (id: string) => set("miyashi_recent", [id, ...get("miyashi_recent").filter((x) => x !== id)].slice(0, 20)),
};

export const COMPARE_MAX = 4;
export const compareList = {
  key: "miyashi_compare",
  list: () => get("miyashi_compare"),
  has: (id: string) => get("miyashi_compare").includes(id),
  toggle: (id: string) => {
    const cur = get("miyashi_compare");
    if (cur.includes(id)) { set("miyashi_compare", cur.filter((x) => x !== id)); return false; }
    if (cur.length >= COMPARE_MAX) return null;
    set("miyashi_compare", [...cur, id]); return true;
  },
  clear: () => set("miyashi_compare", []),
};
