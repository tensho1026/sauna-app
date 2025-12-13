"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
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
  setSessions as setSessionsAction,
  setDayMeta,
} from "@/lib/storage";

function Stars({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(value === s ? null : s)}
          className={"text-lg " + (value && value >= s ? "text-yellow-400" : "text-zinc-600 hover:text-zinc-400")}
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
  const [sessionInput, setSessionInput] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // 初回: 記録がある日付一覧を取得！
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
      setSessionInput("");
      setIsDirty(false);
      setStatusMessage("");
    })();
  }, [selected]);

  const total = useMemo(() => sumSessions(sessions), [sessions]);
  const dayAvg = useMemo(() => (sessions.length ? total / sessions.length : 0), [sessions, total]);

  const markDirty = () => {
    setIsDirty(true);
    setStatusMessage("");
  };

  const onAdd = () => {
    const minutes = Number(sessionInput);
    if (!minutes || minutes <= 0 || !Number.isFinite(minutes)) return;
    const rounded = Math.round(minutes);
    setSessions((prev) => [...prev, rounded]);
    setSessionInput("");
    markDirty();
  };

  const onDelete = (idx: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== idx));
    markDirty();
  };

  const onEdit = (idx: number, value: string) => {
    const n = Number(value);
    if (!n || n <= 0 || !Number.isFinite(n)) return;
    const next = [...sessions];
    next[idx] = Math.round(n);
    setSessions(next);
    markDirty();
  };

  const handleSave = async () => {
    if (!selected) return;
    setIsSaving(true);
    setStatusMessage("");
    try {
      await setSessionsAction(selected, sessions);
      await setDayMeta(selected, {
        facilityName: facilityName || null,
        conditionRating,
        satisfactionRating,
      });
      const avg = await getOverallAverage();
      setOverallAvg(avg);
      setIsDirty(false);
      setStatusMessage("保存しました");
    } catch {
      setStatusMessage("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black text-zinc-100">
      <header className="px-5 pt-6 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-zinc-400">履歴</div>
            <h1 className="text-lg font-semibold tracking-wide">日付で検索</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
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
          <section className="mt-6 space-y-3 rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 text-sm">
            <div>
              <label className="block text-sm text-zinc-300 mb-1">施設名</label>
              <input
                type="text"
                className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none border-b border-zinc-700 focus:border-zinc-400"
                placeholder="例: ○○サウナ"
                value={facilityName}
                onChange={(e) => {
                  setFacilityName(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">その日の体調</span>
              <Stars
                value={conditionRating}
                onChange={(v) => {
                  setConditionRating(v);
                  markDirty();
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">その日の満足度</span>
              <Stars
                value={satisfactionRating}
                onChange={(v) => {
                  setSatisfactionRating(v);
                  markDirty();
                }}
              />
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
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-20 bg-transparent text-right text-zinc-100 outline-none border-b border-zinc-700 focus:border-zinc-400"
                    value={String(m)}
                    onChange={(e) => onEdit(i, e.target.value)}
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
          {selected && (
            <div className="mt-4 flex items-center gap-3 bg-zinc-900/70 border border-zinc-800 rounded-xl p-3">
              <input
                type="number"
                inputMode="numeric"
                placeholder="何分?"
                className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none"
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                min={1}
              />
              <button
                type="button"
                onClick={onAdd}
                className="px-4 py-2 rounded-lg bg-zinc-100 text-black font-semibold active:opacity-90 disabled:opacity-40"
                disabled={!sessionInput}
              >
                追加
              </button>
            </div>
          )}
        </section>
        {selected && (
          <section className="mt-8 mb-10">
            <button
              type="button"
              onClick={() => void handleSave()}
              className="w-full rounded-lg bg-zinc-100 text-black font-semibold py-3 active:opacity-90 disabled:opacity-40"
              disabled={isSaving || !isDirty}
            >
              {isSaving ? "保存中..." : "保存"}
            </button>
      
          </section>
        )}
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
