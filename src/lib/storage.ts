"use client";

export type SessionsMap = Record<string, number[]>;

const STORAGE_KEY = "sauna-log";

export function getDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readAll(): SessionsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return {};
    return data as SessionsMap;
  } catch (_) {
    return {};
  }
}

function writeAll(map: SessionsMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getSessions(dateKey: string): number[] {
  const map = readAll();
  const arr = map[dateKey];
  if (!Array.isArray(arr)) return [];
  return arr.filter((n) => typeof n === "number" && !isNaN(n) && n > 0);
}

export function setSessions(dateKey: string, sessions: number[]) {
  const map = readAll();
  map[dateKey] = sessions.filter((n) => typeof n === "number" && !isNaN(n) && n > 0);
  writeAll(map);
}

export function addSession(dateKey: string, minutes: number) {
  if (!minutes || isNaN(minutes) || minutes <= 0) return;
  const map = readAll();
  const arr = Array.isArray(map[dateKey]) ? map[dateKey] : [];
  arr.push(Math.round(minutes));
  map[dateKey] = arr;
  writeAll(map);
}

export function removeSession(dateKey: string, index: number) {
  const map = readAll();
  const arr = Array.isArray(map[dateKey]) ? map[dateKey] : [];
  if (index >= 0 && index < arr.length) {
    arr.splice(index, 1);
    map[dateKey] = arr;
    writeAll(map);
  }
}

export function clearDate(dateKey: string) {
  const map = readAll();
  delete map[dateKey];
  writeAll(map);
}

export function sumSessions(sessions: number[]): number {
  return sessions.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
}

export function formatDisplayDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

