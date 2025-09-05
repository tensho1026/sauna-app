"use client";

import {
  addSession as addSessionAction,
  getSessionsByDate,
  removeSession as removeSessionAction,
  setSessions as setSessionsAction,
  listDatesWithSessions,
  getOverallAverage as getOverallAverageAction,
  getDayMeta as getDayMetaAction,
  setDayMeta as setDayMetaAction,
  listDatesWithSessionsByFacility,
  listFacilities as listFacilitiesAction,
} from "@/app/actions/saunaSessions";
import { getDateKey as getDateKeyBase, formatDisplayDate as formatDisplayDateBase } from "@/lib/date";

export const getDateKey = getDateKeyBase;

export async function getSessions(dateKey: string): Promise<number[]> {
  return await getSessionsByDate(dateKey);
}

export async function setSessions(dateKey: string, sessions: number[]): Promise<void> {
  await setSessionsAction(dateKey, sessions);
}

export type DayMeta = {
  facilityName: string | null;
  conditionRating: number | null;
  satisfactionRating: number | null;
};

export async function addSession(
  dateKey: string,
  minutes: number,
  meta?: Partial<DayMeta>
): Promise<void> {
  await addSessionAction(dateKey, minutes, meta);
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

export async function getDayMeta(dateKey: string) {
  return await getDayMetaAction(dateKey);
}

export async function setDayMeta(dateKey: string, meta: Partial<DayMeta>) {
  return await setDayMetaAction(dateKey, meta);
}

export async function listAvailableDatesByFacility(facilityName?: string | null) {
  return await listDatesWithSessionsByFacility(facilityName);
}

export async function listFacilities(): Promise<string[]> {
  return await listFacilitiesAction();
}

export function sumSessions(sessions: number[]): number {
  return sessions.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
}

export const formatDisplayDate = formatDisplayDateBase;
