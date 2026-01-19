import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/hooks/useSubscription";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { Crown, Lock, TrendingUp, Users, FolderKanban, ListTodo, DollarSign, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export const ReportsSection = () => {
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projects.length > 0 ? projects[0]?.id || null : null
  );
  const { t } = useTranslation();
  const { isPremium, createCheckout } = useSubscription();
  const { isAdmin } = useAdmin();
  const { tasks } = useTasks();
  const { teamMembers } = useTeamMembers();

  // Admin'ler de premium özelliklere erişebilir
  const hasPremiumAccess = isPremium || isAdmin;

  const handleUpgrade = async () => {
    const url = await createCheckout(SUBSCRIPTION_TIERS.premium_monthly.price_id!);
    if (url) {
      // Open in same tab to preserve session
      window.location.href = url;
    } else {
      toast.error(t('reports.checkoutError'));
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: false,
    });
    const pageWidth = doc.internal.pageSize.getWidth();

    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    // Try to load a Turkish-capable TTF from public/fonts/DejaVuSans.ttf
    let fontLoaded = false;
    try {
      const fontUrl = '/fonts/DejaVuSans.ttf';
      const res = await fetch(fontUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const base64 = arrayBufferToBase64(buf);
        (doc as any).addFileToVFS('DejaVuSans.ttf', base64);
        // Add font with Identity-H encoding for Unicode support (Turkish characters)
        (doc as any).addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal', 'Identity-H');
        doc.setFont('DejaVuSans', 'normal');
        fontLoaded = true;
      } else {
        console.warn('Font not found at', fontUrl);
      }
    } catch (fontErr) {
      console.warn('Failed to load font for PDF:', fontErr);
    }

    // If font not loaded, try helvetica fallback
    if (!fontLoaded) {
      doc.setFont('helvetica', 'normal');
    }

    // Title
    doc.setFontSize(20);
    doc.text("İnşaat Yönetimi Raporu", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, 28, { align: "center" });

    let yPos = 40;

    // Overview Stats
    doc.setFontSize(14);
    if (fontLoaded) doc.setFont('DejaVuSans', 'normal');
    doc.text("Genel Özet", 14, yPos);
    yPos += 8;

    try {
      if (typeof (autoTable as any) === 'function') {
        (autoTable as any)(doc, {
          startY: yPos,
          head: [['Metrik', 'Değer']],
          body: [
            ['Toplam Proje', totalProjects.toString()],
            ['Aktif Proje', activeProjects.toString()],
            ['Tamamlanan Proje', completedProjects.toString()],
            ['Toplam Görev', totalTasks.toString()],
            ['Tamamlanan Görev', completedTasks.toString()],
            ['Görev Tamamlama Oranı', `${taskCompletionRate}%`],
            ['Ekip Üyesi Sayısı', teamMembers.length.toString()],
          ],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246], font: 'DejaVuSans', fontStyle: 'normal' },
          bodyStyles: { font: 'DejaVuSans', fontStyle: 'normal' },
          didik: 'DejaVuSans',
        });
      } else if ((doc as any).autoTable) {
        (doc as any).autoTable({
          startY: yPos,
          head: [['Metrik', 'Değer']],
          body: [
            ['Toplam Proje', totalProjects.toString()],
            ['Aktif Proje', activeProjects.toString()],
            ['Tamamlanan Proje', completedProjects.toString()],
            ['Toplam Görev', totalTasks.toString()],
            ['Tamamlanan Görev', completedTasks.toString()],
            ['Görev Tamamlama Oranı', `${taskCompletionRate}%`],
            ['Ekip Üyesi Sayısı', teamMembers.length.toString()],
          ],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246], font: 'DejaVuSans', fontStyle: 'normal' },
          bodyStyles: { font: 'DejaVuSans', fontStyle: 'normal' },
          didik: 'DejaVuSans',
        });
      } else {
        throw new Error('autoTable not available');
      }

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 60;
    } catch (err) {
      console.error('PDF autoTable error:', err);
      toast.error('PDF oluşturulamadı: tablo oluşturma hatası. Konsolu kontrol edin.');
      return;
    }

    // Financial Summary
    doc.setFontSize(14);
    if (fontLoaded) doc.setFont('DejaVuSans', 'normal');
    doc.text("Finansal Özet", 14, yPos);
    yPos += 8;

    try {
      if (typeof (autoTable as any) === 'function') {
        (autoTable as any)(doc, {
          startY: yPos,
          head: [['Kategori', 'Tutar']],
          body: [
            ['Toplam Bütçe', totalBudget.toLocaleString('tr-TR')],
            ['Toplam Gelir', totalRevenue.toLocaleString('tr-TR')],
            ['Toplam Maliyet', totalCost.toLocaleString('tr-TR')],
            ['Net Kâr', netProfit.toLocaleString('tr-TR')],
            ['Kâr Marjı', `${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%`],
          ],
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94], font: 'DejaVuSans' },
          bodyStyles: { font: 'DejaVuSans' },
        });
      } else if ((doc as any).autoTable) {
        (doc as any).autoTable({
          startY: yPos,
          head: [['Kategori', 'Tutar']],
          body: [
            ['Toplam Bütçe', totalBudget.toLocaleString('tr-TR')],
            ['Toplam Gelir', totalRevenue.toLocaleString('tr-TR')],
            ['Toplam Maliyet', totalCost.toLocaleString('tr-TR')],
            ['Net Kâr', netProfit.toLocaleString('tr-TR')],
            ['Kâr Marjı', `${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%`],
          ],
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94], font: 'DejaVuSans' },
          bodyStyles: { font: 'DejaVuSans' },
        });
      } else {
        throw new Error('autoTable not available');
      }

      yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 60;
    } catch (err) {
      console.error('PDF autoTable error:', err);
      toast.error('PDF oluşturulamadı: tablo oluşturma hatası. Konsolu kontrol edin.');
      return;
    }

    // Project Details
    if (projects.length > 0) {
      doc.setFontSize(14);
      if (fontLoaded) doc.setFont('DejaVuSans', 'normal');
      doc.text("Proje Detayları", 14, yPos);
      yPos += 8;

      try {
        if (typeof (autoTable as any) === 'function') {
          (autoTable as any)(doc, {
            startY: yPos,
            head: [['Proje', 'Durum', 'İlerleme', 'Bütçe', 'Maliyet', 'Gelir']],
            body: projects.map(p => [
              p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title,
              p.status === 'active' ? 'Aktif' : p.status === 'completed' ? 'Tamamlandı' : 'Beklemede',
              `${p.progress}%`,
              (p.budget || 0).toLocaleString('tr-TR'),
              (p.actualCost || 0).toLocaleString('tr-TR'),
              (p.revenue || 0).toLocaleString('tr-TR'),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [147, 51, 234], font: 'DejaVuSans', fontStyle: 'normal' },
            bodyStyles: { font: 'DejaVuSans', fontStyle: 'normal' },
            columnStyles: {
              0: { cellWidth: 40 },
            },
            didik: 'DejaVuSans',
          });
        } else if ((doc as any).autoTable) {
          (doc as any).autoTable({
            startY: yPos,
            head: [['Proje', 'Durum', 'İlerleme', 'Bütçe', 'Maliyet', 'Gelir']],
            body: projects.map(p => [
              p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title,
              p.status === 'active' ? 'Aktif' : p.status === 'completed' ? 'Tamamlandı' : 'Beklemede',
              `${p.progress}%`,
              (p.budget || 0).toLocaleString('tr-TR'),
              (p.actualCost || 0).toLocaleString('tr-TR'),
              (p.revenue || 0).toLocaleString('tr-TR'),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [147, 51, 234], font: 'DejaVuSans', fontStyle: 'normal' },
            bodyStyles: { font: 'DejaVuSans', fontStyle: 'normal' },
            columnStyles: {
              0: { cellWidth: 40 },
            },
            didik: 'DejaVuSans',
          });
        } else {
          throw new Error('autoTable not available');
        }

        yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 15 : yPos + 60;
      } catch (err) {
        console.error('PDF autoTable error:', err);
        toast.error('PDF oluşturulamadı: tablo oluşturma hatası. Konsolu kontrol edin.');
        return;
      }
    }

    // Team Members
    if (teamMembers.length > 0 && yPos < 250) {
      doc.setFontSize(14);
      if (fontLoaded) doc.setFont('DejaVuSans', 'normal');
      doc.text("Ekip Üyeleri", 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['İsim', 'Uzmanlık', 'Günlük Ücret', 'Atanan Görev']],
        body: teamMembers.map(m => {
          const memberTasks = tasks.filter(t => t.assignedTo === m.id);
          return [
            m.name,
            m.specialty,
            (m.dailyWage || 0).toLocaleString('tr-TR'),
            memberTasks.length.toString(),
          ];
        }),
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22], font: 'DejaVuSans', fontStyle: 'normal' },
        bodyStyles: { font: 'DejaVuSans', fontStyle: 'normal' },
        didik: 'DejaVuSans',
      });
    }

    // Save PDF
    doc.save(`insaat-raporu-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Rapor PDF olarak indirildi!");
  };

  const exportToWord = () => {
    try {
      // Prepare data as clean text
      const today = new Date().toLocaleDateString('tr-TR');
      
      const sections = [
        `İNŞAAT YÖNETİMİ RAPORU\nOluşturulma Tarihi: ${today}\n\n`,
        
        `GENEL ÖZET\n`,
        `Toplam Proje: ${totalProjects}`,
        `Aktif Proje: ${activeProjects}`,
        `Tamamlanan Proje: ${completedProjects}`,
        `Toplam Görev: ${totalTasks}`,
        `Tamamlanan Görev: ${completedTasks}`,
        `Görev Tamamlama Oranı: ${taskCompletionRate}%`,
        `Ekip Üyesi Sayısı: ${teamMembers.length}\n\n`,
        
        `FİNANSAL ÖZET\n`,
        `Toplam Bütçe: ₺${totalBudget.toLocaleString('tr-TR')}`,
        `Toplam Gelir: ₺${totalRevenue.toLocaleString('tr-TR')}`,
        `Toplam Maliyet: ₺${totalCost.toLocaleString('tr-TR')}`,
        `Net Kâr: ₺${netProfit.toLocaleString('tr-TR')}`,
        `Kâr Marjı: ${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%\n\n`,
      ];

      if (projects.length > 0) {
        sections.push(`PROJE DETAYLARI\n`);
        projects.forEach(p => {
          sections.push(`Proje: ${p.title}`);
          sections.push(`  Durum: ${p.status === 'active' ? 'Aktif' : p.status === 'completed' ? 'Tamamlandı' : 'Beklemede'}`);
          sections.push(`  İlerleme: ${p.progress}%`);
          sections.push(`  Bütçe: ₺${(p.budget || 0).toLocaleString('tr-TR')}`);
          sections.push(`  Maliyet: ₺${(p.actualCost || 0).toLocaleString('tr-TR')}`);
          sections.push(`  Gelir: ₺${(p.revenue || 0).toLocaleString('tr-TR')}`);
          sections.push(``);
        });
        sections.push(`\n`);
      }

      if (teamMembers.length > 0) {
        sections.push(`EKİP ÜYELERİ\n`);
        teamMembers.forEach(m => {
          const memberTasks = tasks.filter(t => t.assignedTo === m.id);
          sections.push(`Üye: ${m.name}`);
          sections.push(`  Uzmanlık: ${m.specialty}`);
          sections.push(`  Günlük Ücret: ₺${(m.dailyWage || 0).toLocaleString('tr-TR')}`);
          sections.push(`  Atanan Görev: ${memberTasks.length}`);
          sections.push(``);
        });
      }

      const textContent = sections.join('\n');

      // Create HTML document for Word compatibility
      const htmlContent = `<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<title>İnşaat Raporu</title>
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
}
p {
  margin: 5px 0;
}
.section {
  margin-top: 20px;
  page-break-inside: avoid;
}
.section-title {
  font-weight: bold;
  font-size: 14pt;
  margin-top: 15px;
  margin-bottom: 10px;
  border-bottom: 2px solid #3b82f6;
  padding-bottom: 5px;
}
.data-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
}
</style>
</head>
<body>
<h1>İnşaat Yönetimi Raporu</h1>
<p style="text-align: center; color: #666;">Oluşturulma Tarihi: ${today}</p>

