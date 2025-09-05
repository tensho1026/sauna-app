"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addSession,
  getSessions,
  removeSession,
  setSessions,
  sumSessions,
  getOverallAverage,
  setDayMeta,
} from "@/lib/storage";
import type { DayMeta } from "@/lib/storage";

type Props = {
  dateKey: string;
  initialSessions: number[];
  initialOverallAvg: number;
  initialMeta: DayMeta;
};

function Stars({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(value === s ? null : s)}
          className={"text-xl " + (value && value >= s ? "text-yellow-400" : "text-zinc-600 hover:text-zinc-400")}
          aria-label={`${s} 星`}
        >
          {value && value >= s ? "★" : "☆"}
        </button>
      ))}
      {value !== null && (
        <button className="ml-2 text-xs text-zinc-500 hover:text-zinc-300" onClick={() => onChange(null)}>
          クリア
        </button>
      )}
    </div>
  );
}

export default function TodaySessions({ dateKey, initialSessions, initialOverallAvg, initialMeta }: Props) {
  const [sessions, setLocalSessions] = useState<number[]>(initialSessions);
  const [input, setInput] = useState<string>("");
  const [overallAvg, setOverallAvg] = useState<number>(initialOverallAvg);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [facilityName, setFacilityName] = useState<string>(initialMeta?.facilityName ?? "");
  const [conditionRating, setConditionRating] = useState<number | null>(initialMeta?.conditionRating ?? null);
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(initialMeta?.satisfactionRating ?? null);

  useEffect(() => {
    setLocalSessions(initialSessions);
    setOverallAvg(initialOverallAvg);
    setFacilityName(initialMeta?.facilityName ?? "");
    setConditionRating(initialMeta?.conditionRating ?? null);
    setSatisfactionRating(initialMeta?.satisfactionRating ?? null);
  }, [initialSessions, initialOverallAvg, initialMeta]);

  const total = useMemo(() => sumSessions(sessions), [sessions]);
  const dayAvg = useMemo(() => (sessions.length ? total / sessions.length : 0), [sessions, total]);

  const onAdd = async () => {
    const minutes = Number(input);
    if (!minutes || minutes <= 0 || !Number.isFinite(minutes)) return;
    const rounded = Math.round(minutes);
    // Optimistic update
    setLocalSessions((prev) => [...prev, rounded]);
    setInput("");
    await addSession(dateKey, rounded, {
      facilityName: facilityName || null,
      conditionRating,
      satisfactionRating,
    });
    const avg = await getOverallAverage();
    setOverallAvg(avg);
  };

  const onDelete = async (idx: number) => {
    // Optimistic update
    setLocalSessions((prev) => prev.filter((_, i) => i !== idx));
    await removeSession(dateKey, idx);
    const avg = await getOverallAverage();
    setOverallAvg(avg);
  };

  const onReorderOrEdit = async (idx: number, value: string) => {
    const n = Number(value);
    if (!n || n <= 0 || !Number.isFinite(n)) return;
    const next = [...sessions];
    next[idx] = Math.round(n);
    setLocalSessions(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await setSessions(dateKey, next);
      const avg = await getOverallAverage();
      setOverallAvg(avg);
    }, 500);
  };

  const saveMeta = () => {
    if (metaTimer.current) clearTimeout(metaTimer.current);
    // セッションが1件以上あるときのみ即時保存（0件なら追加時に保存される）
    metaTimer.current = setTimeout(async () => {
      if (sessions.length > 0) {
        await setDayMeta(dateKey, {
          facilityName: facilityName || null,
          conditionRating,
          satisfactionRating,
        });
      }
    }, 400);
  };

  return (
    <>
      <section className="mt-4 space-y-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">施設名</label>
          <input
            type="text"
            placeholder="例: ○○サウナ"
            className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none border-b border-zinc-700 focus:border-zinc-400"
            value={facilityName}
            onChange={(e) => {
              setFacilityName(e.target.value);
              saveMeta();
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">その日の体調</span>
          <Stars
            value={conditionRating}
            onChange={(v) => {
              setConditionRating(v);
              saveMeta();
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">その日の満足度</span>
          <Stars
            value={satisfactionRating}
            onChange={(v) => {
              setSatisfactionRating(v);
              saveMeta();
            }}
          />
        </div>
        {sessions.length === 0 && (
          <div className="text-xs text-zinc-500">最初のセッション追加時に保存されます</div>
        )}
      </section>
      <section className="mt-2 text-center">
        <div className="text-[12px] text-zinc-400">今日の合計</div>
        <div className="mt-1 text-6xl font-bold tracking-tight">
          {total}
          <span className="ml-2 text-xl font-medium text-zinc-400">分</span>
        </div>
        <div className="mt-2 text-sm text-zinc-400">
          1回平均: {dayAvg.toFixed(1)} 分
          <span className="mx-2">/</span>
          全体平均: {overallAvg.toFixed(1)} 分
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-sm text-zinc-300 mb-3">内訳</h2>
        <ul className="space-y-2">
          {sessions.length === 0 && (
            <li className="text-zinc-500 text-sm">まだ記録がありません</li>
          )}
          {sessions.map((m, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg bg-zinc-900/70 border border-zinc-800 px-4 py-3"
            >
              <div className="text-zinc-200 text-base">{i + 1}回目</div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-20 bg-transparent text-right text-zinc-100 outline-none border-b border-zinc-700 focus:border-zinc-400"
                  value={String(m)}
                  onChange={(e) => onReorderOrEdit(i, e.target.value)}
                  min={1}
                />
                <span className="text-zinc-400">分</span>
                <button
                  aria-label="削除"
                  onClick={() => onDelete(i)}
                  className="text-zinc-400 hover:text-red-400 active:opacity-80"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <div className="flex items-center gap-3 bg-zinc-900/70 border border-zinc-800 rounded-xl p-3">
          <input
            type="number"
            inputMode="numeric"
            placeholder="何分？"
            className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            min={1}
          />
          <button
            onClick={onAdd}
            className="px-4 py-2 rounded-lg bg-zinc-100 text-black font-semibold active:opacity-90 disabled:opacity-40"
            disabled={!input}
          >
            追加
          </button>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          入力後「追加」で保存されます（自動保存）
        </div>
      </section>
    </>
  );
}
