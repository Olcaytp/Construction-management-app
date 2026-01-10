import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaterialForm } from "@/components/MaterialForm";
import { MaterialItem } from "@/components/MaterialItem";
import { useMaterials, Material } from "@/hooks/useMaterials";
import { useProjects } from "@/hooks/useProjects";
import { Plus, Sparkles, Package, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const MaterialsSection = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const { materials, isLoading, addMaterial, updateMaterial, deleteMaterial, addBulkMaterials } = useMaterials(selectedProjectId || undefined);
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [userCountry, setUserCountry] = useState("TR");
  const [userCurrency, setUserCurrency] = useState("TRY");

  const currencyMeta = useMemo(() => {
    const code = (userCurrency || "TRY").toUpperCase();
    switch (code) {
      case "SEK":
        return { code, symbol: "kr", locale: "sv-SE" };
      case "EUR":
        return { code, symbol: "€", locale: "de-DE" };
      case "USD":
        return { code, symbol: "$", locale: "en-US" };
      case "GBP":
        return { code, symbol: "£", locale: "en-GB" };
      default:
        return { code: "TRY", symbol: "₺", locale: "tr-TR" };
    }
  }, [userCurrency]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        const { data } = await supabase
          .from("profiles")
          .select("country, currency")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          setUserCountry(data.country || "TR");
          setUserCurrency(data.currency || "TRY");
        }
      } catch (error) {
        console.error("load profile error (materials):", error);
      }
    };

    loadProfile();
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleAddMaterial = (data: any) => {
    if (!selectedProjectId) {
      toast({ variant: "destructive", title: t("material.toast.error"), description: t("material.toast.selectProject") });
      return;
    }
    addMaterial({
      projectId: selectedProjectId,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      estimatedCost: data.estimatedCost,
      actualCost: data.actualCost,
      status: data.status,
      supplier: data.supplier || null,
      notes: data.notes || null,
    });
    setFormOpen(false);
  };

  const handleEditMaterial = (data: any) => {
    if (!editingMaterial) return;
    updateMaterial({
      id: editingMaterial.id,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      estimatedCost: data.estimatedCost,
      actualCost: data.actualCost,
      status: data.status,
      supplier: data.supplier || null,
      notes: data.notes || null,
    });
    setEditingMaterial(null);
    setFormOpen(false);
  };

  const handleAISuggest = async () => {
    if (!selectedProject) {
      toast({ variant: "destructive", title: t("material.toast.error"), description: t("material.toast.selectProject") });
      return;
    }

    setAiLoading(true);
    try {
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data, error } = await supabase.functions.invoke("suggest-materials", {
        body: {
          projectTitle: selectedProject.title,
          projectDescription: selectedProject.description,
          language: i18n.language,
          country: userCountry,
        },
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
      });

      if (error) throw error;

      if (data.materials && data.materials.length > 0) {
        const materialsToAdd = data.materials.map((m: any) => ({
          projectId: selectedProjectId,
          name: m.name,
          quantity: m.quantity || 0,
          unit: m.unit || t("material.defaultUnit", { defaultValue: "pcs" }),
          estimatedCost: m.estimatedCost || 0,
          actualCost: 0,
          status: "planned",
          supplier: null,
          notes: null,
        }));

        addBulkMaterials(materialsToAdd);
        toast({ title: t("material.toast.aiTitle"), description: t("material.toast.aiAdded", { count: materialsToAdd.length }) });
      } else {
        toast({ variant: "destructive", title: t("material.toast.error"), description: t("material.toast.aiEmpty") });
      }
    } catch (error: any) {
      console.error("AI suggest error:", error);
      toast({ variant: "destructive", title: t("material.toast.error"), description: error.message || t("material.toast.aiError") });
    } finally {
      setAiLoading(false);
    }
  };

  const exportMaterialsToWord = () => {
    try {
      if (filteredMaterials.length === 0) {
        toast({ variant: "destructive", title: t("material.toast.error"), description: t("material.toast.noExportData") });
        return;
      }

      const { locale, symbol, code } = currencyMeta;
      const today = new Date().toLocaleDateString(locale);
      const formatMoney = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(value || 0);
      const statusLabel = (status: string) => {
        if (status === "planned") return t("material.planned");
        if (status === "ordered") return t("material.ordered");
        if (status === "delivered") return t("material.delivered");
        if (status === "in-use") return t("material.inUse");
        return status;
      };
      
      const htmlContent = `<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<title>${t('material.export.title')}</title>
<style>
body {
  font-family: Arial, sans-serif;
  line-height: 1.5;
  margin: 20px;
  color: #333;
}
h1 {
  text-align: center;
  margin-bottom: 10px;
  color: #2c3e50;
}
p {
  margin: 5px 0;
  text-align: center;
  color: #7f8c8d;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}
th {
  background-color: #3498db;
  color: white;
  padding: 10px;
  text-align: left;
  border: 1px solid #2980b9;
  font-weight: bold;
}
td {
  padding: 10px;
  border: 1px solid #bdc3c7;
}
tr:nth-child(even) {
  background-color: #ecf0f1;
}
.project-title {
  font-size: 14pt;
  font-weight: bold;
  margin-top: 20px;
  margin-bottom: 10px;
  padding: 10px;
  background-color: #ecf0f1;
  border-left: 4px solid #3498db;
}
.summary {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}
.summary-row:last-child {
  border-bottom: none;
}
.summary-label {
  font-weight: bold;
}
.summary-value {
  color: #27ae60;
}
</style>
</head>
<body>
<h1>${t('material.export.title')}</h1>
<p>${t('material.export.project')}: ${selectedProject?.title}</p>
<p>${t('material.export.date')}: ${today}</p>

<table>
  <thead>
    <tr>
      <th>${t('material.name')}</th>
      <th>${t('material.quantity')}</th>
      <th>${t('material.unit')}</th>
      <th>${t('material.estimatedCost')} (${code})</th>
      <th>${t('material.actualCost')} (${code})</th>
      <th>${t('material.status')}</th>
      <th>${t('material.supplier')}</th>
      <th>${t('material.notes')}</th>
    </tr>
  </thead>
  <tbody>
    ${filteredMaterials.map(m => `
    <tr>
      <td>${m.name}</td>
      <td>${m.quantity}</td>
      <td>${m.unit}</td>
      <td>${formatMoney(m.estimatedCost)}</td>
      <td>${formatMoney(m.actualCost)}</td>
      <td>${statusLabel(m.status)}</td>
      <td>${m.supplier || '-'}</td>
      <td>${m.notes || '-'}</td>
    </tr>
    `).join('')}
  </tbody>
</table>

<div class="summary">
  <div class="summary-row">
    <span class="summary-label">${t('material.totalMaterials')}:</span>
    <span class="summary-value">${filteredMaterials.length}</span>
  </div>
  <div class="summary-row">
    <span class="summary-label">${t('material.totalEstimatedCost')}:</span>
    <span class="summary-value">${formatMoney(totalEstimatedCost)}</span>
  </div>
  <div class="summary-row">
    <span class="summary-label">${t('material.totalActualCost')}:</span>
    <span class="summary-value">${formatMoney(totalActualCost)}</span>
  </div>
  <div class="summary-row">
    <span class="summary-label">${t('material.export.difference')}:</span>
    <span class="summary-value" style="color: ${totalActualCost > totalEstimatedCost ? '#e74c3c' : '#27ae60'};">${formatMoney(totalActualCost - totalEstimatedCost)}</span>
  </div>
</div>

</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "application/msword" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${t('material.export.fileName', { defaultValue: 'material-list' })}-${selectedProject?.title}-${new Date().toISOString().split('T')[0]}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: t('material.toast.exportSuccessTitle'), description: t('material.toast.exportSuccess') });
    } catch (err) {
      console.error('Materials export error:', err);
      toast({ variant: "destructive", title: t('material.toast.error'), description: t('material.toast.exportError') });
    }
  };

  const filteredMaterials = selectedProjectId 
    ? materials.filter(m => m.projectId === selectedProjectId)
    : materials;

  const totalEstimatedCost = filteredMaterials.reduce((sum, m) => sum + m.estimatedCost, 0);
  const totalActualCost = filteredMaterials.reduce((sum, m) => sum + m.actualCost, 0);

  const formatMoney = (value: number) => new Intl.NumberFormat(currencyMeta.locale, {
    style: "currency",
    currency: currencyMeta.code,
    maximumFractionDigits: 0,
  }).format(value || 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('app.materials')}</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t('material.selectProject')} />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleAISuggest}
            disabled={!selectedProjectId || aiLoading}
            className="gap-2"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t('material.aiSuggest')}
          </Button>
          <Button
            variant="outline"
            onClick={exportMaterialsToWord}
            disabled={!selectedProjectId || filteredMaterials.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('material.downloadList')}
          </Button>
          <Button
            onClick={() => {
              setEditingMaterial(null);
              setFormOpen(true);
            }}
            disabled={!selectedProjectId}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('material.add')}
          </Button>
        </div>
      </div>

      {selectedProjectId && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('material.totalMaterials')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{filteredMaterials.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('material.totalEstimatedCost')}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-primary">{formatMoney(totalEstimatedCost)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('material.totalActualCost')}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-orange-600">{formatMoney(totalActualCost)}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !selectedProjectId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('material.selectProjectFirst')}
          </CardContent>
        </Card>
      ) : filteredMaterials.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('common.noData')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map(material => (
            <MaterialItem
              key={material.id}
              {...material}
              currencySymbol={currencyMeta.symbol}
              currencyCode={currencyMeta.code}
              currencyLocale={currencyMeta.locale}
              onEdit={() => {
                setEditingMaterial(material);
                setFormOpen(true);
              }}
              onDelete={() => deleteMaterial(material.id)}
            />
          ))}
        </div>
      )}

      <MaterialForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={editingMaterial ? handleEditMaterial : handleAddMaterial}
        defaultValues={editingMaterial ? {
          name: editingMaterial.name,
          quantity: editingMaterial.quantity,
          unit: editingMaterial.unit,
          estimatedCost: editingMaterial.estimatedCost,
          actualCost: editingMaterial.actualCost,
          status: editingMaterial.status,
          supplier: editingMaterial.supplier || "",
          notes: editingMaterial.notes || "",
        } : undefined}
        title={editingMaterial ? t('material.edit') : t('material.add')}
      />
    </div>
  );
};
