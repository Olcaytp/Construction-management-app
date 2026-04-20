import { useState, useRef } from "react";
import { useWorkerPortal } from "@/hooks/useWorkerPortal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Camera,
  Send,
  Calendar,
  Package,
  Loader2,
} from "lucide-react";

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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Bekliyor", color: "bg-slate-700 text-slate-300" },
  "in-progress": { label: "Devam Ediyor", color: "bg-blue-900 text-blue-300" },
  completed: { label: "Tamamlandı", color: "bg-green-900 text-green-300" },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "bg-slate-800 text-slate-400" },
  medium: { label: "Orta", color: "bg-amber-900 text-amber-400" },
  high: { label: "Yüksek", color: "bg-red-900 text-red-400" },
};

interface Props {
  tasks: Task[];
  isLoading: boolean;
}

export const WorkerTaskList = ({ tasks, isLoading }: Props) => {
  const { taskComments, addComment, uploadPhoto, isSubmitting } = useWorkerPortal();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
          <Package className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-slate-400 text-sm">Henüz görev atanmamış</p>
      </div>
    );
  }

  const commentsForTask = (taskId: string) =>
    taskComments.filter((c) => c.taskId === taskId);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadPhoto));
      setUploadingPhotos((prev) => [...prev, ...urls]);
    } catch {
      // toast is handled in hook
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendComment = async (taskId: string) => {
    if (!commentText.trim() && uploadingPhotos.length === 0) return;
    await addComment({
      taskId,
      comment: commentText.trim(),
      photos: uploadingPhotos,
    });
    setCommentText("");
    setUploadingPhotos([]);
  };

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const expanded = expandedTaskId === task.id;
        const comments = commentsForTask(task.id);
        const status = STATUS_LABELS[task.status] || STATUS_LABELS.pending;
        const priority = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium;

        return (
          <div
            key={task.id}
            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
          >
            {/* Görev başlığı */}
            <button
              className="w-full text-left p-4"
              onClick={() => setExpandedTaskId(expanded ? null : task.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm leading-snug">
                    {task.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {task.projectTitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {comments.length > 0 && (
                    <span className="text-xs text-slate-500 flex items-center gap-0.5">
                      <MessageSquare className="w-3 h-3" />
                      {comments.length}
                    </span>
                  )}
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                  {status.label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${priority.color}`}>
                  {priority.label}
                </span>
                {task.dueDate && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(task.dueDate).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
              </div>
            </button>

            {/* Genişlemiş detay */}
            {expanded && (
              <div className="border-t border-slate-800 p-4 space-y-4">
                {/* Görev detayları */}
                {task.description && (
                  <p className="text-sm text-slate-300">{task.description}</p>
                )}
                {task.quantity > 0 && (
                  <p className="text-xs text-slate-400">
                    Miktar: <span className="text-white">{task.quantity} {task.unit}</span>
                  </p>
                )}

                {/* Mevcut yorumlar */}
                {comments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Yorumlar
                    </p>
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className="bg-slate-800 rounded-lg p-3 space-y-2"
                      >
                        <p className="text-sm text-slate-200">{c.comment}</p>
                        {c.photos.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {c.photos.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt=""
                                  className="w-16 h-16 object-cover rounded-md border border-slate-700"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-500">
                          {new Date(c.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Yeni yorum formu */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Yorum Ekle
                  </p>
                  <Textarea
                    placeholder="Çalışma notu, sorun, ilerleme..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none text-sm"
                    rows={3}
                  />

                  {/* Yüklenen fotoğraf önizlemeleri */}
                  {uploadingPhotos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {uploadingPhotos.map((url, i) => (
                        <div key={i} className="relative">
                          <img
                            src={url}
                            alt=""
                            className="w-14 h-14 object-cover rounded-md border border-amber-500/50"
                          />
                          <button
                            onClick={() =>
                              setUploadingPhotos((p) => p.filter((_, j) => j !== i))
                            }
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center"
                          >
                            ×
                          </button>
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
                      onChange={handlePhotoUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      Fotoğraf
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSendComment(task.id)}
                      disabled={
                        isSubmitting ||
                        (!commentText.trim() && uploadingPhotos.length === 0)
                      }
                      className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold gap-1.5 flex-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmitting ? "Gönderiliyor..." : "Gönder"}
                    </Button>
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
