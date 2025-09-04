"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getSessions,
  getDateKey,
  sumSessions,
  formatDisplayDate,
} from "@/lib/storage";

export default function HistoryPage() {
  const [selected, setSelected] = useState<string>(() => getDateKey(new Date()));
  const [sessions, setSessions] = useState<number[]>([]);

  useEffect(() => {
    setSessions(getSessions(selected));
  }, [selected]);

  const total = useMemo(() => sumSessions(sessions), [sessions]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black text-zinc-100">
      <header className="px-5 pt-6 pb-2">
        <div className="text-xs text-zinc-400">履歴</div>
        <h1 className="text-lg font-semibold tracking-wide">日付で検索</h1>
      </header>

      <main className="flex-1 px-5 pb-28">
        <section className="mt-4">
          <label className="block text-sm text-zinc-300 mb-2">日付を選択</label>
          <input
            type="date"
            className="w-full rounded-lg bg-zinc-900/70 border border-zinc-800 px-4 py-3 text-zinc-100"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          />
        </section>

        <section className="mt-6 text-center">
          <div className="text-[12px] text-zinc-400">{formatDisplayDate(selected)} の合計</div>
          <div className="mt-1 text-5xl font-bold tracking-tight">
            {total}
            <span className="ml-2 text-xl font-medium text-zinc-400">分</span>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="text-sm text-zinc-300 mb-3">内訳</h2>
          <ul className="space-y-2">
            {sessions.length === 0 && (
              <li className="text-zinc-500 text-sm">この日の記録はありません</li>
            )}
            {sessions.map((m, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg bg-zinc-900/70 border border-zinc-800 px-4 py-3"
              >
                <div className="text-zinc-200 text-base">{i + 1}回目</div>
                <div className="text-zinc-100">{m} 分</div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/60"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
      >
        <div className="mx-auto max-w-md px-6 py-3 flex items-center justify-around text-sm">
          <Link href="/" className="text-zinc-400 hover:text-zinc-100">ホーム</Link>
          <Link href="/history" className="text-zinc-100 font-semibold">履歴</Link>
        </div>
      </nav>
    </div>
  );
}

