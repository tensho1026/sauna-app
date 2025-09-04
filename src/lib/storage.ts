"use client";

import {
  addSession as addSessionAction,
  getSessionsByDate,
  removeSession as removeSessionAction,
  setSessions as setSessionsAction,
  listDatesWithSessions,
  getOverallAverage as getOverallAverageAction,
} from "@/app/actions/saunaSessions";

export function getDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getSessions(dateKey: string): Promise<number[]> {
  return await getSessionsByDate(dateKey);
}

export async function setSessions(dateKey: string, sessions: number[]): Promise<void> {
  await setSessionsAction(dateKey, sessions);
}

export async function addSession(dateKey: string, minutes: number): Promise<void> {
  await addSessionAction(dateKey, minutes);
}

export async function removeSession(dateKey: string, index: number): Promise<void> {
  await removeSessionAction(dateKey, index);
}

export async function listAvailableDates(): Promise<string[]> {
  return await listDatesWithSessions();
}

export async function getOverallAverage(): Promise<number> {
  return await getOverallAverageAction();
}

export function sumSessions(sessions: number[]): number {
  return sessions.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
}

export function formatDisplayDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}
