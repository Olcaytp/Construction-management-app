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
import { useSubscription } from "@/hooks/useSubscription";

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
  const { isPremium, createCheckout } = useSubscription();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language);
  const [includeAdvancedClauses, setIncludeAdvancedClauses] = useState<boolean>(true);
  const [includePaymentSchedule, setIncludePaymentSchedule] = useState<boolean>(true);
  const [includePenaltyClauses, setIncludePenaltyClauses] = useState<boolean>(true);

  const contractsThisMonth = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return contracts.filter(c => (c.created_at || '').startsWith(ym)).length;
  }, [contracts]);

  const FREE_MONTHLY_CONTRACT_LIMIT = 3;

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        // @ts-ignore - country and currency columns are added dynamically
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (data) {
          // @ts-ignore
          setUserCountry(data.country || 'TR');
          // @ts-ignore
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
        body: {
          project,
          customer,
          teamMembers,
          language: isPremium ? selectedLanguage : i18n.language,
          country: userCountry,
          currency: userCurrency,
          mode: isPremium ? 'advanced' : 'basic',
          options: isPremium ? {
            includeAdvancedClauses,
            includePaymentSchedule,
            includePenaltyClauses,
          } : undefined,
        },
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
      // @ts-ignore - type validated at runtime
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
          <Button variant="outline" size="sm" className="gap-2"
            disabled={!isPremium && contractsThisMonth >= FREE_MONTHLY_CONTRACT_LIMIT}
            title={!isPremium && contractsThisMonth >= FREE_MONTHLY_CONTRACT_LIMIT ? (t("contract.limitReached") || "Ücretsiz planda aylık 3 sözleşme limiti") : undefined}
          >
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
              {!isPremium && (
                <div className="w-full max-w-xl rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-amber-700">
                      {t("contract.freePlanNotice") || "Ücretsiz planda temel sözleşme şablonu oluşturabilirsiniz. Aylık 3 sözleşme limiti bulunmaktadır."}
                    </p>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        const url = await createCheckout?.("price_1SoAR6Bqz5IswCfZx0s7zlag");
                        if (url) window.open(url, "_blank");
                      }}
                    >
                      {t("subscription.upgrade") || "Premium'a Yükselt"}
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t("contract.freePlanFeatures") || "Temel maddeler, tek dil çıkışı, sınırlı seçenekler"}
                  </div>
                </div>
              )}
              {isPremium && (
                <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t("contract.language") || "Dil"}</p>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tr">Türkçe</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sv">Svenska</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t("contract.options") || "Seçenekler"}</p>
                    <div className="flex flex-col gap-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={includeAdvancedClauses} onChange={(e) => setIncludeAdvancedClauses(e.target.checked)} />
                        {t("contract.advancedClauses") || "Gelişmiş sözleşme maddeleri"}
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={includePaymentSchedule} onChange={(e) => setIncludePaymentSchedule(e.target.checked)} />
                        {t("contract.paymentSchedule") || "Ödeme planı"}
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={includePenaltyClauses} onChange={(e) => setIncludePenaltyClauses(e.target.checked)} />
                        {t("contract.penaltyClauses") || "Ceza hükümleri"}
                      </label>
                    </div>
                  </div>
                </div>
              )}
              <Button 
                onClick={generateContract} 
                disabled={isLoading || (!isPremium && contractsThisMonth >= FREE_MONTHLY_CONTRACT_LIMIT)} 
                className="gap-2"
                title={!isPremium && contractsThisMonth >= FREE_MONTHLY_CONTRACT_LIMIT ? t("contract.limitReached") || "Ücretsiz planda aylık 3 sözleşme limiti" : undefined}
              >
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
