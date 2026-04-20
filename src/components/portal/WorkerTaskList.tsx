import { useState, useRef } from "react";
import { useWorkerPortal } from "@/hooks/useWorkerPortal";
import { Loader2, Package, ChevronDown, ChevronUp, Calendar, MapPin, Layers, Clock, MessageSquare, Camera, Send, User } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectTitle: string;
  dueDate: string;
  estimatedCost: number;
  quantity: number;
  unit: string;
}

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:     { label: "Bekliyor",      bg: "bg-gray-100",   text: "text-gray-600" },
  "in-progress": { label: "Devam Ediyor", bg: "bg-blue-100",   text: "text-blue-700" },
  completed:   { label: "Tamamlandı",    bg: "bg-green-100",  text: "text-green-700" },
};

const PRIORITY: Record<string, { label: string; bg: string; text: string }> = {
  low:    { label: "Düşük",   bg: "bg-gray-100",   text: "text-gray-500" },
  medium: { label: "Orta",    bg: "bg-amber-100",  text: "text-amber-700" },
  high:   { label: "Yüksek",  bg: "bg-red-100",    text: "text-red-700" },
};

interface Props { tasks: Task[]; isLoading: boolean; }

export const WorkerTaskList = ({ tasks, isLoading }: Props) => {
  const { taskComments, addComment, uploadPhoto } = useWorkerPortal();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [pendingPhotos, setPendingPhotos] = useState<Record<string, string[]>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
    </div>
  );

  if (tasks.length === 0) return (
    <div className="text-center py-16">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Package className="w-7 h-7 text-gray-400" />
      </div>
      <p className="text-gray-500 text-sm">Henüz görev atanmamış</p>
    </div>
  );

  const commentsForTask = (taskId: string) =>
    taskComments.filter((c) => c.taskId === taskId);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadPhoto));
      setPendingPhotos((p) => ({ ...p, [taskId]: [...(p[taskId] || []), ...urls] }));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async (taskId: string) => {
    const text = commentTexts[taskId] || "";
    const photos = pendingPhotos[taskId] || [];
    if (!text.trim() && !photos.length) return;
    setIsSending(true);
    await addComment({ taskId, comment: text.trim(), photos });
    setCommentTexts((p) => ({ ...p, [taskId]: "" }));
    setPendingPhotos((p) => ({ ...p, [taskId]: [] }));
    setIsSending(false);
  };

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const expanded = expandedTaskId === task.id;
        const comments = commentsForTask(task.id);
        const status = STATUS[task.status] || STATUS.pending;
        const priority = PRIORITY[task.priority] || PRIORITY.medium;
        const commentText = commentTexts[task.id] || "";
        const photos = pendingPhotos[task.id] || [];

        return (
          <div key={task.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Görev başlığı — tıklanabilir */}
            <button
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedTaskId(expanded ? null : task.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-snug">{task.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{task.projectTitle}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {comments.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {comments.length}
                    </span>
                  )}
                  {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Badge'ler */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.bg} ${priority.text}`}>
                  {priority.label}
                </span>
                {task.dueDate && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(task.dueDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </button>

            {/* Genişlemiş detay */}
            {expanded && (
              <div className="border-t border-gray-100">
                {/* Görev bilgileri */}
                <div className="p-4 bg-gray-50 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Görev Detayları</p>

                  {task.description && (
                    <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {task.quantity > 0 && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span><span className="font-semibold">{task.quantity}</span> {task.unit}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{new Date(task.dueDate).toLocaleDateString("tr-TR")}</span>
                      </div>
                    )}
                    {task.projectTitle && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-200 col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{task.projectTitle}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Yorumlar */}
                <div className="p-4 space-y-3">
                  {comments.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Yorumlar ({comments.length})
                      </p>
                      {comments.map((c) => (
                        <div key={c.id} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                          {/* Yorum başlığı — isim + tarih */}
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{c.memberName || "Usta"}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(c.createdAt).toLocaleDateString("tr-TR", {
                                  day: "numeric", month: "long", year: "numeric"
                                })} · {new Date(c.createdAt).toLocaleTimeString("tr-TR", {
                                  hour: "2-digit", minute: "2-digit"
                                })}
                              </p>
                            </div>
                          </div>
                          {/* Yorum metni */}
                          {c.comment && (
                            <p className="text-sm text-gray-700 leading-relaxed pl-9">{c.comment}</p>
                          )}
                          {/* Fotoğraflar */}
                          {c.photos.length > 0 && (
                            <div className="flex gap-2 flex-wrap pl-9">
                              {c.photos.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Yeni yorum formu */}
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Yorum Ekle</p>
                    <textarea
                      rows={3}
                      placeholder="Çalışma notu, sorun, ilerleme durumu..."
                      value={commentText}
                      onChange={(e) => setCommentTexts((p) => ({ ...p, [task.id]: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    />

                    {/* Fotoğraf önizleme */}
                    {photos.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {photos.map((url, i) => (
                          <div key={i} className="relative">
                            <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-amber-200" />
                            <button
                              onClick={() => setPendingPhotos((p) => ({ ...p, [task.id]: p[task.id].filter((_, j) => j !== i) }))}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, task.id)}
                      />
                      <button
                        onClick={() => { setActiveTaskId(task.id); fileInputRef.current?.click(); }}
                        disabled={isUploading}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                        Fotoğraf
                      </button>
                      <button
                        onClick={() => handleSend(task.id)}
                        disabled={isSending || (!commentText.trim() && !photos.length)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-40"
                      >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Gönder
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};