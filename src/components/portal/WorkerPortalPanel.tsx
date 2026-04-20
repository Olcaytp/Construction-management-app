import { useState } from "react";
import { useWorkerPortalAdmin } from "@/hooks/useWorkerPortal";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Send,
  UserCheck,
  UserX,
  Clock,
  MapPin,
  Wrench,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Image,
} from "lucide-react";

const WORK_TYPE_LABELS: Record<string, string> = {
  demir: "Demir",
  kalip: "Kalıp",
  beton: "Beton",
  diger: "Diğer",
};

const WORK_TYPE_COLORS: Record<string, string> = {
  demir: "bg-blue-900 text-blue-300",
  kalip: "bg-amber-900 text-amber-300",
  beton: "bg-green-900 text-green-300",
  diger: "bg-slate-700 text-slate-300",
};

export const WorkerPortalPanel = () => {
  const { teamMembers } = useTeamMembers();
  const {
    portalLinks,
    allWorkerLogs,
    allComments,
    inviteWorker,
    deactivateWorker,
    isInviting,
  } = useWorkerPortalAdmin();

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [email, setEmail] = useState("");
  const [filterMemberId, setFilterMemberId] = useState("all");
  const [filterWeek, setFilterWeek] = useState("all");
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // Hangi usta portalda aktif?
  const linkedMemberIds = portalLinks.filter((l) => l.isActive).map((l) => l.teamMemberId);

  // Seçilen üye için email otomatik doldur (telefon yok, sadece bilgi)
  const selectedMember = teamMembers.find((m) => m.id === selectedMemberId);

  const handleInvite = async () => {
    if (!selectedMemberId || !email) return;
    await inviteWorker({ teamMemberId: selectedMemberId, email });
    setSelectedMemberId("");
    setEmail("");
  };

  // Filtreli loglar
  const filteredLogs = allWorkerLogs.filter((log) => {
    if (filterMemberId !== "all" && log.teamMemberId !== filterMemberId) return false;
    if (filterWeek !== "all" && String(log.weekNumber) !== filterWeek) return false;
    return true;
  });

  // Üyeye göre gruplandırılmış loglar
  const memberName = (id: string) =>
    teamMembers.find((m) => m.id === id)?.name || id.slice(0, 8);

  // Hafta listesi (benzersiz)
  const weekOptions = Array.from(
    new Set(allWorkerLogs.map((l) => `${l.weekNumber}`))
  ).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-6">
      {/* Davet Et */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          Ustaya Portal Erişimi Ver
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger>
              <SelectValue placeholder="Usta seç" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex items-center gap-2">
                    <span>{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.specialty}</span>
                    {linkedMemberIds.includes(m.id) && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">Aktif</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="email"
            placeholder="usta@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button
            onClick={handleInvite}
            disabled={!selectedMemberId || !email || isInviting}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {isInviting ? "Gönderiliyor..." : "Magic Link Gönder"}
          </Button>
        </div>

        {selectedMember && (
          <p className="text-xs text-muted-foreground mt-2">
            {selectedMember.name} — {selectedMember.specialty} — Tel: {selectedMember.phone}
          </p>
        )}
      </div>

      {/* Aktif Ustalar */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-green-500" />
          Portal Erişimi Olan Ustalar
        </h3>

        {portalLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Henüz hiç usta davet edilmedi
          </p>
        ) : (
          <div className="space-y-2">
            {portalLinks.map((link) => {
              const member = teamMembers.find((m) => m.id === link.teamMemberId);
              const memberLogs = allWorkerLogs.filter(
                (l) => l.teamMemberId === link.teamMemberId
              );
              const currentWeekNum = (() => {
                const d = new Date();
                const dayNum = d.getDay() || 7;
                d.setDate(d.getDate() + 4 - dayNum);
                const yearStart = new Date(d.getFullYear(), 0, 1);
                return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
              })();
              const thisWeek = memberLogs.filter((l) => l.weekNumber === currentWeekNum);
              const totalHoursThisWeek = thisWeek.reduce(
                (s, l) => s + (l.hoursWorked || 0), 0
              );
              const expanded = expandedMemberId === link.teamMemberId;

              return (
                <div
                  key={link.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() =>
                      setExpandedMemberId(expanded ? null : link.teamMemberId)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${link.isActive ? "bg-green-500" : "bg-slate-400"}`} />
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {member?.name || "Bilinmiyor"}
                        </p>
                        <p className="text-xs text-muted-foreground">{link.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {totalHoursThisWeek > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Bu hafta: <span className="text-foreground font-medium">{totalHoursThisWeek.toFixed(1)}s</span>
                        </span>
                      )}
                      <Badge variant={link.isActive ? "default" : "secondary"}>
                        {link.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                      {expanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-border p-3 bg-muted/30 space-y-3">
                      {/* Son 7 log */}
                      {memberLogs.slice(0, 7).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className="text-muted-foreground w-24 text-xs">
                            {new Date(log.workDate).toLocaleDateString("tr-TR", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          {log.isDayOff ? (
                            <span className="text-xs text-slate-400 italic">
                              İzin {log.dayOffReason ? `— ${log.dayOffReason}` : ""}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1 text-xs text-foreground">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                {log.hoursWorked.toFixed(1)}s
                              </span>
                              {log.zone && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  {log.zone}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${WORK_TYPE_COLORS[log.workType] || ""}`}>
                                {WORK_TYPE_LABELS[log.workType] || log.workType}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}

                      {memberLogs.length === 0 && (
                        <p className="text-xs text-muted-foreground">Henüz giriş yapılmamış</p>
                      )}

                      <div className="flex justify-end">
                        {link.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deactivateWorker(link.teamMemberId)}
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Erişimi Kaldır
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tüm Loglar — Filtreli */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            Çalışma Kayıtları
          </h3>
          <div className="flex gap-2">
            <Select value={filterMemberId} onValueChange={setFilterMemberId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tüm ustalar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm ustalar</SelectItem>
                {teamMembers
                  .filter((m) => linkedMemberIds.includes(m.id))
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={filterWeek} onValueChange={setFilterWeek}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tüm haftalar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm haftalar</SelectItem>
                {weekOptions.map((w) => (
                  <SelectItem key={w} value={w}>Hafta {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Kayıt bulunamadı</p>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/20 text-sm"
              >
                <span className="text-muted-foreground text-xs w-28 shrink-0">
                  {new Date(log.workDate).toLocaleDateString("tr-TR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="font-medium text-xs w-24 shrink-0 truncate">
                  {memberName(log.teamMemberId)}
                </span>
                {log.isDayOff ? (
                  <span className="text-xs text-muted-foreground italic">İzin</span>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{log.hoursWorked.toFixed(1)}s</span>
                    {log.zone && (
                      <span className="text-xs text-muted-foreground">{log.zone}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${WORK_TYPE_COLORS[log.workType] || ""}`}>
                      {WORK_TYPE_LABELS[log.workType]}
                    </span>
                    {log.notes && (
                      <span className="text-xs text-muted-foreground italic truncate max-w-32">
                        {log.notes}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Görev Yorumları */}
      {allComments.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Görev Yorumları
          </h3>
          <div className="space-y-3">
            {allComments.map((comment) => (
              <div key={comment.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {memberName(comment.teamMemberId)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString("tr-TR")}
                  </span>
                </div>
                <p className="text-sm text-foreground">{comment.comment}</p>
                {comment.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {comment.photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt=""
                          className="w-16 h-16 object-cover rounded-md border border-border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
