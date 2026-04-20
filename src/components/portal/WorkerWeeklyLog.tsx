import { useState, useEffect } from "react";
import { useWorkerPortal } from "@/hooks/useWorkerPortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Wrench,
  Save,
  Coffee,
} from "lucide-react";

// ISO hafta numarası hesapla
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

// Haftanın günlerini döndür (Pazartesi-Pazar)
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

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const WORK_TYPES = [
  { value: "demir", label: "Demir (Armatura)" },
  { value: "kalip", label: "Kalıp (Form)" },
  { value: "beton", label: "Beton (Gjutning)" },
  { value: "diger", label: "Diğer" },
];

type LogForm = {
  startTime: string;
  endTime: string;
  zone: string;
  workType: "demir" | "kalip" | "beton" | "diger";
  notes: string;
  isDayOff: boolean;
  dayOffReason: string;
};

const emptyForm = (): LogForm => ({
  startTime: "07:00",
  endTime: "16:00",
  zone: "",
  workType: "demir",
  notes: "",
  isDayOff: false,
  dayOffReason: "",
});

export const WorkerWeeklyLog = () => {
  const { myLogs, upsertLog, isSubmitting } = useWorkerPortal();

  const today = new Date();
  const { week: todayWeek, year: todayYear } = getWeekNumber(today);
  const [currentWeek, setCurrentWeek] = useState(todayWeek);
  const [currentYear, setCurrentYear] = useState(todayYear);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState<LogForm>(emptyForm());

  const weekDays = getWeekDays(currentWeek, currentYear);

  // Seçili gün değişince formu doldur
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    const existing = myLogs.find((l) => l.workDate === dateStr);
    if (existing) {
      setForm({
        startTime: existing.startTime || "07:00",
        endTime: existing.endTime || "16:00",
        zone: existing.zone || "",
        workType: existing.workType,
        notes: existing.notes || "",
        isDayOff: existing.isDayOff,
        dayOffReason: existing.dayOffReason || "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [selectedDate, myLogs]);

  const getLogForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return myLogs.find((l) => l.workDate === dateStr);
  };

  const calcHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
    return Math.max(0, diff);
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    const { week, year } = getWeekNumber(selectedDate);
    const hours = form.isDayOff ? 0 : calcHours(form.startTime, form.endTime);

    await upsertLog({
      teamMemberId: "",
      workDate: dateStr,
      weekNumber: week,
      year,
      startTime: form.isDayOff ? null : form.startTime,
      endTime: form.isDayOff ? null : form.endTime,
      hoursWorked: hours,
      zone: form.isDayOff ? null : form.zone || null,
      workType: form.workType,
      notes: form.notes || null,
      isDayOff: form.isDayOff,
      dayOffReason: form.isDayOff ? form.dayOffReason || null : null,
    });
    setSelectedDate(null);
  };

  const prevWeek = () => {
    if (currentWeek === 1) {
      setCurrentWeek(52);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentWeek((w) => w - 1);
    }
    setSelectedDate(null);
  };

  const nextWeek = () => {
    if (currentWeek === 52) {
      setCurrentWeek(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentWeek((w) => w + 1);
    }
    setSelectedDate(null);
  };

  const isToday = (date: Date) =>
    date.toDateString() === today.toDateString();

  const isFuture = (date: Date) => date > today;

  return (
    <div className="space-y-4">
      {/* Hafta navigasyonu */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevWeek}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-white font-semibold">
              Hafta {currentWeek} — {currentYear}
            </p>
            <p className="text-xs text-slate-400">
              {weekDays[0].toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} –{" "}
              {weekDays[6].toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextWeek}
            disabled={currentWeek === todayWeek && currentYear === todayYear}
            className="text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* 7 günlük grid */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((date, i) => {
            const log = getLogForDate(date);
            const selected =
              selectedDate?.toDateString() === date.toDateString();
            const future = isFuture(date);

            return (
              <button
                key={i}
                disabled={future}
                onClick={() => setSelectedDate(selected ? null : date)}
                className={`
                  flex flex-col items-center py-2 px-1 rounded-lg transition-all
                  ${future ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                  ${selected ? "bg-amber-500 text-slate-900" : "hover:bg-slate-800 text-slate-300"}
                  ${isToday(date) && !selected ? "ring-1 ring-amber-500" : ""}
                `}
              >
                <span className="text-xs font-medium">{DAY_NAMES[i]}</span>
                <span className="text-sm font-bold mt-0.5">{date.getDate()}</span>
                {log && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                    log.isDayOff
                      ? "bg-slate-500"
                      : selected
                      ? "bg-slate-900"
                      : "bg-amber-400"
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Haftalık özet */}
        {(() => {
          const weekLogs = weekDays.map(getLogForDate).filter(Boolean);
          const totalHours = weekLogs.reduce((s, l) => s + (l!.hoursWorked || 0), 0);
          const daysOff = weekLogs.filter((l) => l!.isDayOff).length;
          const daysWorked = weekLogs.filter((l) => !l!.isDayOff).length;
          if (weekLogs.length === 0) return null;
          return (
            <div className="mt-3 pt-3 border-t border-slate-800 flex gap-4 text-xs text-slate-400">
              <span>
                <span className="text-white font-medium">{daysWorked}</span> gün çalışma
              </span>
              <span>
                <span className="text-amber-400 font-medium">{totalHours.toFixed(1)}</span> saat
              </span>
              {daysOff > 0 && (
                <span>
                  <span className="text-slate-300 font-medium">{daysOff}</span> gün izin
                </span>
              )}
            </div>
          );
        })()}
      </div>

      {/* Gün detay formu */}
      {selectedDate && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">
              {selectedDate.toLocaleDateString("tr-TR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            <button
              onClick={() => {
                setForm((f) => ({ ...f, isDayOff: !f.isDayOff }));
              }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                form.isDayOff
                  ? "bg-slate-700 border-slate-600 text-slate-300"
                  : "border-slate-700 text-slate-500 hover:border-slate-500"
              }`}
            >
              <Coffee className="w-3 h-3" />
              İzin Günü
            </button>
          </div>

          {form.isDayOff ? (
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                İzin Nedeni (isteğe bağlı)
              </label>
              <Input
                placeholder="Hastalık, mazeret..."
                value={form.dayOffReason}
                onChange={(e) => setForm((f) => ({ ...f, dayOffReason: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          ) : (
            <>
              {/* Saatler */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                    <Clock className="w-3 h-3" /> Giriş
                  </label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                    <Clock className="w-3 h-3" /> Çıkış
                  </label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              {form.startTime && form.endTime && (
                <p className="text-xs text-amber-400">
                  Toplam: {calcHours(form.startTime, form.endTime).toFixed(1)} saat
                </p>
              )}

              {/* Bölge */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                  <MapPin className="w-3 h-3" /> Çalışma Bölgesi
                </label>
                <Input
                  placeholder="A Blok, Zemin Kat, Aks 3..."
                  value={form.zone}
                  onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              {/* İş tipi */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                  <Wrench className="w-3 h-3" /> İş Tipi
                </label>
                <div className="flex gap-2 flex-wrap">
                  {WORK_TYPES.map((wt) => (
                    <button
                      key={wt.value}
                      onClick={() =>
                        setForm((f) => ({ ...f, workType: wt.value as LogForm["workType"] }))
                      }
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        form.workType === wt.value
                          ? "bg-amber-500 border-amber-500 text-slate-900 font-medium"
                          : "border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      {wt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notlar */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Not (isteğe bağlı)
                </label>
                <Textarea
                  placeholder="Günle ilgili not..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                  rows={2}
                />
              </div>
            </>
          )}

          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      )}
    </div>
  );
};
