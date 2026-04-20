import { useState, useEffect } from "react";
import { useWorkerPortal } from "@/hooks/useWorkerPortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react";

function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function getWeekDays(week: number, year: number): Date[] {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function fmt(date: Date) {
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const DAY_NAMES_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const DAY_NAMES_SV = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];
const WORK_TYPES = [
  { value: "demir", label: "Demir" },
  { value: "kalip", label: "Kalıp" },
  { value: "beton", label: "Beton" },
  { value: "diger", label: "Diğer" },
];

type RowForm = {
  startTime: string; endTime: string;
  breakStart: string; breakEnd: string;
  zone: string; workType: string;
  isDayOff: boolean; notes: string;
};
const emptyRow = (): RowForm => ({
  startTime: "", endTime: "", breakStart: "", breakEnd: "",
  zone: "", workType: "demir", isDayOff: false, notes: "",
});

export const WorkerWeeklyLog = () => {
  const { myLogs, upsertLog, isSubmitting } = useWorkerPortal();
  const today = new Date();
  const { week: todayWeek, year: todayYear } = getWeekNumber(today);
  const [currentWeek, setCurrentWeek] = useState(todayWeek);
  const [currentYear, setCurrentYear] = useState(todayYear);
  const [rows, setRows] = useState<RowForm[]>(Array.from({ length: 7 }, emptyRow));
  const [saved, setSaved] = useState<boolean[]>(Array(7).fill(false));
  const weekDays = getWeekDays(currentWeek, currentYear);

  useEffect(() => {
    const newRows = weekDays.map((date) => {
      const ds = date.toISOString().split("T")[0];
      const log = myLogs.find((l) => l.workDate === ds);
      if (!log) return emptyRow();
      return {
        startTime: log.startTime?.slice(0, 5) || "",
        endTime: log.endTime?.slice(0, 5) || "",
        breakStart: "", breakEnd: "",
        zone: log.zone || "",
        workType: log.workType || "demir",
        isDayOff: log.isDayOff,
        notes: log.notes || "",
      };
    });
    setRows(newRows);
    setSaved(weekDays.map((date) => {
      const ds = date.toISOString().split("T")[0];
      return myLogs.some((l) => l.workDate === ds);
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek, currentYear, myLogs.length]);

  const updateRow = (i: number, field: keyof RowForm, value: string | boolean) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
    setSaved((prev) => prev.map((s, idx) => idx === i ? false : s));
  };

  const saveRow = async (i: number) => {
    const date = weekDays[i];
    const ds = date.toISOString().split("T")[0];
    const { week, year } = getWeekNumber(date);
    const row = rows[i];
    const netHours = row.isDayOff ? 0 : Math.max(0,
      calcHours(row.startTime, row.endTime) - calcHours(row.breakStart, row.breakEnd)
    );
    await upsertLog({
      teamMemberId: "", workDate: ds, weekNumber: week, year,
      startTime: row.isDayOff ? null : row.startTime || null,
      endTime: row.isDayOff ? null : row.endTime || null,
      hoursWorked: netHours,
      zone: row.isDayOff ? null : row.zone || null,
      workType: row.workType as any,
      notes: row.notes || null,
      isDayOff: row.isDayOff,
      dayOffReason: row.isDayOff ? row.notes || null : null,
    });
    setSaved((prev) => prev.map((s, idx) => idx === i ? true : s));
  };

  const prevWeek = () => {
    if (currentWeek === 1) { setCurrentWeek(52); setCurrentYear((y) => y - 1); }
    else setCurrentWeek((w) => w - 1);
  };
  const nextWeek = () => {
    if (currentWeek >= todayWeek && currentYear >= todayYear) return;
    if (currentWeek === 52) { setCurrentWeek(1); setCurrentYear((y) => y + 1); }
    else setCurrentWeek((w) => w + 1);
  };

  const totalHours = rows.reduce((s, r) => {
    if (r.isDayOff) return s;
    return s + Math.max(0, calcHours(r.startTime, r.endTime) - calcHours(r.breakStart, r.breakEnd));
  }, 0);

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isFuture = (d: Date) => d > today;

  return (
    <div className="space-y-4">
      {/* Hafta navigasyon */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={prevWeek}
            className="text-slate-400 hover:text-white hover:bg-slate-800">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-white font-bold text-lg">Vecka / Hafta {currentWeek}</p>
            <p className="text-slate-400 text-sm">{fmt(weekDays[0])} – {fmt(weekDays[6])} · {currentYear}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={nextWeek}
            disabled={currentWeek >= todayWeek && currentYear >= todayYear}
            className="text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-800 flex gap-6 text-sm justify-center">
          <span className="text-slate-400">Toplam: <span className="text-amber-400 font-bold">{totalHours.toFixed(1)} saat</span></span>
          <span className="text-slate-400">Kayıtlı: <span className="text-white font-medium">{saved.filter(Boolean).length} gün</span></span>
        </div>
      </div>

      {/* Tablo - yatay scroll */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-300 font-semibold w-[130px]">Dag / Gün</th>
                <th className="text-center px-2 py-2 text-slate-300 font-semibold border-l border-slate-700 w-[75px]">In<br/><span className="text-slate-500 font-normal">Giriş</span></th>
                <th className="text-center px-2 py-2 text-slate-300 font-semibold border-l border-slate-700 w-[75px]">Ut<br/><span className="text-slate-500 font-normal">Çıkış</span></th>
                <th className="text-center px-2 py-2 text-slate-300 font-semibold border-l border-slate-700 w-[75px]">Rast In<br/><span className="text-slate-500 font-normal">Mola G.</span></th>
                <th className="text-center px-2 py-2 text-slate-300 font-semibold border-l border-slate-700 w-[75px]">Rast Ut<br/><span className="text-slate-500 font-normal">Mola Ç.</span></th>
                <th className="text-center px-2 py-2 text-slate-300 font-semibold border-l border-slate-700 w-[70px]">Tim<br/><span className="text-slate-500 font-normal">Saat</span></th>
                <th className="text-center px-2 py-2 text-slate-300 font-semibold border-l border-slate-700 w-[120px]">Byggdel / Bölge</th>
                <th className="text-center px-2 py-2 text-slate-300 font-semibold border-l border-slate-700 w-[75px]">Arbete<br/><span className="text-slate-500 font-normal">İş Tipi</span></th>
                <th className="text-center px-2 py-2 text-slate-300 font-semibold border-l border-slate-700 w-[80px]">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {weekDays.map((date, i) => {
                const future = isFuture(date);
                const row = rows[i];
                const netHours = row.isDayOff ? 0 : Math.max(0,
                  calcHours(row.startTime, row.endTime) - calcHours(row.breakStart, row.breakEnd)
                );
                const isWeekend = i >= 5;

                return (
                  <tr key={i} className={`border-b border-slate-800 last:border-0 transition-colors
                    ${isToday(date) ? "bg-amber-500/5" : ""}
                    ${isWeekend ? "bg-slate-950/30" : ""}
                    ${future ? "opacity-40" : ""}
                  `}>
                    {/* Gün */}
                    <td className={`px-3 py-2 ${isToday(date) ? "border-l-2 border-l-amber-500" : ""}`}>
                      <p className="font-semibold text-white">{DAY_NAMES_SV[i]}</p>
                      <p className="text-slate-500">{DAY_NAMES_TR[i]}</p>
                      <p className="text-slate-600 mt-0.5">{fmt(date)}</p>
                      {saved[i] && <span className="text-green-500">✓ Kayıtlı</span>}
                    </td>

                    {row.isDayOff ? (
                      <>
                        <td colSpan={5} className="px-3 py-2 border-l border-slate-800">
                          <Input placeholder="İzin nedeni..." value={row.notes} disabled={future}
                            onChange={(e) => updateRow(i, "notes", e.target.value)}
                            className="bg-slate-800 border-slate-700 text-slate-300 text-xs h-8 placeholder:text-slate-600" />
                        </td>
                        <td className="px-2 py-2 border-l border-slate-800 text-center">
                          <span className="text-slate-500 italic">İzin</span>
                        </td>
                        <td className="px-2 py-2 border-l border-slate-800" />
                      </>
                    ) : (
                      <>
                        <td className="px-1.5 py-2 border-l border-slate-800">
                          <Input type="time" value={row.startTime} disabled={future}
                            onChange={(e) => updateRow(i, "startTime", e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-xs h-8 px-2" />
                        </td>
                        <td className="px-1.5 py-2 border-l border-slate-800">
                          <Input type="time" value={row.endTime} disabled={future}
                            onChange={(e) => updateRow(i, "endTime", e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-xs h-8 px-2" />
                        </td>
                        <td className="px-1.5 py-2 border-l border-slate-800">
                          <Input type="time" value={row.breakStart} disabled={future}
                            onChange={(e) => updateRow(i, "breakStart", e.target.value)}
                            className="bg-slate-800 border-slate-700 text-slate-400 text-xs h-8 px-2" />
                        </td>
                        <td className="px-1.5 py-2 border-l border-slate-800">
                          <Input type="time" value={row.breakEnd} disabled={future}
                            onChange={(e) => updateRow(i, "breakEnd", e.target.value)}
                            className="bg-slate-800 border-slate-700 text-slate-400 text-xs h-8 px-2" />
                        </td>
                        <td className="px-2 py-2 border-l border-slate-800 text-center">
                          <span className={`font-bold ${netHours > 0 ? "text-amber-400" : "text-slate-600"}`}>
                            {netHours > 0 ? netHours.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="px-1.5 py-2 border-l border-slate-800">
                          <Input placeholder="A Blok..." value={row.zone} disabled={future}
                            onChange={(e) => updateRow(i, "zone", e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-xs h-8 px-2 placeholder:text-slate-600" />
                        </td>
                        <td className="px-1.5 py-2 border-l border-slate-800">
                          <select value={row.workType} disabled={future}
                            onChange={(e) => updateRow(i, "workType", e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-white text-xs h-8 rounded-md px-1">
                            {WORK_TYPES.map((wt) => (
                              <option key={wt.value} value={wt.value}>{wt.label}</option>
                            ))}
                          </select>
                        </td>
                      </>
                    )}

                    {/* İzin + Kaydet */}
                    <td className="px-1.5 py-2 border-l border-slate-800">
                      <div className="flex flex-col gap-1 items-center">
                        <button onClick={() => updateRow(i, "isDayOff", !row.isDayOff)} disabled={future}
                          className={`text-xs px-2 py-0.5 rounded border w-full text-center transition-all
                            ${row.isDayOff ? "bg-slate-600 border-slate-500 text-white" : "border-slate-700 text-slate-500 hover:border-slate-400"}
                            disabled:opacity-30`}>
                          İzin
                        </button>
                        <Button size="sm" onClick={() => saveRow(i)} disabled={future || isSubmitting}
                          className="w-full h-7 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold disabled:opacity-30">
                          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Toplam satırı */}
              <tr className="bg-slate-800/60 border-t-2 border-slate-600">
                <td className="px-3 py-2 font-bold text-white text-xs uppercase">Summa / Toplam</td>
                <td colSpan={4} className="border-l border-slate-700" />
                <td className="px-2 py-2 border-l border-slate-700 text-center">
                  <span className="text-amber-400 font-bold text-sm">{totalHours.toFixed(1)}</span>
                  <span className="text-slate-500 text-xs ml-1">s</span>
                </td>
                <td colSpan={3} className="border-l border-slate-700" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-600 text-center">Geçmiş haftalar için ← okunu kullan</p>
    </div>
  );
};
