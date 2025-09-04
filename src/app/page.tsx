"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addSession,
  getDateKey,
  getSessions,
  removeSession,
  setSessions,
  sumSessions,
  formatDisplayDate,
} from "@/lib/storage";

export default function Home() {
  const todayKey = useMemo(() => getDateKey(new Date()), []);
  const [sessions, setLocalSessions] = useState<number[]>([]);
  const [input, setInput] = useState<string>("");

  useEffect(() => {
    setLocalSessions(getSessions(todayKey));
  }, [todayKey]);

  const total = useMemo(() => sumSessions(sessions), [sessions]);

  const onAdd = () => {
    const minutes = Number(input);
    if (!minutes || minutes <= 0 || !Number.isFinite(minutes)) return;
    addSession(todayKey, minutes);
    setLocalSessions(getSessions(todayKey));
    setInput("");
  };

  const onDelete = (idx: number) => {
    removeSession(todayKey, idx);
    setLocalSessions(getSessions(todayKey));
  };

  const onReorderOrEdit = (idx: number, value: string) => {
    const n = Number(value);
    if (!n || n <= 0 || !Number.isFinite(n)) return;
    const next = [...sessions];
    next[idx] = Math.round(n);
    setLocalSessions(next);
    setSessions(todayKey, next);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black text-zinc-100">
      <header className="px-5 pt-6 pb-2">
        <div className="text-xs text-zinc-400">{formatDisplayDate(todayKey)}</div>
        <h1 className="text-lg font-semibold tracking-wide">サウナ記録</h1>
      </header>

      <main className="flex-1 px-5 pb-28">
        <section className="mt-2 text-center">
          <div className="text-[12px] text-zinc-400">今日の合計</div>
          <div className="mt-1 text-6xl font-bold tracking-tight">
            {total}
            <span className="ml-2 text-xl font-medium text-zinc-400">分</span>
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
                <div className="text-zinc-200 text-base">
                  {i + 1}回目
                </div>
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
          <div className="mt-2 text-xs text-zinc-500">入力後「追加」で保存されます（自動保存）</div>
        </section>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/60"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
      >
        <div className="mx-auto max-w-md px-6 py-3 flex items-center justify-around text-sm">
          <Link href="/" className="text-zinc-100 font-semibold">ホーム</Link>
          <Link href="/history" className="text-zinc-400 hover:text-zinc-100">履歴</Link>
        </div>
      </nav>
    </div>
  );
}
