import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getDateKey, formatDisplayDate } from "@/lib/date";
import { getSessionsByDate, getOverallAverage, getDayMeta } from "@/app/actions/saunaSessions";
import TodaySessions from "@/components/TodaySessions";
import { saveUserToDatabase } from "@/app/actions/saveUser";

export default async function Home() {
  const user = await currentUser();
  if (user?.id) {
    try {
      await saveUserToDatabase({ id: user.id, name: user.fullName });
    } catch {}
  }

  const todayKey = getDateKey(new Date());
  const [initialSessions, initialOverallAvg, initialMeta] = await Promise.all([
    getSessionsByDate(todayKey),
    getOverallAverage(),
    getDayMeta(todayKey),
  ]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black text-zinc-100">
      <header className="px-5 pt-6 pb-2">
        <div className="text-xs text-zinc-400">{formatDisplayDate(todayKey)}</div>
        <h1 className="text-lg font-semibold tracking-wide">サウナ記録</h1>
      </header>

      <main className="flex-1 px-5 pb-28">
        <TodaySessions
          dateKey={todayKey}
          initialSessions={initialSessions}
          initialOverallAvg={initialOverallAvg}
          initialMeta={initialMeta}
        />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/60"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
      >
        <div className="mx-auto max-w-md px-6 py-3 flex items-center justify-around text-sm">
          <Link href="/" className="text-zinc-100 font-semibold">
            ホーム
          </Link>
          <Link href="/history" className="text-zinc-400 hover:text-zinc-100">
            履歴
          </Link>
        </div>
      </nav>
    </div>
  );
}
