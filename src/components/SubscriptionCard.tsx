import { useTranslation } from "react-i18next";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Check, Calendar, CreditCard, Settings, Lock, Shield, Headphones, X } from "lucide-react";
import { toast } from "sonner";

export const SubscriptionCard = () => {
  const { t } = useTranslation();
  const {
    subscribed,
    subscriptionEnd,
    loading,
    isPremium,
    createCheckout,
    openCustomerPortal,
    checkSubscription,
  } = useSubscription();

  const handleSubscribe = async () => {
    const url = await createCheckout(SUBSCRIPTION_TIERS.premium_monthly.price_id!);
    if (url) {
      // Open in same tab to preserve session
      window.location.href = url;
    } else {
      toast.error("Ödeme sayfası açılamadı. Lütfen tekrar deneyin.");
    }
  };

  const handleManageSubscription = async () => {
    const url = await openCustomerPortal();
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error("Abonelik yönetimi sayfası açılamadı. Lütfen tekrar deneyin.");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Premium Glow Background */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/30 via-transparent to-transparent rounded-2xl blur-3xl"></div>
        <div className="relative space-y-2 py-4">
          <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Abonelik Planları
          </h2>
          <p className="text-center text-muted-foreground">
            İhtiyacınıza uygun planı seçin ve işlerinizi hızlandırın
          </p>
        </div>
      </div>

      {/* Cards Grid - Centered */}
      <div className="flex justify-center">
        <div className="grid gap-6 w-full md:grid-cols-3 md:max-w-7xl">
          {/* Free Plan - Muted */}
          <Card className={`transition-all duration-300 ${!isPremium ? "border-primary/50 bg-primary/5" : "border-gray-200 bg-gray-50/50 opacity-75"}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-700">{SUBSCRIPTION_TIERS.free.name}</CardTitle>
                {!isPremium && (
                  <Badge variant="default" className="bg-primary">
                    Mevcut Plan
                  </Badge>
                )}
              </div>
              <CardDescription className="text-gray-500">Temel özelliklerle başlayın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-700">Ücretsiz</span>
              </div>
              <ul className="space-y-3 text-sm">
                {SUBSCRIPTION_TIERS.free.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 py-1 border-b border-gray-200/30 last:border-0">
                    <Check className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              {!isPremium && (
                <Button variant="outline" className="w-full text-gray-500" disabled>
                  Aktif Plan
                </Button>
              )}
              {isPremium && (
                <Button variant="outline" className="w-full text-gray-500" disabled>
                  Premium'a Yükselt
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Premium Monthly Plan - Highlighted */}
          <Card className="border-2 border-orange-300 relative shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className={`h-5 w-5 ${isPremium ? "text-orange-600" : "text-orange-500"}`} />
                  <CardTitle className="text-lg">{SUBSCRIPTION_TIERS.premium_monthly.name}</CardTitle>
                </div>
                {isPremium && (
                  <Badge className="bg-orange-600">
                    Mevcut Plan
                  </Badge>
                )}
              </div>
              <CardDescription className="text-orange-700">
                {isPremium ? "Premium aboneliğiniz aktif" : "Tüm özelliklere erişin"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPremium ? (
                <>
                  <div className="space-y-3 bg-orange-50/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span className="text-muted-foreground">Yenileme Tarihi:</span>
                      <span className="font-medium">{formatDate(subscriptionEnd)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-orange-600" />
                      <span className="text-muted-foreground">Aylık:</span>
                      <span className="font-medium">{SUBSCRIPTION_TIERS.premium_monthly.price} {SUBSCRIPTION_TIERS.premium_monthly.currency}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-sm">
                    {SUBSCRIPTION_TIERS.premium_monthly.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 py-1 border-b border-orange-100 last:border-0">
                        <Check className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleManageSubscription}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Aboneliği Yönet
                    </Button>
                    <Button variant="ghost" size="icon" onClick={checkSubscription}>
                      <Loader2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-orange-600">{SUBSCRIPTION_TIERS.premium_monthly.price}</span>
                    <span className="text-sm text-muted-foreground">{SUBSCRIPTION_TIERS.premium_monthly.currency}<span className="text-xs text-gray-400">/ay</span></span>
                  </div>
                  <ul className="space-y-3 text-sm">
                    {SUBSCRIPTION_TIERS.premium_monthly.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 py-1 border-b border-orange-100 last:border-0">
                        <Check className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold transition-all duration-300" onClick={handleSubscribe}>
                    <Crown className="h-4 w-4 mr-2" />
                    Premium'a Yükselt
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Premium Yearly Plan - Prominent */}
          <Card className="border-2 border-amber-400 relative shadow-xl hover:shadow-2xl transition-all duration-300 md:scale-105 md:origin-center">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
              <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 font-bold px-3 py-1 shadow-lg">
                ⭐ %25 Tasarruf
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500 drop-shadow-lg" />
                  <CardTitle className="text-lg bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {SUBSCRIPTION_TIERS.premium_yearly.name}
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="font-semibold text-amber-700">En iyi değer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {SUBSCRIPTION_TIERS.premium_yearly.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{SUBSCRIPTION_TIERS.premium_yearly.currency}<span className="text-xs text-gray-400">/yıl</span></span>
                </div>
                <div className="text-sm font-semibold text-amber-700 flex items-center gap-1">
                  <span>💰</span>
                  <span>≈ {SUBSCRIPTION_TIERS.premium_yearly.monthly_equivalent} {SUBSCRIPTION_TIERS.premium_yearly.currency}/ay</span>
                </div>
              </div>

              <ul className="space-y-3 text-sm">
                {SUBSCRIPTION_TIERS.premium_yearly.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 py-1 border-b border-amber-100 last:border-0">
                    <Check className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5 font-bold" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
                onClick={() => {
                  const priceId = SUBSCRIPTION_TIERS.premium_yearly.price_id;
                  if (priceId) {
                    createCheckout(priceId).then(url => {
                      if (url) {
                        window.location.href = url;
                      } else {
                        toast.error("Ödeme sayfası açılamadı. Lütfen tekrar deneyin.");
                      }
                    });
                  }
                }}
              >
                <Crown className="h-4 w-4 mr-2" />
                Yıllık Premium'a Yükselt
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trust Elements - Footer */}
      <div className="mt-12 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl p-8 border border-gray-200/50">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">İstediğiniz Zaman İptal Edin</h4>
              <p className="text-sm text-gray-600 mt-1">Ek ücret olmadan aboneliği sonlandırabilirsiniz</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">Güvenli Ödeme</h4>
              <p className="text-sm text-gray-600 mt-1">Tüm işlemler SSL şifreli ve korunmaktadır</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Headphones className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">7/24 Teknik Destek</h4>
              <p className="text-sm text-gray-600 mt-1">Her zaman yardımcı olmaya hazır destek ekibimiz</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
