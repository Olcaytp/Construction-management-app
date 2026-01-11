import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInvoices, WORK_TYPES } from "@/hooks/useInvoices";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InvoiceForm } from "@/components/InvoiceForm";
import { CheckCircle, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Project {
  id: string;
  title: string;
}

interface InvoicesSectionProps {
  projects: Project[];
}

export const InvoicesSection = ({ projects }: InvoicesSectionProps) => {
  const { t, i18n } = useTranslation();
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || "");
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const { invoices, isLoading, createInvoice, deleteInvoice, approveInvoice } = useInvoices(selectedProjectId);
  const { teamMembers } = useTeamMembers();

  const formatCurrency = (amount: number) => {
    const lang = i18n.language;
    const isSv = lang.startsWith('sv');
    const isEn = lang.startsWith('en');
    const locale = isSv ? 'sv-SE' : isEn ? 'en-US' : 'tr-TR';
    const symbol = isSv ? 'kr' : isEn ? '$' : '₺';
    const symbolAtEnd = isSv;
    const formatted = amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return symbolAtEnd ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
  };

  const getWorkerName = (workerId?: string) => {
    if (!workerId) return "-";
    return teamMembers.find((m) => m.id === workerId)?.name || "-";
  };

  const getWorkTypeLabel = (workType: string) => {
    return t(`invoice.workTypes.${workType}`, { defaultValue: WORK_TYPES.find((t) => t.value === workType)?.label || workType });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return { label: t('invoice.status.pending'), variant: "secondary" as const };
      case "approved":
        return { label: t('invoice.status.approved'), variant: "default" as const };
      case "invoiced":
        return { label: t('invoice.status.invoiced'), variant: "outline" as const };
      default:
        return { label: status, variant: "secondary" as const };
    }
  };

  const totalPending = invoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + inv.total_amount, 0);

  const totalApproved = invoices
    .filter((inv) => inv.status === "approved")
    .reduce((sum, inv) => sum + inv.total_amount, 0);

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);

  const exportToCSV = () => {
    if (invoices.length === 0) {
      toast.error(t('invoice.export.none'));
      return;
    }

    let csv = `${t('invoice.table.workType')},${t('invoice.table.quantity')},${t('invoice.table.unit')},${t('invoice.table.unitPrice')} (${t('invoice.currency')}),${t('invoice.table.total')} (${t('invoice.currency')}),${t('invoice.table.status')},${t('invoice.table.description')}\n`;
    invoices.forEach((inv) => {
      csv += `"${inv.work_type_label}",${inv.quantity},"${inv.unit}",${inv.unit_price},${inv.total_amount},"${getStatusLabel(inv.status).label}","${inv.description || ''}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `invoice-${selectedProject?.title}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success(t('invoice.export.csv'));
  };

  const exportToPDF = async () => {
    if (invoices.length === 0) {
      toast.error(t('invoice.export.none'));
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Try to load Turkish font
    try {
      const fontUrl = "/fonts/DejaVuSans.ttf";
      const res = await fetch(fontUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        (doc as any).addFileToVFS("DejaVuSans.ttf", base64);
        (doc as any).addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
        doc.setFont("DejaVuSans");
      }
    } catch (err) {
      console.warn("Font loading failed:", err);
    }

    // Title
    doc.setFontSize(18);
    doc.text(t('invoice.pdf.title'), pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(12);
    doc.text(`${t('invoice.pdf.project')}: ${selectedProject?.title}`, pageWidth / 2, 22, { align: "center" });

    doc.setFontSize(10);
    doc.text(`${t('invoice.pdf.date')}: ${new Date().toLocaleDateString(i18n.language)}`, pageWidth / 2, 28, { align: "center" });

    // Table
    try {
      autoTable(doc, {
        startY: 35,
        head: [[
          t('invoice.table.workType'),
          t('invoice.table.quantity'),
          t('invoice.table.unit'),
          `${t('invoice.table.unitPrice')} (${t('invoice.currency')})`,
          `${t('invoice.table.total')} (${t('invoice.currency')})`,
          t('invoice.table.status')
        ]],
        body: invoices.map((inv) => [
          inv.work_type_label,
          inv.quantity.toLocaleString(i18n.language),
          inv.unit,
          inv.unit_price.toLocaleString(i18n.language),
          inv.total_amount.toLocaleString(i18n.language),
          getStatusLabel(inv.status).label,
        ]),
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
      });

      let yPos = (doc as any).lastAutoTable?.finalY || 100;

      // Summary
      doc.setFontSize(12);
      doc.text(t('invoice.summary.title'), 14, yPos + 10);

      autoTable(doc, {
        startY: yPos + 15,
        head: [[t('invoice.summary.category'), `${t('invoice.summary.amount')} (${t('invoice.currency')})`]],
        body: [
          [t('invoice.status.pending'), totalPending.toLocaleString(i18n.language)],
          [t('invoice.status.approved'), totalApproved.toLocaleString(i18n.language)],
          [t('invoice.summary.total'), totalAmount.toLocaleString(i18n.language)],
        ],
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94] },
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error(t('invoice.export.pdfError'));
      return;
    }

    doc.save(`invoice-${selectedProject?.title}-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success(t('invoice.export.pdf'));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{t('invoice.title')}</h2>
          </div>
          <InvoiceForm projectId={selectedProjectId} onSubmit={(data) => createInvoice.mutate(data)} />
        </div>
        
        {/* Project Selection */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t('invoice.project')}:</span>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={t('invoice.form.projectPlaceholder') || "Proje seçin"} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('invoice.status.pending')}</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{formatCurrency(totalPending)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {t('invoice.count', { count: invoices.filter((i) => i.status === "pending").length })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('invoice.status.approved')}</CardDescription>
            <CardTitle className="text-3xl text-green-600">{formatCurrency(totalApproved)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {t('invoice.count', { count: invoices.filter((i) => i.status === "approved").length })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('invoice.total')}</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{formatCurrency(totalAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">{t('invoice.countRecords', { count: invoices.length })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
            <div>
              <CardTitle className="text-lg sm:text-xl">{t('invoice.list.title')}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t('invoice.list.subtitle')}</CardDescription>
            </div>
            <div className="flex gap-2 flex-col sm:flex-row">
              <Button variant="outline" size="sm" onClick={exportToCSV} className="text-xs sm:text-sm">
                {t('invoice.actions.csv')}
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2 text-xs sm:text-sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('invoice.actions.pdf')}</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">{t('invoice.loading')}</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('invoice.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">{t('invoice.table.project')}</TableHead>
                    <TableHead className="text-xs sm:text-sm">{t('invoice.table.workType')}</TableHead>
                    <TableHead className="text-xs sm:text-sm">{t('invoice.table.worker')}</TableHead>
                    <TableHead className="text-xs sm:text-sm">{t('invoice.table.quantity')}</TableHead>
                    <TableHead className="text-xs sm:text-sm">{t('invoice.table.unitPrice')}</TableHead>
                    <TableHead className="text-xs sm:text-sm">{t('invoice.table.total')}</TableHead>
                    <TableHead className="text-xs sm:text-sm">{t('invoice.table.status')}</TableHead>
                    <TableHead className="text-xs sm:text-sm">{t('invoice.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-xs sm:text-sm font-medium text-blue-600">{selectedProject?.title}</TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm">{getWorkTypeLabel(invoice.work_type)}</TableCell>
                      <TableCell className="text-xs sm:text-sm font-medium">{getWorkerName(invoice.assigned_to)}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {invoice.quantity} {invoice.unit}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{formatCurrency(invoice.unit_price)}</TableCell>
                      <TableCell className="font-bold text-xs sm:text-sm">
                        {formatCurrency(invoice.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusLabel(invoice.status).variant} className="text-xs">
                          {getStatusLabel(invoice.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 sm:gap-2 flex-col sm:flex-row">
                          {invoice.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => approveInvoice.mutate(invoice.id)}
                              className="gap-1 text-xs h-7 sm:h-9 px-2"
                            >
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="hidden sm:inline">{t('invoice.actions.approve')}</span>
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1 text-red-600 hover:text-red-700 text-xs h-7 sm:h-9 px-2">
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="hidden sm:inline">{t('invoice.actions.delete')}</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('invoice.delete.title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('invoice.delete.description')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="flex gap-2 justify-end">
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteInvoice.mutate(invoice.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
