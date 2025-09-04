"use server";

import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";

async function assertAuthed() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

function isValidDateKey(dateKey: string): boolean {
  // very basic YYYY-MM-DD check
  return /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dateKey);
}

export type SessionRow = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  session_order: number;
  minutes: number;
  created_at: string | null;
};

// 全体の1回平均（分）を返す
export async function getOverallAverage(): Promise<number> {
  const userId = await assertAuthed();
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ cnt: number; total: number }>(
      `SELECT COUNT(*)::int AS cnt, COALESCE(SUM(minutes), 0)::int AS total
       FROM sauna_sessions
       WHERE user_id = $1`,
      [userId]
    );
    const cnt = rows[0]?.cnt ?? 0;
    const total = rows[0]?.total ?? 0;
    if (!cnt || cnt <= 0) return 0;
    return total / cnt;
  } finally {
    client.release();
  }
}

// 日付リスト: 記録がある日付のみ（新しい順）
export async function listDatesWithSessions(): Promise<string[]> {
  const userId = await assertAuthed();
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ date: string }>(
      `SELECT DISTINCT date::text AS date
       FROM sauna_sessions
       WHERE user_id = $1
       ORDER BY date DESC`,
      [userId]
    );
    return rows.map((r) => r.date);
  } finally {
    client.release();
  }
}

// 取得: 指定日のセッション（session_order 昇順）
export async function getSessionsByDate(dateKey: string): Promise<number[]> {
  const userId = await assertAuthed();
  if (!isValidDateKey(dateKey)) throw new Error("Invalid date");

  const client = await pool.connect();
  try {
    const { rows } = await client.query<Pick<SessionRow, "minutes">>(
      `SELECT minutes
       FROM sauna_sessions
       WHERE user_id = $1 AND date = $2
       ORDER BY session_order ASC`,
      [userId, dateKey]
    );
    return rows.map((r) => Number(r.minutes) || 0).filter((n) => n > 0);
  } finally {
    client.release();
  }
}

// 追加: 指定日の最後に 1 件追加（session_order = MAX+1）
export async function addSession(dateKey: string, minutes: number): Promise<void> {
  const userId = await assertAuthed();
  if (!isValidDateKey(dateKey)) throw new Error("Invalid date");
  const n = Math.round(Number(minutes));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid minutes");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ max: number }>(
      `SELECT COALESCE(MAX(session_order), 0) AS max
       FROM sauna_sessions
       WHERE user_id = $1 AND date = $2`,
      [userId, dateKey]
    );
    const nextOrder = (rows[0]?.max ?? 0) + 1;
    await client.query(
      `INSERT INTO sauna_sessions (user_id, date, session_order, minutes)
       VALUES ($1, $2, $3, $4)`,
      [userId, dateKey, nextOrder, n]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// 削除: index ベース（0 始まり）。削除後は後続の session_order を詰める
export async function removeSession(dateKey: string, index: number): Promise<void> {
  const userId = await assertAuthed();
  if (!isValidDateKey(dateKey)) throw new Error("Invalid date");
  const order = Number(index) + 1;
  if (!Number.isInteger(order) || order <= 0) throw new Error("Invalid index");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM sauna_sessions
       WHERE user_id = $1 AND date = $2 AND session_order = $3`,
      [userId, dateKey, order]
    );
    await client.query(
      `UPDATE sauna_sessions
       SET session_order = session_order - 1
       WHERE user_id = $1 AND date = $2 AND session_order > $3`,
      [userId, dateKey, order]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// 一括置き換え: 指定日のセッションを配列で入れ替え（順番は配列順）
export async function setSessions(dateKey: string, minutesArray: number[]): Promise<void> {
  const userId = await assertAuthed();
  if (!isValidDateKey(dateKey)) throw new Error("Invalid date");
  const cleaned = (minutesArray || [])
    .map((m) => Math.round(Number(m)))
    .filter((n) => Number.isFinite(n) && n > 0);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // いったん全削除
    await client.query(
      `DELETE FROM sauna_sessions WHERE user_id = $1 AND date = $2`,
      [userId, dateKey]
    );
    // 挿入（順番は配列順）
    for (let i = 0; i < cleaned.length; i++) {
      await client.query(
        `INSERT INTO sauna_sessions (user_id, date, session_order, minutes)
         VALUES ($1, $2, $3, $4)`,
        [userId, dateKey, i + 1, cleaned[i]]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
