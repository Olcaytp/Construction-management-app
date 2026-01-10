import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Loader2, Save, Eye, Loader } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useContracts } from "@/hooks/useContracts";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import { Project } from "@/hooks/useProjects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContractGeneratorProps {
  project: Project;
  customer?: {
    id?: string;
    name: string;
    phone?: string;
    address?: string;
  } | null;
  teamMembers?: Array<{
    id: string;
    name: string;
    specialty: string;
    daily_wage?: number;
  }>;
  onContractSaved?: () => void;
}

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

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");

const mdToSafeHtml = (text: string) => {
  const html = marked.parse(text || "");
  return DOMPurify.sanitize(html as string);
};

export const ContractGenerator = ({ project, customer, teamMembers, onContractSaved }: ContractGeneratorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [contract, setContract] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState<string | null>(null);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { contracts, saveContract, updateContract, fetchContracts } = useContracts();

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const { data } = await supabase.from('profiles').select('country, currency').eq('id', user.id).maybeSingle();
        if (data) {
          setUserCountry(data.country || 'TR');
          setUserCurrency(data.currency || 'TRY');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    };
    loadProfile();
  }, [user]);

  const existingContract = useMemo(
    () => contracts.find((c) => c.project_id === project.id) || null,
    [contracts, project.id]
  );

  const generateContract = async () => {
    setIsLoading(true);
    setContract(null);

    try {
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: { project, customer, teamMembers, language: i18n.language, country: userCountry, currency: userCurrency },
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setContract(data.contract);
      toast({ title: t("contract.generated") });
    } catch (error) {
      console.error("Contract generation error:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("contract.generateError"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFont = async (doc: jsPDF) => {
    try {
      const fontUrl = `/fonts/DejaVuSans.ttf`;
      const font = await fetch(fontUrl);
      const fontData = await font.arrayBuffer();
      const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontData)));
      doc.addFileToVFS("DejaVuSans.ttf", fontBase64);
      doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
      doc.setFont("DejaVuSans", "normal");
    } catch (e) {
      console.warn("Could not load DejaVuSans font, falling back to default", e);
    }
  };

  const downloadPDF = async () => {
    if (!contract) return;

    const doc = new jsPDF();
    await loadFont(doc);

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    
    // Remove markdown formatting for PDF
    const cleanText = stripMarkdown(contract);

    const lines = doc.splitTextToSize(cleanText, maxWidth);
    
    let y = 20;
    const lineHeight = 6.5;
    
    doc.setFontSize(12);
    doc.setFont("DejaVuSans", "normal");
    
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }

    doc.save(`${project.title}_${t("contract.title")}.pdf`);
    toast({ title: t("contract.downloaded") });
  };

  const downloadDoc = () => {
    if (!contract) return;

    const cleanText = stripMarkdown(contract);

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
    a.download = `${project.title}_${t("contract.title")}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t("contract.wordReady") });
  };

  const handleSaveContract = async () => {
    if (!contract) return;

    setIsSaving(true);
    try {
      await saveContract({
        title: `${project.title} - ${t("contract.title")}`,
        content: contract,
        project_id: project.id,
        customer_id: customer?.id || null,
        contractor_name: customer?.name,
        contractor_phone: customer?.phone,
        contractor_address: customer?.address,
        contract_date: new Date().toISOString().split('T')[0],
        status: 'draft',
      });

      toast({ 
        title: t("contract.saved"),
        description: t("contract.saved")
      });

      // keep generated content in state
      fetchContracts();
      setIsOpen(false);
      
      onContractSaved?.();
    } catch (error) {
      console.error("Error saving contract:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("contract.generateError"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!existingContract) return;
    setIsStatusUpdating(true);
    try {
      await updateContract(existingContract.id, { status: newStatus });
      toast({ title: t("contract.statusUpdated") });
      fetchContracts();
    } catch (err) {
      console.error('Error updating status:', err);
      toast({ variant: 'destructive', title: t('common.error'), description: String(err) });
    } finally {
      setIsStatusUpdating(false);
    }
  };

  return (
    <div className="flex gap-2">
      {existingContract && (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              {t("contract.view")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {existingContract.title}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Select value={existingContract.status || 'draft'} disabled={isStatusUpdating} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('contract.draft')}</SelectItem>
                      <SelectItem value="signed">{t('contract.signed')}</SelectItem>
                      <SelectItem value="completed">{t('contract.completed')}</SelectItem>
                      <SelectItem value="archived">{t('contract.archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {isStatusUpdating && <Loader className="h-4 w-4 animate-spin" />}
                </div>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/30 overflow-hidden">
              <div
                className="prose prose-sm dark:prose-invert max-w-none pr-4"
                dangerouslySetInnerHTML={{ __html: mdToSafeHtml(existingContract.content) }}
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            {t("contract.generate")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("contract.title")}- {project.title}
            </DialogTitle>
          </DialogHeader>

          {!contract ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 flex-1">
              <p className="text-muted-foreground text-center max-w-md">
                {t("contract.description")}
              </p>
              <Button onClick={generateContract} disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("contract.generating")}
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    {t("contract.generateButton")}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-end gap-2 flex-shrink-0">
                <Button onClick={handleSaveContract} disabled={isSaving} className="gap-2" variant="default">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("contract.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t("contract.save")}
                    </>
                  )}
                </Button>
                <Button onClick={downloadPDF} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  {t("contract.downloadPDF")}
                </Button>
                <Button onClick={downloadDoc} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  {t("contract.wordDownload")}
                </Button>
              </div>
              <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/30 overflow-hidden">
                <div className="prose prose-sm dark:prose-invert max-w-none pr-4"
                  dangerouslySetInnerHTML={{ __html: mdToSafeHtml(contract) }} />
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
