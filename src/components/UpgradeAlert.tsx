import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, AlertTriangle } from "lucide-react";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface UpgradeAlertProps {
  type: "projects" | "teamMembers";
  current: number;
  limit: number;
}

export const UpgradeAlert = ({ type, current, limit }: UpgradeAlertProps) => {
  const { createCheckout } = useSubscription();

  const handleUpgrade = async () => {
    const url = await createCheckout(SUBSCRIPTION_TIERS.premium.price_id!);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error("Ödeme sayfası açılamadı. Lütfen tekrar deneyin.");
    }
  };

  const messages = {
    projects: {
      title: "Proje Limitine Ulaştınız",
      description: `Standard planda maksimum ${limit} proje oluşturabilirsiniz. Şu anda ${current}/${limit} proje kullanıyorsunuz.`,
    },
    teamMembers: {
      title: "Ekip Üyesi Limitine Ulaştınız",
      description: `Standard planda maksimum ${limit} ekip üyesi ekleyebilirsiniz. Şu anda ${current}/${limit} ekip üyesi kullanıyorsunuz.`,
    },
  };

  return (
    <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600">{messages[type].title}</AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">{messages[type].description}</span>
        <Button size="sm" onClick={handleUpgrade} className="gap-2 w-full sm:w-auto">
          <Crown className="h-4 w-4" />
          Premium'a Yükselt
        </Button>
      </AlertDescription>
    </Alert>
  );
};
