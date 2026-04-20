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
  { value: "demir", label: "Demir / Armering" },
  { value: "kalip", label: "Kalıp / Form" },
  { value: "beton", label: "Beton / Gjutning" },
  { value: "diger", label: "Diğer / Övrigt" },
];

type RowForm = {
  startTime: string; endTime: string;
  break1Start: string; break1End: string;
  break2Start: string; break2End: string;
  zone: string; workType: string;
  isDayOff: boolean; notes: string;
};

const emptyRow = (): RowForm => ({
  startTime: "", endTime: "",
  break1Start: "", break1End: "",
  break2Start: "", break2End: "",
  zone: "", workType: "demir",
  isDayOff: false, notes: "",
});

function netHours(row: RowForm): number {
  if (row.isDayOff) return 0;
  const work = calcHours(row.startTime, row.endTime);
  const b1 = calcHours(row.break1Start, row.break1End);
  const b2 = calcHours(row.break2Start, row.break2End);
  return Math.max(0, work - b1 - b2);
}

const TimeInput = ({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) => (
  <input
    type="time"
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded px-1.5 py-1.5 disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
    style={{ WebkitAppearance: "none" }}
  />
);

export const WorkerWeeklyLog = () => {
  const { myLogs, upsertLog, isSubmitting } = useWorkerPortal();
  const today = new Date();
  const { week: todayWeek, year: todayYear } = getWeekNumber(today);
  const [currentWeek, setCurrentWeek] = useState(todayWeek);
  const [currentYear, setCurrentYear] = useState(todayYear);
  const [rows, setRows] = useState<RowForm[]>(Array.from({ length: 7 }, emptyRow));
  const [saved, setSaved] = useState<boolean[]>(Array(7).fill(false));
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const weekDays = getWeekDays(currentWeek, currentYear);

  useEffect(() => {
    const newRows = weekDays.map((date) => {
      const ds = date.toISOString().split("T")[0];
      const log = myLogs.find((l) => l.workDate === ds);
      if (!log) return emptyRow();
      return {
        startTime: log.startTime?.slice(0, 5) || "",
        endTime: log.endTime?.slice(0, 5) || "",
        break1Start: log.break1Start?.slice(0, 5) || "",
        break1End: log.break1End?.slice(0, 5) || "",
        break2Start: log.break2Start?.slice(0, 5) || "",
        break2End: log.break2End?.slice(0, 5) || "",
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
    const hours = netHours(row);
    setSavingRow(i);
    await upsertLog({
      teamMemberId: "", workDate: ds, weekNumber: week, year,
      startTime: row.isDayOff ? null : row.startTime || null,
      endTime: row.isDayOff ? null : row.endTime || null,
      break1Start: row.isDayOff ? null : row.break1Start || null,
      break1End: row.isDayOff ? null : row.break1End || null,
      break2Start: row.isDayOff ? null : row.break2Start || null,
      break2End: row.isDayOff ? null : row.break2End || null,
      hoursWorked: hours,
      zone: row.isDayOff ? null : row.zone || null,
      workType: row.workType as any,
      notes: row.notes || null,
      isDayOff: row.isDayOff,
      dayOffReason: row.isDayOff ? row.notes || null : null,
    });
    setSaved((prev) => prev.map((s, idx) => idx === i ? true : s));
    setSavingRow(null);
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

  const totalHours = rows.reduce((s, r) => s + netHours(r), 0);
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isFuture = (d: Date) => d > today;

  return (
    <div className="space-y-3 w-full">
      {/* Hafta başlığı */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button onClick={prevWeek}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-gray-900 font-bold text-xl">Vecka / Hafta {currentWeek}</p>
            <p className="text-gray-500 text-sm">{fmt(weekDays[0])} – {fmt(weekDays[6])} · {currentYear}</p>
          </div>
          <button onClick={nextWeek}
            disabled={currentWeek >= todayWeek && currentYear >= todayYear}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-6 justify-center text-sm">
          <span className="text-gray-500">Toplam: <span className="text-amber-500 font-bold text-base">{totalHours.toFixed(1)} saat</span></span>
          <span className="text-gray-500">Kayıtlı: <span className="text-gray-800 font-semibold">{saved.filter(Boolean).length} gün</span></span>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs border-collapse" style={{ minWidth: "900px" }}>
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left px-3 py-3 text-gray-600 font-semibold border-r border-gray-200" style={{width:"140px"}}>
                  Dag / Gün
                </th>
                <th className="text-center px-2 py-3 text-gray-600 font-semibold border-r border-gray-200" style={{width:"90px"}}>
                  In / Giriş
                </th>
                <th className="text-center px-2 py-3 text-gray-600 font-semibold border-r border-gray-200" style={{width:"90px"}}>
                  Ut / Çıkış
                </th>
                <th className="text-center px-2 py-3 text-gray-500 font-medium border-r border-gray-200 bg-blue-50/50" colSpan={2}>
                  Rast 1 / Mola 1
                </th>
                <th className="text-center px-2 py-3 text-gray-500 font-medium border-r border-gray-200 bg-purple-50/50" colSpan={2}>
                  Rast 2 / Mola 2
                </th>
                <th className="text-center px-2 py-3 text-gray-600 font-semibold border-r border-gray-200 bg-amber-50" style={{width:"65px"}}>
                  Tim / Saat
                </th>
                <th className="text-center px-2 py-3 text-gray-600 font-semibold border-r border-gray-200" style={{width:"130px"}}>
                  Byggdel / Bölge
                </th>
                <th className="text-center px-2 py-3 text-gray-600 font-semibold border-r border-gray-200" style={{width:"130px"}}>
                  Arbete / İş Tipi
                </th>
                <th className="text-center px-2 py-3 text-gray-600 font-semibold" style={{width:"90px"}}>
                  İşlem
                </th>
              </tr>
              {/* Alt başlık — mola sütunları için */}
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="border-r border-gray-200" />
                <th className="border-r border-gray-200" />
                <th className="border-r border-gray-200" />
                <th className="text-center py-1 text-gray-400 font-normal border-r border-gray-200 bg-blue-50/50 text-xs">Giriş</th>
                <th className="text-center py-1 text-gray-400 font-normal border-r border-gray-200 bg-blue-50/50 text-xs">Çıkış</th>
                <th className="text-center py-1 text-gray-400 font-normal border-r border-gray-200 bg-purple-50/50 text-xs">Giriş</th>
                <th className="text-center py-1 text-gray-400 font-normal border-r border-gray-200 bg-purple-50/50 text-xs">Çıkış</th>
                <th className="border-r border-gray-200 bg-amber-50" />
                <th className="border-r border-gray-200" />
                <th className="border-r border-gray-200" />
                <th />
              </tr>
            </thead>
            <tbody>
              {weekDays.map((date, i) => {
                const future = isFuture(date);
                const row = rows[i];
                const hours = netHours(row);
                const isWeekend = i >= 5;
                const today_ = isToday(date);
                const isSaving = savingRow === i;

                return (
                  <tr key={i} className={`border-b border-gray-100 transition-colors
                    ${today_ ? "bg-amber-50/60" : ""}
                    ${isWeekend && !today_ ? "bg-gray-50/80" : ""}
                    ${future ? "opacity-50" : "hover:bg-gray-50/50"}
                  `}>
                    {/* Gün */}
                    <td className={`px-3 py-2 border-r border-gray-200 ${today_ ? "border-l-3 border-l-amber-400" : ""}`}
                        style={today_ ? {borderLeft: "3px solid #f59e0b"} : {}}>
                      <p className="font-bold text-gray-800">{DAY_NAMES_SV[i]}</p>
                      <p className="text-gray-500 text-xs">{DAY_NAMES_TR[i]}</p>
                      <p className="text-gray-400 text-xs">{fmt(date)}</p>
                      {saved[i] && !row.isDayOff && <span className="text-green-600 text-xs font-medium">✓ Kayıtlı</span>}
                      {row.isDayOff && <span className="text-blue-500 text-xs italic">İzin</span>}
                    </td>

                    {row.isDayOff ? (
                      <>
                        <td colSpan={6} className="px-3 py-2 border-r border-gray-200">
                          <input
                            placeholder="İzin nedeni (opsiyonel)..."
                            value={row.notes}
                            disabled={future}
                            onChange={(e) => updateRow(i, "notes", e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded px-2 py-1.5 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </td>
                        <td className="px-2 py-2 border-r border-gray-200 bg-amber-50 text-center">
                          <span className="text-gray-400">—</span>
                        </td>
                        <td className="px-2 py-2 border-r border-gray-200" />
                        <td className="px-2 py-2 border-r border-gray-200" />
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2 border-r border-gray-200">
                          <TimeInput value={row.startTime} disabled={future}
                            onChange={(v) => updateRow(i, "startTime", v)} />
                        </td>
                        <td className="px-2 py-2 border-r border-gray-200">
                          <TimeInput value={row.endTime} disabled={future}
                            onChange={(v) => updateRow(i, "endTime", v)} />
                        </td>
                        <td className="px-2 py-2 border-r border-gray-200 bg-blue-50/40">
                          <TimeInput value={row.break1Start} disabled={future}
                            onChange={(v) => updateRow(i, "break1Start", v)} />
                        </td>
                        <td className="px-2 py-2 border-r border-gray-200 bg-blue-50/40">
                          <TimeInput value={row.break1End} disabled={future}
                            onChange={(v) => updateRow(i, "break1End", v)} />
                        </td>
                        <td className="px-2 py-2 border-r border-gray-200 bg-purple-50/40">
                          <TimeInput value={row.break2Start} disabled={future}
                            onChange={(v) => updateRow(i, "break2Start", v)} />
                        </td>
                        <td className="px-2 py-2 border-r border-gray-200 bg-purple-50/40">
                          <TimeInput value={row.break2End} disabled={future}
                            onChange={(v) => updateRow(i, "break2End", v)} />
                        </td>
                        <td className="px-2 py-2 border-r border-gray-200 bg-amber-50 text-center">
                          <span className={`font-bold text-sm ${hours > 0 ? "text-amber-600" : "text-gray-300"}`}>
                            {hours > 0 ? hours.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="px-2 py-2 border-r border-gray-200">
                          <input placeholder="A Blok, Aks 3..." value={row.zone} disabled={future}
                            onChange={(e) => updateRow(i, "zone", e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded px-1.5 py-1.5 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:bg-gray-100" />
                        </td>
                        <td className="px-2 py-2 border-r border-gray-200">
                          <select value={row.workType} disabled={future}
                            onChange={(e) => updateRow(i, "workType", e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded px-1.5 py-1.5 disabled:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-400">
                            {WORK_TYPES.map((wt) => (
                              <option key={wt.value} value={wt.value}>{wt.label}</option>
                            ))}
                          </select>
                        </td>
                      </>
                    )}

                    {/* İzin + Kaydet */}
                    <td className="px-2 py-2">
                      <div className="flex flex-col gap-1.5 items-stretch">
                        <button
                          onClick={() => updateRow(i, "isDayOff", !row.isDayOff)}
                          disabled={future}
                          className={`text-xs px-2 py-1 rounded border font-medium transition-all text-center
                            ${row.isDayOff
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
                            } disabled:opacity-30`}>
                          İzin
                        </button>
                        <button
                          onClick={() => saveRow(i)}
                          disabled={future || isSaving}
                          className="flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold px-2 py-1.5 rounded transition-colors disabled:opacity-30">
                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Kaydet
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Toplam satırı */}
              <tr className="bg-amber-50 border-t-2 border-amber-200">
                <td className="px-3 py-3 font-bold text-gray-800 text-sm border-r border-gray-200">
                  Summa / Toplam
                </td>
                <td colSpan={6} className="border-r border-gray-200" />
                <td className="px-2 py-3 border-r border-gray-200 text-center">
                  <span className="text-amber-600 font-bold text-base">{totalHours.toFixed(1)}</span>
                  <span className="text-gray-500 text-xs ml-1">s</span>
                </td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">Geçmiş haftalara gitmek için ← okunu kullan</p>
    </div>
  );
};
