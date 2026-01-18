import { useContracts } from "@/hooks/useContracts";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Download, 
  Trash2, 
  Eye,
  AlertCircle,
  Save
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useSubscription } from "@/hooks/useSubscription";
import jsPDF from "jspdf";

// Extract clean text from markdown while preserving content
const cleanMarkdown = (text: string): string => {
  if (!text) return "";
  
  // Parse markdown to HTML first
  const html = marked.parse(text);
  
  // Create temporary div to extract text content
  const temp = document.createElement('div');
  temp.innerHTML = DOMPurify.sanitize(html as string);
  
  // Get text content and clean up
  let plainText = temp.innerText || temp.textContent || "";
  
  // Remove any remaining markdown syntax
  plainText = plainText
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  
  return plainText;
};

const mdToSafeHtml = (text: string) => {
  const html = marked.parse(text || "");
  return DOMPurify.sanitize(html as string);
};

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const ContractsSection = () => {
  const { contracts, loading, deleteContract, updateContract } = useContracts();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteContract(deleteConfirm);
      toast({ title: t("contract.deleted") });
      setDeleteConfirm(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("contract.deleteError"),
      });
      setDeleteConfirm(null);
    }
  };

  const loadFont = async (doc: jsPDF) => {
    try {
      const fontUrl = `/fonts/DejaVuSans.ttf`;
      const response = await fetch(fontUrl);
      if (!response.ok) {
        console.error('Font fetch failed:', response.status);
        return false;
      }
      const fontData = await response.arrayBuffer();
      
      // Convert ArrayBuffer to base64 in chunks to avoid call stack size issues
      const uint8Array = new Uint8Array(fontData);
      let binary = '';
      const chunkSize = 0x8000; // 32KB chunks
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const fontBase64 = btoa(binary);
      
      doc.addFileToVFS("DejaVuSans.ttf", fontBase64);
      doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
      doc.setFont("DejaVuSans", "normal");
      console.log('DejaVuSans font loaded successfully');
      return true;
    } catch (e) {
      console.error("Failed to load DejaVuSans font:", e);
      return false;
    }
  };

  const handleDownloadPDF = async (contract: any) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const fontLoaded = await loadFont(doc);
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15; // mm margins (standard for A4)
      const maxWidth = pageWidth - margin * 2;
      
      const cleanText = cleanMarkdown(contract.content);

      // Add title with proper encoding
      doc.setFontSize(14);
      if (fontLoaded) {
        doc.setFont("DejaVuSans", "normal");
      }
      
      // Split title if too long
      const titleLines = doc.splitTextToSize(contract.title, maxWidth);
      let y = margin;
      for (const titleLine of titleLines) {
        doc.text(titleLine, margin, y);
        y += 7;
      }
      
      // Add content
      doc.setFontSize(11);
      y += 3; // Small gap after title
      
      // Split content into lines that fit within maxWidth
      const lines = doc.splitTextToSize(cleanText, maxWidth);
      const lineHeight = 6; // mm
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if we need a new page
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          if (fontLoaded) {
            doc.setFont("DejaVuSans", "normal");
          }
        }
        
        // Draw the line
        doc.text(line, margin, y);
        y += lineHeight;
      }

      doc.save(`${contract.title}.pdf`);
      toast({ title: t("contract.downloaded") || "PDF indirildi" });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        variant: "destructive",
        title: t("common.error") || "Hata",
        description: "PDF oluşturulurken hata oluştu.",
      });
    }
  };

  const handleDownloadDoc = (contract: any) => {
    const cleanText = cleanMarkdown(contract.content);
    const paragraphs = cleanText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    const safeTitle = escapeHtml(contract.title);
    const bodyHtml = paragraphs
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
      .join('');
    
    // Build an HTML-based .doc with proper A4 styling and UTF-8 for Turkish characters
    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    body {
      font-family: 'DejaVu Sans', 'Calibri', 'Arial', 'Segoe UI', sans-serif;
      line-height: 1.65;
      margin: 0;
      padding: 0;
      color: #111;
      font-size: 11pt;
      background: #fff;
    }
    h1 {
      font-size: 16pt;
      font-weight: 700;
      margin: 0 0 16px;
      padding: 0;
      text-align: center;
      letter-spacing: 0.2pt;
    }
    p {
      margin: 10px 0;
      text-align: left;
      orphans: 2;
      widows: 2;
      text-indent: 8mm;
    }
    .section {
      page-break-inside: avoid;
      max-width: 160mm;
    }
  </style>
</head>
<body>
  <div class="section">
    <h1>${safeTitle}</h1>
    ${bodyHtml}
  </div>
</body>
</html>`;
    
    // Use .doc (HTML) with UTF-8 BOM to ensure Turkish characters render correctly in Word
    const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contract.title}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditStart = (contract: any) => {
    setEditContent(contract.content);
    setIsEditing(true);
  };

  const handleEditSave = async (contractId: string) => {
    if (!editContent) return;
    setIsSaving(true);
    try {
      await updateContract(contractId, { content: editContent });
      toast({ title: t("contract.saved") });
      setIsEditing(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("contract.generateError"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: t("contract.draft") },
      signed: { variant: "default", label: t("contract.signed") },
      completed: { variant: "default", label: t("contract.completed") },
      archived: { variant: "outline", label: t("contract.archived") },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("contract.contracts")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("common.loading") || "Yükleniyor..."}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("contract.contracts")}
        </CardTitle>
        <CardDescription>
          {contracts.length} {t("contract.contractsCount")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("contract.noContracts")}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("contract.noContractsDesc")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                onClick={() => {
                  setSelectedContract(contract.id);
                  setIsEditing(false);
                  setEditContent("");
                }}
                className="rounded-lg border bg-card hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-start gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <h3 className="font-semibold text-base break-words flex-1">
                      {contract.title}
                    </h3>
                  </div>
                  {contract.contractor_name && (
                    <p className="text-xs text-muted-foreground mb-2">{contract.contractor_name}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {getStatusBadge(contract.status)}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="text-xs font-medium mb-1">Tarih</p>
                    <p>
                      {format(
                        new Date(contract.created_at),
                        "d MMMM yyyy",
                        { locale: i18n.language === 'tr' ? tr : undefined }
                      )}
                    </p>
                  </div>
                </div>

                {/* Card Footer - Actions */}
                <div className="p-4 border-t border-border flex items-center gap-2 bg-muted/30">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContract(contract.id);
                      setIsEditing(false);
                      setEditContent("");
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="text-xs">{t("contract.view") || "Görüntüle"}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(contract.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 flex-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-xs">{t("common.delete")}</span>
                  </Button>
                </div>
              </div>
            ))}
            </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sözleşmeyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu sözleşmeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {t("common.delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contract View/Edit Dialog */}
      {selectedContract && (
        <Dialog open={!!selectedContract} onOpenChange={(open) => !open && setSelectedContract(null)}>
          <DialogContent 
            className="w-[95vw] sm:max-w-[840px] h-[90vh] flex flex-col overflow-hidden p-0"
            aria-describedby="contract-content-description"
          >
            {contracts.find(c => c.id === selectedContract) && (
              <>
                <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
                  <div className="flex items-start justify-between gap-2">
                    <DialogTitle className="flex-1 text-sm sm:text-base break-words pr-2">
                      {contracts.find(c => c.id === selectedContract)?.title}
                    </DialogTitle>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!isEditing && isPremium && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const contract = contracts.find(c => c.id === selectedContract);
                            if (contract) handleEditStart(contract);
                          }}
                          className="gap-1 text-xs sm:text-sm h-8 px-2 sm:px-3"
                        >
                          ✏️ <span className="hidden sm:inline">{t("common.edit")}</span>
                        </Button>
                      )}
                      {isEditing && (
                        <>
                          <Button 
                            size="sm" 
                            variant="default" 
                            onClick={() => {
                              if (selectedContract) handleEditSave(selectedContract);
                            }}
                            disabled={isSaving} 
                            className="gap-1 text-xs h-8 px-2"
                          >
                            <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleEditCancel} 
                            disabled={isSaving}
                            className="text-xs h-8 px-2"
                          >
                            {t("common.cancel")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </DialogHeader>
                <span id="contract-content-description" className="sr-only">
                  {t("contract.viewAndEdit") || "Sözleşme içeriğini görüntüleyin ve düzenleyin"}
                </span>
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 px-4 sm:px-6 py-3 sm:py-4 border-0 bg-white dark:bg-slate-950 font-serif text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sözleşme metnini düzenleyin..."
                  />
                ) : (
                  <div className="flex-1 overflow-auto bg-white dark:bg-slate-950">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 whitespace-pre-wrap break-words font-serif leading-relaxed">
                      <p className="text-xs sm:text-sm text-foreground">{cleanMarkdown(contracts.find(c => c.id === selectedContract)?.content || "")}</p>
                    </div>
                  </div>
                )}
                {!isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end gap-2 flex-shrink-0 px-4 sm:px-6 py-3 border-t bg-muted/20">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const contract = contracts.find(c => c.id === selectedContract);
                        if (contract) handleDownloadPDF(contract);
                      }}
                      className="gap-2 w-full sm:w-auto justify-center"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">{t("contract.pdfDownload")}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const contract = contracts.find(c => c.id === selectedContract);
                        if (contract) handleDownloadDoc(contract);
                      }}
                      className="gap-2 w-full sm:w-auto justify-center"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">{t("contract.wordDownload")}</span>
                    </Button>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
