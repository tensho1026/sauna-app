"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addSession,
  getSessions,
  removeSession,
  setSessions,
  sumSessions,
  getOverallAverage,
} from "@/lib/storage";

type Props = {
  dateKey: string;
  initialSessions: number[];
  initialOverallAvg: number;
};

export default function TodaySessions({ dateKey, initialSessions, initialOverallAvg }: Props) {
  const [sessions, setLocalSessions] = useState<number[]>(initialSessions);
  const [input, setInput] = useState<string>("");
  const [overallAvg, setOverallAvg] = useState<number>(initialOverallAvg);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSessions(initialSessions);
    setOverallAvg(initialOverallAvg);
  }, [initialSessions, initialOverallAvg]);

  const total = useMemo(() => sumSessions(sessions), [sessions]);
  const dayAvg = useMemo(() => (sessions.length ? total / sessions.length : 0), [sessions, total]);

  const onAdd = async () => {
    const minutes = Number(input);
    if (!minutes || minutes <= 0 || !Number.isFinite(minutes)) return;
    const rounded = Math.round(minutes);
    // Optimistic update
    setLocalSessions((prev) => [...prev, rounded]);
    setInput("");
    await addSession(dateKey, rounded);
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

  return (
    <>
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

