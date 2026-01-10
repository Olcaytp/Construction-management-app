import { useTranslation } from "react-i18next";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Check, Calendar, CreditCard, Settings } from "lucide-react";
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
    const url = await createCheckout(SUBSCRIPTION_TIERS.premium.price_id!);
    if (url) {
      window.open(url, "_blank");
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
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Standard Plan */}
        <Card className={!isPremium ? "border-primary/50 bg-primary/5" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{SUBSCRIPTION_TIERS.standard.name}</CardTitle>
              {!isPremium && (
                <Badge variant="default" className="bg-primary">
                  Mevcut Plan
                </Badge>
              )}
            </div>
            <CardDescription>Temel özelliklerle başlayın</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">Ücretsiz</span>
            </div>
            <ul className="space-y-2 text-sm">
              {SUBSCRIPTION_TIERS.standard.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {!isPremium && (
              <Button variant="outline" className="w-full" disabled>
                Aktif Plan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className={isPremium ? "border-primary/50 bg-primary/5" : "border-2 border-primary"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className={`h-5 w-5 ${isPremium ? "text-primary" : "text-amber-500"}`} />
                <CardTitle className="text-lg">{SUBSCRIPTION_TIERS.premium.name}</CardTitle>
              </div>
              {isPremium && (
                <Badge variant="default" className="bg-primary">
                  Mevcut Plan
                </Badge>
              )}
            </div>
            <CardDescription>
              {isPremium
                ? "Premium aboneliğiniz aktif"
                : "Tüm özelliklere erişin"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPremium ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Yenileme Tarihi:</span>
                    <span className="font-medium">{formatDate(subscriptionEnd)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Aylık:</span>
                    <span className="font-medium">{SUBSCRIPTION_TIERS.premium.price} {SUBSCRIPTION_TIERS.premium.currency}</span>
                  </div>
                </div>

                <ul className="space-y-2 text-sm">
                  {SUBSCRIPTION_TIERS.premium.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
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
                  <span className="text-3xl font-bold">
                    {SUBSCRIPTION_TIERS.premium.price}
                  </span>
                  <span className="text-muted-foreground">
                    {SUBSCRIPTION_TIERS.premium.currency}/ay
                  </span>
                </div>
                <ul className="space-y-2 text-sm">
                  {SUBSCRIPTION_TIERS.premium.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button className="w-full" onClick={handleSubscribe}>
                  <Crown className="h-4 w-4 mr-2" />
                  Premium'a Yükselt
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
