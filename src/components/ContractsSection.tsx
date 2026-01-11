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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useSubscription } from "@/hooks/useSubscription";

const stripMarkdown = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__([^_]*)__|_([^_]*)_/g, "$1$2")
    .replace(/^\s*-\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const mdToSafeHtml = (text: string) => {
  const html = marked.parse(text || "");
  return DOMPurify.sanitize(html as string);
};

export const ContractsSection = () => {
  const { contracts, loading, deleteContract, updateContract } = useContracts();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isPremium } = useSubscription();
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm(t("contract.deleteConfirm"))) return;
    
    try {
      await deleteContract(id);
      toast({ title: t("contract.deleted") });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("contract.deleteError"),
      });
    }
  };

  const handleDownloadPDF = (contract: any) => {
    const jsPDFModule = (window as any).jsPDF;
    if (!jsPDFModule) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("contract.pdfError"),
      });
      return;
    }

    const doc = new jsPDFModule();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    
    const cleanText = stripMarkdown(contract.content);

    const lines = doc.splitTextToSize(cleanText, maxWidth);
    
    let y = 20;
    const lineHeight = 6.5;
    
    doc.setFontSize(12);
    
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }

    doc.save(`${contract.title}.pdf`);
  };

  const handleDownloadDoc = (contract: any) => {
    const cleanText = stripMarkdown(contract.content);
    
    const htmlContent = `<!doctype html>
<html>
<head><meta charset="UTF-8"><style>body { font-family: Arial, sans-serif; line-height: 1.5; margin: 20px; }</style></head>
<body>
<pre>${cleanText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: "application/msword" });
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
          <ScrollArea className="h-[60vh]">
            <div className="space-y-3 pr-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{contract.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {contract.contractor_name && `${contract.contractor_name} • `}
                          {format(
                            new Date(contract.created_at),
                            "d MMMM yyyy",
                            { locale: i18n.language === 'tr' ? tr : undefined }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {getStatusBadge(contract.status)}
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedContract(contract.id);
                            setIsEditing(false);
                            setEditContent("");
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                        <DialogHeader className="flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <DialogTitle>{contract.title}</DialogTitle>
                            <div className="flex items-center gap-2">
                              {!isEditing && isPremium && (
                                <Button size="sm" variant="outline" onClick={() => handleEditStart(contract)} className="gap-2">
                                  ✏️ {t("common.edit")}
                                </Button>
                              )}
                              {isEditing && (
                                <>
                                  <Button size="sm" variant="default" onClick={() => handleEditSave(contract.id)} disabled={isSaving} className="gap-2">
                                    <Save className="h-4 w-4" />
                                    {t("contract.save")}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleEditCancel} disabled={isSaving}>
                                    {t("common.cancel")}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </DialogHeader>
                        {isEditing ? (
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="flex-1 p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Sözleşme metnini düzenleyin..."
                          />
                        ) : (
                          <div className="flex-1 border rounded-lg p-4 bg-muted/30 overflow-auto">
                            <div className="prose prose-sm dark:prose-invert max-w-none break-words"
                              style={{ wordWrap: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}
                              dangerouslySetInnerHTML={{ __html: mdToSafeHtml(contract.content) }} />
                          </div>
                        )}
                        {!isEditing && (
                          <div className="flex justify-end gap-2 flex-shrink-0 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPDF(contract)}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              {t("contract.pdfDownload")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDoc(contract)}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              {t("contract.wordDownload")}
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(contract.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
