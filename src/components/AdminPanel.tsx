import { useTranslation } from "react-i18next";
import { useAdmin } from "@/hooks/useAdmin";
import { SUBSCRIPTION_TIERS } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Crown, FolderOpen, CheckSquare, TrendingUp, Shield } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export const AdminPanel = () => {
  const { t, i18n } = useTranslation();
  const { users, stats, updateUserRole, fetchUsers } = useAdmin();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    const success = await updateUserRole(userId, newRole);
    if (success) {
      toast.success(t('admin.roleUpdated') || 'Rol güncellendi');
    } else {
      toast.error(t('admin.roleUpdateError') || 'Rol güncellenirken hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">{t('admin.title') || 'Yönetici Paneli'}</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.totalUsers') || 'Toplam Kullanıcı'}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.premiumUsers') || 'Premium Kullanıcılar'}</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.premiumUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.totalProjects') || 'Toplam Proje'}</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.totalTasks') || 'Toplam Görev'}</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Pricing Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('admin.planPricing') || 'Plan Fiyatlandırması'}
          </CardTitle>
          <CardDescription>
            {t('admin.planPricingDesc') || 'Mevcut plan fiyatları ve özellikleri'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard Plan */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {SUBSCRIPTION_TIERS.standard.name}
                  <Badge variant="secondary">{t('admin.freePlan') || 'Ücretsiz'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">
                  {formatCurrency(SUBSCRIPTION_TIERS.standard.price)}
                  <span className="text-sm font-normal text-muted-foreground">/{t('finance.month') || 'ay'}</span>
                </div>
                <ul className="space-y-2">
                  {SUBSCRIPTION_TIERS.standard.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {SUBSCRIPTION_TIERS.premium.name}
                  <Badge className="bg-primary">{t('admin.paidPlan') || 'Ücretli'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">
                  {formatCurrency(SUBSCRIPTION_TIERS.premium.price)}
                  <span className="text-sm font-normal text-muted-foreground">/{t('finance.month') || 'ay'}</span>
                </div>
                <ul className="space-y-2">
                  {SUBSCRIPTION_TIERS.premium.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('admin.userManagement') || 'Kullanıcı Yönetimi'}
          </CardTitle>
          <CardDescription>
            {t('admin.userManagementDesc') || 'Kayıtlı kullanıcıları görüntüle ve yönet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.email') || 'E-posta'}</TableHead>
                <TableHead>{t('admin.name') || 'İsim'}</TableHead>
                <TableHead>{t('admin.role') || 'Rol'}</TableHead>
                <TableHead>{t('admin.subscription') || 'Abonelik'}</TableHead>
                <TableHead>{t('admin.registeredAt') || 'Kayıt Tarihi'}</TableHead>
                <TableHead>{t('admin.actions') || 'İşlemler'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.full_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role === 'admin' ? (
                        <><Shield className="h-3 w-3 mr-1" /> Admin</>
                      ) : (
                        'Kullanıcı'
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.subscribed ? 'default' : 'outline'}>
                      {u.subscribed ? 'Premium' : 'Standard'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(u.created_at).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(value: 'admin' | 'user') => handleRoleChange(u.id, value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Kullanıcı</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('common.noData') || 'Veri bulunamadı'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
