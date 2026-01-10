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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { Crown, Lock, TrendingUp, Users, FolderKanban, ListTodo, DollarSign, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export const ReportsSection = () => {
  const { t } = useTranslation();
  const { isPremium, createCheckout } = useSubscription();
  const { isAdmin } = useAdmin();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { teamMembers } = useTeamMembers();

  // Admin'ler de premium özelliklere erişebilir
  const hasPremiumAccess = isPremium || isAdmin;

  const handleUpgrade = async () => {
    const url = await createCheckout(SUBSCRIPTION_TIERS.premium.price_id!);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error(t('reports.checkoutError'));
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
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
    try {
      const fontUrl = '/fonts/DejaVuSans.ttf';
      const res = await fetch(fontUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const base64 = arrayBufferToBase64(buf);
        (doc as any).addFileToVFS('DejaVuSans.ttf', base64);
        (doc as any).addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
        doc.setFont('DejaVuSans');
      } else {
        console.warn('Font not found at', fontUrl);
      }
    } catch (fontErr) {
      console.warn('Failed to load font for PDF:', fontErr);
    }

    // Title
    doc.setFontSize(20);
    doc.text("İnşaat Yönetimi Raporu", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, 28, { align: "center" });

    let yPos = 40;

    // Overview Stats
    doc.setFontSize(14);
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
            ['Toplam GöREV', totalTasks.toString()],
            ['Tamamlanan GöREV', completedTasks.toString()],
            ['Görev Tamamlama Oranı', `${taskCompletionRate}%`],
            ['Ekip Üyesi Sayısı', teamMembers.length.toString()],
          ],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
        });
      } else if ((doc as any).autoTable) {
        (doc as any).autoTable({
          startY: yPos,
          head: [['Metrik', 'Değer']],
          body: [
            ['Toplam Proje', totalProjects.toString()],
            ['Aktif Proje', activeProjects.toString()],
            ['Tamamlanan Proje', completedProjects.toString()],
            ['Toplam GöREV', totalTasks.toString()],
            ['Tamamlanan GöREV', completedTasks.toString()],
            ['Görev Tamamlama Oranı', `${taskCompletionRate}%`],
            ['Ekip Üyesi Sayısı', teamMembers.length.toString()],
          ],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
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
    doc.text("Finansal Özet", 14, yPos);
    yPos += 8;

    try {
      if (typeof (autoTable as any) === 'function') {
        (autoTable as any)(doc, {
          startY: yPos,
          head: [['Kategori', 'Tutar (₺)']],
          body: [
            ['Toplam Bütçe', totalBudget.toLocaleString('tr-TR')],
            ['Toplam Gelir', totalRevenue.toLocaleString('tr-TR')],
            ['Toplam Maliyet', totalCost.toLocaleString('tr-TR')],
            ['Net Kâr', netProfit.toLocaleString('tr-TR')],
            ['Kâr Marjı', `${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%`],
          ],
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
        });
      } else if ((doc as any).autoTable) {
        (doc as any).autoTable({
          startY: yPos,
          head: [['Kategori', 'Tutar (₺)']],
          body: [
            ['Toplam Bütçe', totalBudget.toLocaleString('tr-TR')],
            ['Toplam Gelir', totalRevenue.toLocaleString('tr-TR')],
            ['Toplam Maliyet', totalCost.toLocaleString('tr-TR')],
            ['Net Kâr', netProfit.toLocaleString('tr-TR')],
            ['Kâr Marjı', `${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%`],
          ],
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
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
      doc.text("Proje Detayları", 14, yPos);
      yPos += 8;

      try {
        if (typeof (autoTable as any) === 'function') {
          (autoTable as any)(doc, {
            startY: yPos,
            head: [['Proje', 'Durum', 'İlerleme', 'Bütçe (₺)', 'Maliyet (₺)', 'Gelir (₺)']],
            body: projects.map(p => [
              p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title,
              p.status === 'active' ? 'Aktif' : p.status === 'completed' ? 'Tamamlandı' : 'Beklemede',
              `${p.progress}%`,
              (p.budget || 0).toLocaleString('tr-TR'),
              (p.actualCost || 0).toLocaleString('tr-TR'),
              (p.revenue || 0).toLocaleString('tr-TR'),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [147, 51, 234] },
            columnStyles: {
              0: { cellWidth: 40 },
            },
          });
        } else if ((doc as any).autoTable) {
          (doc as any).autoTable({
            startY: yPos,
            head: [['Proje', 'Durum', 'İlerleme', 'Bütçe (₺)', 'Maliyet (₺)', 'Gelir (₺)']],
            body: projects.map(p => [
              p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title,
              p.status === 'active' ? 'Aktif' : p.status === 'completed' ? 'Tamamlandı' : 'Beklemede',
              `${p.progress}%`,
              (p.budget || 0).toLocaleString('tr-TR'),
              (p.actualCost || 0).toLocaleString('tr-TR'),
              (p.revenue || 0).toLocaleString('tr-TR'),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [147, 51, 234] },
            columnStyles: {
              0: { cellWidth: 40 },
            },
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
      doc.text("Ekip Üyeleri", 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['İsim', 'Uzmanlık', 'Günlük Ücret (₺)', 'Atanan Görev']],
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
        headStyles: { fillColor: [249, 115, 22] },
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
        sections.push(`PROJE DETAYLARı\n`);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('app.reports')}</h2>
          <p className="text-muted-foreground">
            {hasPremiumAccess ? t('reports.subtitlePremium') : t('reports.subtitleBasic')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPremiumAccess && (
            <Badge className="bg-primary gap-1">
              <Crown className="h-3 w-3" />
              {isAdmin ? t('reports.admin') : t('reports.premium')}
            </Badge>
          )}
          <div className="flex gap-2">
            <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              {t('reports.downloadPDF')}
            </Button>
            <Button onClick={exportToWord} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              {t('reports.downloadWord')}
            </Button>
          </div>
        </div>
      </div>

      {/* Basic Reports - Available for all */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('reports.basicReports')}
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('reports.totalProjects')}</CardDescription>
              <CardTitle className="text-3xl">{totalProjects}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {t('reports.projectDetail', { active: activeProjects, completed: completedProjects })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('reports.taskCompletion')}</CardDescription>
              <CardTitle className="text-3xl">{taskCompletionRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={taskCompletionRate} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {t('reports.taskCount', { completed: completedTasks, total: totalTasks })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('reports.teamMembers')}</CardDescription>
              <CardTitle className="text-3xl">{teamMembers.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {t('reports.teamDetail')}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('reports.totalBudget')}</CardDescription>
              <CardTitle className="text-3xl">₺{(totalBudget / 1000).toFixed(0)}K</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {t('reports.allProjects')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Status Chart - Basic */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('reports.taskStatusSummary')}</CardTitle>
            <CardDescription>{t('reports.taskStatusDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      // Render only percentage labels inside slices to avoid external overlap
                      label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
                      labelLine={false}
                    >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  {/* Use legend instead of long external labels to prevent collisions */}
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Reports - Premium Only */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          {t('reports.advancedReports')}
          {!hasPremiumAccess && (
            <Badge variant="outline" className="ml-2">{t('reports.premium')}</Badge>
          )}
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          {hasPremiumAccess ? (
            <>
              {/* Project Financial Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('reports.projectFinancialAnalysis.title')}</CardTitle>
                  <CardDescription>{t('reports.projectFinancialAnalysis.desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectFinanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar name={t('reports.labels.budget')} dataKey="budget" fill="hsl(var(--chart-1))" />
                        <Bar name={t('reports.labels.cost')} dataKey="cost" fill="hsl(var(--chart-4))" />
                        <Bar name={t('reports.labels.revenue')} dataKey="revenue" fill="hsl(var(--chart-2))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Team Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('reports.teamPerformance.title')}</CardTitle>
                  <CardDescription>{t('reports.teamPerformance.desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teamPerformanceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                        <Tooltip />
                        <Legend />
                        <Bar name={t('reports.teamPerformance.completed')} dataKey="completed" fill="hsl(var(--chart-2))" />
                        <Bar name={t('reports.teamPerformance.total')} dataKey="total" fill="hsl(var(--muted))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Profit Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('reports.profitAnalysis.title')}</CardTitle>
                  <CardDescription>{t('reports.profitAnalysis.desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">{t('reports.profitAnalysis.totalRevenue')}</span>
                      <span className="font-bold text-green-600">₺{totalRevenue.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">{t('reports.profitAnalysis.totalCost')}</span>
                      <span className="font-bold text-orange-600">₺{totalCost.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="font-medium">{t('reports.profitAnalysis.netProfit')}</span>
                      <span className={`font-bold text-xl ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₺{netProfit.toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t('reports.profitAnalysis.profitMargin')}</span>
                        <span>{totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%</span>
                      </div>
                      <Progress 
                        value={totalRevenue > 0 ? Math.max(0, (netProfit / totalRevenue) * 100) : 0} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Progress Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('reports.projectProgress.title')}</CardTitle>
                  <CardDescription>{t('reports.projectProgress.desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {projects.map(project => (
                      <div key={project.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate max-w-[200px]">{project.title}</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">{t('reports.projectProgress.empty')}</p>
                    )}
                  </div>
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
