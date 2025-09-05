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

export type DayMeta = {
  facilityName: string | null;
  conditionRating: number | null; // 1-5 or null
  satisfactionRating: number | null; // 1-5 or null
};

function clampRating(n: unknown): number | null {
  if (n === null || n === undefined || n === "") return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const i = Math.floor(v);
  if (i < 1 || i > 5) return null;
  return i;
}

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

// 指定日のメタ情報（施設名/体調/満足度）
export async function getDayMeta(dateKey: string): Promise<DayMeta> {
  const userId = await assertAuthed();
  if (!isValidDateKey(dateKey)) throw new Error("Invalid date");

  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      facility_name: string | null;
      condition_rating: number | null;
      satisfaction_rating: number | null;
    }>(
      `SELECT facility_name, condition_rating, satisfaction_rating
       FROM sauna_sessions
       WHERE user_id = $1 AND date = $2
       ORDER BY session_order ASC
       LIMIT 1`,
      [userId, dateKey]
    );
    const r = rows[0];
    return {
      facilityName: r?.facility_name ?? null,
      conditionRating: r?.condition_rating ?? null,
      satisfactionRating: r?.satisfaction_rating ?? null,
    };
  } finally {
    client.release();
  }
}

// 指定日のメタ情報を全レコードに反映（既存行のみ）
export async function setDayMeta(
  dateKey: string,
  meta: Partial<DayMeta>
): Promise<void> {
  const userId = await assertAuthed();
  if (!isValidDateKey(dateKey)) throw new Error("Invalid date");

  const facilityName = (meta.facilityName ?? null) as string | null;
  const conditionRating = clampRating(meta.conditionRating);
  const satisfactionRating = clampRating(meta.satisfactionRating);

  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE sauna_sessions
       SET facility_name = $3,
           condition_rating = $4,
           satisfaction_rating = $5
       WHERE user_id = $1 AND date = $2`,
      [userId, dateKey, facilityName, conditionRating, satisfactionRating]
    );
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
export async function addSession(
  dateKey: string,
  minutes: number,
  meta?: Partial<DayMeta>
): Promise<void> {
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
    // 既存メタ（先頭行）を取得
    let existing: DayMeta = { facilityName: null, conditionRating: null, satisfactionRating: null };
    if (nextOrder > 1) {
      const metaRows = await client.query<{
        facility_name: string | null;
        condition_rating: number | null;
        satisfaction_rating: number | null;
      }>(
        `SELECT facility_name, condition_rating, satisfaction_rating
         FROM sauna_sessions
         WHERE user_id = $1 AND date = $2
         ORDER BY session_order ASC
         LIMIT 1`,
        [userId, dateKey]
      );
      const r = metaRows.rows[0];
      existing = {
        facilityName: r?.facility_name ?? null,
        conditionRating: r?.condition_rating ?? null,
        satisfactionRating: r?.satisfaction_rating ?? null,
      };
    }
    const facilityName = (meta?.facilityName ?? existing.facilityName ?? null) as string | null;
    const conditionRating = clampRating(meta?.conditionRating ?? existing.conditionRating);
    const satisfactionRating = clampRating(meta?.satisfactionRating ?? existing.satisfactionRating);

    await client.query(
      `INSERT INTO sauna_sessions (user_id, date, session_order, minutes, facility_name, condition_rating, satisfaction_rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, dateKey, nextOrder, n, facilityName, conditionRating, satisfactionRating]
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
    // 既存メタを取得
    const metaRows = await client.query<{
      facility_name: string | null;
      condition_rating: number | null;
      satisfaction_rating: number | null;
    }>(
      `SELECT facility_name, condition_rating, satisfaction_rating
       FROM sauna_sessions
       WHERE user_id = $1 AND date = $2
       ORDER BY session_order ASC
       LIMIT 1`,
      [userId, dateKey]
    );
    const existingFacility = metaRows.rows[0]?.facility_name ?? null;
    const existingCond = metaRows.rows[0]?.condition_rating ?? null;
    const existingSat = metaRows.rows[0]?.satisfaction_rating ?? null;

    // いったん全削除
    await client.query(
      `DELETE FROM sauna_sessions WHERE user_id = $1 AND date = $2`,
      [userId, dateKey]
    );
    // 挿入（順番は配列順）
    for (let i = 0; i < cleaned.length; i++) {
      await client.query(
        `INSERT INTO sauna_sessions (user_id, date, session_order, minutes, facility_name, condition_rating, satisfaction_rating)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          dateKey,
          i + 1,
          cleaned[i],
          existingFacility,
          clampRating(existingCond),
          clampRating(existingSat),
        ]
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

// 施設名で日付を絞り込み（未指定なら全件）
export async function listDatesWithSessionsByFacility(
  facilityName?: string | null
): Promise<string[]> {
  const userId = await assertAuthed();
  const client = await pool.connect();
  try {
    if (facilityName && facilityName.trim() !== "") {
      const { rows } = await client.query<{ date: string }>(
        `SELECT DISTINCT date::text AS date
         FROM sauna_sessions
         WHERE user_id = $1 AND facility_name = $2
         ORDER BY date DESC`,
        [userId, facilityName]
      );
      return rows.map((r) => r.date);
    } else {
      const { rows } = await client.query<{ date: string }>(
        `SELECT DISTINCT date::text AS date
         FROM sauna_sessions
         WHERE user_id = $1
         ORDER BY date DESC`,
        [userId]
      );
      return rows.map((r) => r.date);
    }
  } finally {
    client.release();
  }
}

// 自分の施設名一覧（最近使用順）
export async function listFacilities(): Promise<string[]> {
  const userId = await assertAuthed();
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ facility_name: string | null }>(
      `SELECT DISTINCT facility_name
       FROM sauna_sessions
       WHERE user_id = $1 AND facility_name IS NOT NULL AND facility_name <> ''`,
      [userId]
    );
    return rows.map((r) => r.facility_name!).filter(Boolean);
  } finally {
    client.release();
  }
}
