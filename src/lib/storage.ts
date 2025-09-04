"use client";

import {
  addSession as addSessionAction,
  getSessionsByDate,
  removeSession as removeSessionAction,
  setSessions as setSessionsAction,
  listDatesWithSessions,
  getOverallAverage as getOverallAverageAction,
} from "@/app/actions/saunaSessions";
import { getDateKey as getDateKeyBase, formatDisplayDate as formatDisplayDateBase } from "@/lib/date";

export const getDateKey = getDateKeyBase;

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

export const formatDisplayDate = formatDisplayDateBase;