<div class="section">
<div class="section-title">Genel Özet</div>
<div class="data-row"><span>Toplam Proje:</span><span>${totalProjects}</span></div>
<div class="data-row"><span>Aktif Proje:</span><span>${activeProjects}</span></div>
<div class="data-row"><span>Tamamlanan Proje:</span><span>${completedProjects}</span></div>
<div class="data-row"><span>Toplam Görev:</span><span>${totalTasks}</span></div>
<div class="data-row"><span>Tamamlanan Görev:</span><span>${completedTasks}</span></div>
<div class="data-row"><span>Görev Tamamlama Oranı:</span><span>${taskCompletionRate}%</span></div>
<div class="data-row"><span>Ekip Üyesi Sayısı:</span><span>${teamMembers.length}</span></div>
</div>

<div class="section">
<div class="section-title">Finansal Özet</div>
<div class="data-row"><span>Toplam Bütçe:</span><span>₺${totalBudget.toLocaleString('tr-TR')}</span></div>
<div class="data-row"><span>Toplam Gelir:</span><span>₺${totalRevenue.toLocaleString('tr-TR')}</span></div>
<div class="data-row"><span>Toplam Maliyet:</span><span>₺${totalCost.toLocaleString('tr-TR')}</span></div>
<div class="data-row"><span>Net Kâr:</span><span>₺${netProfit.toLocaleString('tr-TR')}</span></div>
<div class="data-row"><span>Kâr Marjı:</span><span>${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%</span></div>
</div>

${projects.length > 0 ? `
<div class="section">
<div class="section-title">Proje Detayları</div>
${projects.map(p => `
<div style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;">
<p style="margin: 0;"><strong>${p.title}</strong></p>
<p style="margin: 5px 0; color: #666;">Durum: ${p.status === 'active' ? 'Aktif' : p.status === 'completed' ? 'Tamamlandı' : 'Beklemede'}</p>
<p style="margin: 5px 0; color: #666;">İlerleme: ${p.progress}%</p>
<p style="margin: 5px 0; color: #666;">Bütçe: ₺${(p.budget || 0).toLocaleString('tr-TR')}</p>
<p style="margin: 5px 0; color: #666;">Maliyet: ₺${(p.actualCost || 0).toLocaleString('tr-TR')}</p>
<p style="margin: 5px 0; color: #666;">Gelir: ₺${(p.revenue || 0).toLocaleString('tr-TR')}</p>
</div>
`).join('')}
</div>
` : ''}

${teamMembers.length > 0 ? `
<div class="section">
<div class="section-title">Ekip Üyeleri</div>
${teamMembers.map(m => {
  const memberTasks = tasks.filter(t => t.assignedTo === m.id);
  return `
<div style="background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;">
<p style="margin: 0;"><strong>${m.name}</strong></p>
<p style="margin: 5px 0; color: #666;">Uzmanlık: ${m.specialty}</p>
<p style="margin: 5px 0; color: #666;">Günlük Ücret: ₺${(m.dailyWage || 0).toLocaleString('tr-TR')}</p>
<p style="margin: 5px 0; color: #666;">Atanan Görev: ${memberTasks.length}</p>
</div>
`;
}).join('')}
</div>
` : ''}

</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "application/msword" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `insaat-raporu-${new Date().toISOString().split('T')[0]}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Rapor Word olarak indirildi!");
    } catch (err) {
      console.error('Word export error:', err);
      toast.error('Word raporu oluşturulamadı');
    }
  };

  // Basic stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Financial stats
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalRevenue = projects.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalCost = projects.reduce((sum, p) => sum + (p.actualCost || 0), 0);
  const netProfit = totalRevenue - totalCost;

  // Chart data
  const taskStatusData = [
    { name: t('reports.status.completed'), value: completedTasks, color: 'hsl(var(--chart-2))' },
    { name: t('reports.status.inProgress'), value: inProgressTasks, color: 'hsl(var(--primary))' },
    { name: t('reports.status.pending'), value: pendingTasks, color: 'hsl(var(--chart-4))' },
  ];

  const projectStatusData = [
    { name: 'Aktif', value: activeProjects },
    { name: 'Tamamlandı', value: completedProjects },
    { name: 'Beklemede', value: projects.filter(p => p.status === 'on-hold').length },
  ];

  const projectFinanceData = projects.slice(0, 5).map(p => ({
    name: p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title,
    budget: p.budget || 0,
    cost: p.actualCost || 0,
    revenue: p.revenue || 0,
  }));

  const teamPerformanceData = teamMembers.map(member => {
    const memberTasks = tasks.filter(t => t.assignedTo === member.id);
    const memberCompletedTasks = memberTasks.filter(t => t.status === 'completed').length;
    return {
      name: member.name.length > 10 ? member.name.substring(0, 10) + '...' : member.name,
      completed: memberCompletedTasks,
      total: memberTasks.length,
    };
  });

  const LockedFeature = ({ title, description }: { title: string; description: string }) => (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-center p-4">
          <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground mb-2">{t('reports.premiumFeature')}</p>
          <Button size="sm" onClick={handleUpgrade} className="gap-2">
            <Crown className="h-4 w-4" />
            {t('reports.upgrade')}
          </Button>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-48 bg-muted/20" />
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{t('app.reports')}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            {hasPremiumAccess ? t('reports.subtitlePremium') : t('reports.subtitleBasic')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {hasPremiumAccess && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isAdmin ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200' : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200'}`}>
              <Crown className="h-3 w-3" />
              {isAdmin ? t('reports.admin') : t('reports.premium')}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-950">
              <Download className="h-4 w-4" />
              {t('reports.downloadPDF')}
            </Button>
            <Button onClick={exportToWord} variant="outline" size="sm" className="gap-2 text-xs hover:bg-orange-50 dark:hover:bg-orange-950">
              <Download className="h-4 w-4" />
              {t('reports.downloadWord')}
            </Button>
          </div>
        </div>
      </div>

      {/* Basic Reports - Available for all */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
          {t('reports.basicReports')}
        </h3>
        
        <div className="flex flex-wrap gap-4 sm:gap-6 items-center justify-center p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-muted-foreground">{t('reports.totalProjects')}:</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalProjects}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-muted-foreground">Aktif Görevler:</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">{inProgressTasks}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-muted-foreground">Tamamlanan Görevler:</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">{completedTasks}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-muted-foreground">{t('reports.teamMembers')}:</span>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{teamMembers.length}</span>
          </div>
        </div>

        {/* Task Status Chart - Basic */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold">{t('reports.taskStatusSummary')}</CardTitle>
            <CardDescription>{t('reports.taskStatusDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="lg:col-span-1 h-48 lg:h-auto flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
                      labelLine={false}
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="lg:col-span-2 space-y-3">
                {taskStatusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-base">{item.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {totalTasks > 0 ? Math.round((item.value / totalTasks) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Reports - Premium Only */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
          <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
          {t('reports.advancedReports')}
          {!hasPremiumAccess && (
            <Badge variant="outline" className="ml-2 text-xs">{t('reports.premium')}</Badge>
          )}
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          {hasPremiumAccess ? (
            <>
              {/* Project Financial Status - Single Project */}
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex flex-col gap-3">
                    <div>
                      <CardTitle className="text-lg font-bold">{t('reports.projectFinancialAnalysis.title')}</CardTitle>
                      <CardDescription className="text-xs">{t('reports.projectFinancialAnalysis.desc')}</CardDescription>
                    </div>
                    <Select 
                      value={selectedProjectId || (projects.length > 0 ? projects[0]?.id : "")}
                      onValueChange={setSelectedProjectId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Proje seçin..." />
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
                </CardHeader>
                <CardContent>
                  {projects.length > 0 ? (
                    <div className="space-y-4">
                      {(() => {
                        const currentProjectId = selectedProjectId || projects[0]?.id;
                        const currentProject = projects.find(p => p.id === currentProjectId);
                        
                        if (!currentProject) return null;
                        
                        return (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
                                <p className="text-xs font-medium text-muted-foreground mb-1">{t('reports.labels.budget')}</p>
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">₺{(currentProject.budget || 0).toLocaleString('tr-TR')}</p>
                              </div>
                              <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg border border-orange-100 dark:border-orange-900">
                                <p className="text-xs font-medium text-muted-foreground mb-1">{t('reports.labels.cost')}</p>
                                <p className="text-lg font-bold text-orange-700 dark:text-orange-300">₺{(currentProject.actualCost || 0).toLocaleString('tr-TR')}</p>
                              </div>
                              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-100 dark:border-green-900">
                                <p className="text-xs font-medium text-muted-foreground mb-1">{t('reports.labels.revenue')}</p>
                                <p className="text-lg font-bold text-green-700 dark:text-green-300">₺{(currentProject.revenue || 0).toLocaleString('tr-TR')}</p>
                              </div>
                            </div>
                            
                            <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4 space-y-3">
                              <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                                <span className="text-xs sm:text-sm font-medium text-muted-foreground">{t('reports.labels.netProfit')}</span>
                                <span className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400">
                                  ₺{((currentProject.revenue || 0) - (currentProject.actualCost || 0)).toLocaleString('tr-TR')}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                                <span className="text-xs sm:text-sm font-medium text-muted-foreground">{t('reports.labels.profitMargin')}</span>
                                <span className="text-sm sm:text-base font-bold">
                                  {currentProject.revenue && currentProject.revenue > 0
                                    ? Math.round((((currentProject.revenue || 0) - (currentProject.actualCost || 0)) / (currentProject.revenue || 1)) * 100)
                                    : 0}%
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                                <span className="text-xs sm:text-sm font-medium text-muted-foreground">{t('reports.labels.projectProgress')}</span>
                                <span className="text-sm sm:text-base font-bold">{currentProject.progress}%</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">{t('common.noData')}</div>
                  )}
                </CardContent>
              </Card>

              {/* Team Performance */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{t('reports.teamPerformance.title')}</CardTitle>
                  <CardDescription className="text-xs">{t('reports.teamPerformance.desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {teamPerformanceData.length > 0 ? (
                    <div className="space-y-3">
                      {teamPerformanceData.map((member, index) => {
                        const completionRate = member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0;
                        return (
                          <div key={index} className="space-y-2 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-primary">{index + 1}</span>
                                </div>
                                <span className="text-sm font-semibold truncate">{member.name}</span>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-base font-bold text-green-600 dark:text-green-400">{completionRate}%</p>
                                <p className="text-xs text-muted-foreground">{member.completed}/{member.total}</p>
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all bg-gradient-to-r from-blue-500 to-green-500"
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg">
                      <div className="text-center">
                        <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">{t('reports.projectProgress.empty')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Profit Analysis */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{t('reports.profitAnalysis.title')}</CardTitle>
                  <CardDescription className="text-xs">{t('reports.profitAnalysis.desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const currentProjectId = selectedProjectId || (projects.length > 0 ? projects[0]?.id : null);
                    const currentProject = projects.find(p => p.id === currentProjectId);
                    
                    if (!currentProject) {
                      return <div className="text-center py-6 text-muted-foreground">{t('common.noData')}</div>;
                    }
                    
                    const projectRevenue = currentProject.revenue || 0;
                    const projectCost = currentProject.actualCost || 0;
                    const projectProfit = projectRevenue - projectCost;
                    const projectMargin = projectRevenue > 0 ? Math.round((projectProfit / projectRevenue) * 100) : 0;
                    const isProfit = projectProfit >= 0;
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-muted">
                          <span className="text-sm font-medium text-muted-foreground">{t('reports.profitAnalysis.totalRevenue')}</span>
                          <span className="font-bold text-green-600 dark:text-green-400">₺{projectRevenue.toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-muted">
                          <span className="text-sm font-medium text-muted-foreground">{t('reports.profitAnalysis.totalCost')}</span>
                          <span className="font-bold text-orange-600 dark:text-orange-400">₺{projectCost.toLocaleString('tr-TR')}</span>
                        </div>
                        <div className={`flex justify-between items-center p-3 rounded-lg border-2 ${isProfit ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}`}>
                          <span className={`font-bold text-sm ${isProfit ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{t('reports.profitAnalysis.netProfit')}</span>
                          <span className={`font-bold text-xl ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            ₺{projectProfit.toLocaleString('tr-TR')}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">{t('reports.profitAnalysis.profitMargin')}</span>
                            <span className={`font-bold ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>{projectMargin}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${isProfit ? 'bg-green-500' : 'bg-orange-500'}`}
                              style={{ width: `${Math.max(0, Math.min(100, projectMargin))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Project Progress Overview - Single Project */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{t('reports.projectProgress.title')}</CardTitle>
                  <CardDescription className="text-xs">{t('reports.projectProgress.desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const currentProjectId = selectedProjectId || (projects.length > 0 ? projects[0]?.id : null);
                    const currentProject = projects.find(p => p.id === currentProjectId);
                    
                    if (!currentProject) {
                      return <p className="text-muted-foreground text-center py-4">{t('reports.projectProgress.empty')}</p>;
                    }
                    
                    const progressPercentage = currentProject.progress || 0;
                    const budgetUsage = currentProject.budget && currentProject.budget > 0
                      ? Math.round(((currentProject.actualCost || 0) / currentProject.budget) * 100)
                      : 0;
                    
                    return (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium text-sm">{currentProject.title}</span>
                            <span className="font-bold text-sm">{progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all bg-gradient-to-r from-orange-500 to-green-500"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="border-t pt-4 space-y-3">
                          <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                            <span className="text-sm text-muted-foreground">Durum:</span>
                            <Badge variant={currentProject.status === 'active' ? 'default' : currentProject.status === 'completed' ? 'secondary' : 'outline'} className="text-xs">
                              {currentProject.status === 'active' ? 'Aktif' : currentProject.status === 'completed' ? 'Tamamlandı' : 'Beklemede'}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                            <span className="text-sm text-muted-foreground">Bütçe Kullanımı:</span>
                            <span className={`font-bold text-sm ${budgetUsage > 80 ? 'text-orange-600' : budgetUsage > 100 ? 'text-red-600' : 'text-green-600'}`}>
                              {budgetUsage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <LockedFeature 
                title={t('reports.projectFinancialAnalysis.title')} 
                description={t('reports.projectFinancialAnalysis.desc')} 
              />
              <LockedFeature 
                title={t('reports.teamPerformance.title')} 
                description={t('reports.teamPerformance.desc')} 
              />
              <LockedFeature 
                title={t('reports.profitAnalysis.title')} 
                description={t('reports.profitAnalysis.desc')} 
              />
              <LockedFeature 
                title={t('reports.projectProgress.title')} 
                description={t('reports.projectProgress.desc')} 
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
