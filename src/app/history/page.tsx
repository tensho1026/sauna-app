"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getSessions,
  getDateKey,
  sumSessions,
  formatDisplayDate,
  listAvailableDatesByFacility,
  listFacilities,
  getOverallAverage,
  getDayMeta,
} from "@/lib/storage";

export default function HistoryPage() {
  const [selected, setSelected] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [sessions, setSessions] = useState<number[]>([]);
  const [overallAvg, setOverallAvg] = useState<number>(0);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [facilityFilter, setFacilityFilter] = useState<string>("");
  const [facilityName, setFacilityName] = useState<string>("");
  const [conditionRating, setConditionRating] = useState<number | null>(null);
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null);

  // 初回: 記録がある日付一覧を取得
  useEffect(() => {
    (async () => {
      const [avg, facs] = await Promise.all([getOverallAverage(), listFacilities()]);
      setOverallAvg(avg);
      setFacilities(facs);
      const dates = await listAvailableDatesByFacility("");
      setAvailableDates(dates);
      if (dates.length > 0) {
        const today = getDateKey(new Date());
        setSelected(dates.includes(today) ? today : dates[0]);
      } else {
        setSelected("");
        setSessions([]);
      }
    })();
  }, []);

  // 施設フィルタの変更で日付一覧を更新
  useEffect(() => {
    (async () => {
      const dates = await listAvailableDatesByFacility(facilityFilter || undefined);
      setAvailableDates(dates);
      if (!dates.includes(selected)) {
        setSelected(dates[0] ?? "");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityFilter]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const s = await getSessions(selected);
      setSessions(s);
      const meta = await getDayMeta(selected);
      setFacilityName(meta.facilityName ?? "");
      setConditionRating(meta.conditionRating ?? null);
      setSatisfactionRating(meta.satisfactionRating ?? null);
    })();
  }, [selected]);

  const total = useMemo(() => sumSessions(sessions), [sessions]);
  const dayAvg = useMemo(() => (sessions.length ? total / sessions.length : 0), [sessions, total]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black text-zinc-100">
      <header className="px-5 pt-6 pb-2">
        <div className="text-xs text-zinc-400">履歴</div>
        <h1 className="text-lg font-semibold tracking-wide">日付で検索</h1>
      </header>

      <main className="flex-1 px-5 pb-28">
        <section className="mt-4">
          <label className="block text-sm text-zinc-300 mb-2">施設で絞り込み</label>
          <select
            className="w-full rounded-lg bg-zinc-900/70 border border-zinc-800 px-4 py-3 text-zinc-100"
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
          >
            <option value="">すべて</option>
            {facilities.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </section>
        <section className="mt-4">
          <label className="block text-sm text-zinc-300 mb-2">記録がある日付</label>
          {availableDates.length === 0 ? (
            <div className="text-zinc-500 text-sm">まだ記録がありません</div>
          ) : (
            <select
              className="w-full rounded-lg bg-zinc-900/70 border border-zinc-800 px-4 py-3 text-zinc-100"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {formatDisplayDate(d)}
                </option>
              ))}
            </select>
          )}
        </section>

        <section className="mt-6 text-center">
          <div className="text-[12px] text-zinc-400">{selected ? `${formatDisplayDate(selected)} の合計` : "選択してください"}</div>
          <div className="mt-1 text-5xl font-bold tracking-tight">
            {total}
            <span className="ml-2 text-xl font-medium text-zinc-400">分</span>
          </div>
          {selected && (
            <div className="mt-2 text-sm text-zinc-400">
              1回平均: {dayAvg.toFixed(1)} 分
              <span className="mx-2">/</span>
              全体平均: {overallAvg.toFixed(1)} 分
            </div>
          )}
        </section>

        {selected && (
          <section className="mt-6 grid grid-cols-1 gap-2 rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">施設名</span>
              <span className="text-zinc-100">{facilityName || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">その日の体調</span>
              <span className="text-yellow-400">
                {Array.from({ length: 5 }, (_, i) => (conditionRating && i < conditionRating ? "★" : "☆")).join("")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">その日の満足度</span>
              <span className="text-yellow-400">
                {Array.from({ length: 5 }, (_, i) => (satisfactionRating && i < satisfactionRating ? "★" : "☆")).join("")}
              </span>
            </div>
          </section>
        )}

        <section className="mt-7">
          <h2 className="text-sm text-zinc-300 mb-3">内訳</h2>
          <ul className="space-y-2">
            {selected && sessions.length === 0 && (
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
