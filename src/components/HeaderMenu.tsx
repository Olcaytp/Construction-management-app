import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  User,
  LogOut,
  Languages,
  Menu,
  Edit2,
  Save,
  X,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const HeaderMenu = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [country, setCountry] = useState("TR");
  const [currency, setCurrency] = useState("TRY");

  // Ülke-Para Birimi eşlemesi (Dile göre)
  const getCountryConfig = (lang: string) => {
    const configs: Record<string, Record<string, { name: string; currency: string }>> = {
      tr: {
        TR: { name: "Türkiye", currency: "TRY" },
        DE: { name: "Almanya", currency: "EUR" },
        FR: { name: "Fransa", currency: "EUR" },
        IT: { name: "İtalya", currency: "EUR" },
        ES: { name: "İspanya", currency: "EUR" },
        SE: { name: "İsveç", currency: "SEK" },
        NO: { name: "Norveç", currency: "NOK" },
        DK: { name: "Danimarka", currency: "DKK" },
        GB: { name: "İngiltere", currency: "GBP" },
        US: { name: "Amerika", currency: "USD" },
      },
      en: {
        TR: { name: "Turkey", currency: "TRY" },
        DE: { name: "Germany", currency: "EUR" },
        FR: { name: "France", currency: "EUR" },
        IT: { name: "Italy", currency: "EUR" },
        ES: { name: "Spain", currency: "EUR" },
        SE: { name: "Sweden", currency: "SEK" },
        NO: { name: "Norway", currency: "NOK" },
        DK: { name: "Denmark", currency: "DKK" },
        GB: { name: "England", currency: "GBP" },
        US: { name: "USA", currency: "USD" },
      },
      sv: {
        TR: { name: "Turkiet", currency: "TRY" },
        DE: { name: "Tyskland", currency: "EUR" },
        FR: { name: "Frankrike", currency: "EUR" },
        IT: { name: "Italien", currency: "EUR" },
        ES: { name: "Spanien", currency: "EUR" },
        SE: { name: "Sverige", currency: "SEK" },
        NO: { name: "Norge", currency: "NOK" },
        DK: { name: "Danmark", currency: "DKK" },
        GB: { name: "Storbritannien", currency: "GBP" },
        US: { name: "USA", currency: "USD" },
      },
    };
    return configs[lang?.toLowerCase()] || configs.tr;
  };

  const currentCountryConfig = getCountryConfig(i18n.language);

  // Profile verisini yükle
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("country, currency")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          setCountry(data.country || "TR");
          setCurrency(data.currency || "TRY");
        } else if (!data && !error) {
          // Profil yok, otomatik oluştur
          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            country: "TR",
            currency: "TRY",
            language: i18n.language,
          });
          if (!insertError) {
            setCountry("TR");
            setCurrency("TRY");
          }
        }
      } catch (error) {
        console.error("Profile yükleme hatası:", error);
      }
    };

    loadProfile();
  }, [user?.id]);

  const handleCountryChange = async (newCountry: string) => {
    const config = getCountryConfig(i18n.language);
    const newCurrency = config[newCountry]?.currency || "TRY";
    setCountry(newCountry);
    setCurrency(newCurrency);

    // Toast başlığı ve açıklaması dile göre
    const messages: Record<string, { title: string; description: string }> = {
      tr: {
        title: "Başarılı",
        description: `Ülke değiştirildi: ${config[newCountry]?.name || newCountry}`,
      },
      en: {
        title: "Success",
        description: `Country changed: ${config[newCountry]?.name || newCountry}`,
      },
      sv: {
        title: "Lyckades",
        description: `Land ändrat: ${config[newCountry]?.name || newCountry}`,
      },
    };

    const message = messages[i18n.language?.toLowerCase()] || messages.tr;

    try {
      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          country: newCountry,
          currency: newCurrency,
          updated_at: new Date().toISOString(),
        });

      toast({
        title: message.title,
        description: message.description,
      });
    } catch (error) {
      console.error("Ülke güncelleme hatası:", error);
      const errorMessages: Record<string, { title: string; description: string }> = {
        tr: {
          title: "Hata",
          description: "Ülke güncellenemedi",
        },
        en: {
          title: "Error",
          description: "Country could not be updated",
        },
        sv: {
          title: "Fel",
          description: "Land kunde inte uppdateras",
        },
      };
      const errorMsg = errorMessages[i18n.language?.toLowerCase()] || errorMessages.tr;
      toast({
        variant: "destructive",
        title: errorMsg.title,
        description: errorMsg.description,
      });
    }
  };

  if (!user) return null;  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 3) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.substring(0, 2)}***@${domain}`;
  };

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      toast({ variant: "destructive", title: t("common.error"), description: "Ad soyad boş olamaz" });
      return;
    }
    setIsSaving(true);
    try {
      await updateUserProfile({ full_name: fullName.trim() });
      toast({ title: t("common.cancel"), description: "Ad soyad güncellendi" });
      setEditingName(false);
    } catch (error) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: t("common.error"), description: "Ad soyad güncellenemedi" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFullName(user?.user_metadata?.full_name || "");
    setEditingName(false);
  };

  const handleSavePhone = async () => {
    if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
      toast({ variant: "destructive", title: t("common.error"), description: "Geçerli bir telefon numarası girin" });
      return;
    }
    setIsSaving(true);
    try {
      await updateUserProfile({ phone: phone.trim() });
      toast({ title: t("common.cancel"), description: "Telefon numarası güncellendi" });
      setEditingPhone(false);
    } catch (error) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: t("common.error"), description: "Telefon numarası güncellenemedi" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelPhoneEdit = () => {
    setPhone(user?.user_metadata?.phone || "");
    setEditingPhone(false);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  const langLabel = {
    tr: "TR",
    en: "EN",
    sv: "SV",
  }[i18n.language] || "TR";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-12 w-12 sm:h-10 sm:w-10 mr-2 sm:mr-0">
            <Menu className="h-7 w-7 sm:h-6 sm:w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-center py-2 text-base">
            {t("app.menu") || "Menü"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Profil */}
          <DropdownMenuItem
            onClick={() => setProfileOpen(true)}
            className="gap-3 py-3 px-4 cursor-pointer hover:bg-accent"
          >
            <div className="flex items-center gap-3 flex-1">
              <User className="h-5 w-5 text-primary" />
              <span className="text-sm">{t("app.profile") || "Profil"}</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Dil */}
          <DropdownMenuLabel className="text-xs text-muted-foreground px-4">
            {t("app.language") || "Dil"}
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => changeLanguage("tr")}
            className={`gap-3 py-2 px-4 cursor-pointer ${
              i18n.language === "tr" ? "bg-primary/10" : ""
            }`}
          >
            <Languages className="h-4 w-4" />
            <span className="text-sm">Türkçe (TR)</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => changeLanguage("en")}
            className={`gap-3 py-2 px-4 cursor-pointer ${
              i18n.language === "en" ? "bg-primary/10" : ""
            }`}
          >
            <Languages className="h-4 w-4" />
            <span className="text-sm">English (EN)</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => changeLanguage("sv")}
            className={`gap-3 py-2 px-4 cursor-pointer ${
              i18n.language === "sv" ? "bg-primary/10" : ""
            }`}
          >
            <Languages className="h-4 w-4" />
            <span className="text-sm">Svenska (SV)</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Ülke */}
          <DropdownMenuLabel className="text-xs text-muted-foreground px-4 flex items-center gap-2">
            <Globe className="h-3 w-3" />
            {i18n.language === "tr" ? "Ülke / Para Birimi" : i18n.language === "sv" ? "Land / Valuta" : "Country / Currency"}
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleCountryChange("TR")}
            className={`gap-3 py-2 px-4 cursor-pointer ${
              country === "TR" ? "bg-primary/10" : ""
            }`}
          >
            <span className="text-sm">🇹🇷 {currentCountryConfig.TR.name} ({currentCountryConfig.TR.currency}) {country === "TR" ? "✓" : ""}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleCountryChange("SE")}
            className={`gap-3 py-2 px-4 cursor-pointer ${
              country === "SE" ? "bg-primary/10" : ""
            }`}
          >
            <span className="text-sm">🇸🇪 {currentCountryConfig.SE.name} ({currentCountryConfig.SE.currency}) {country === "SE" ? "✓" : ""}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleCountryChange("DE")}
            className={`gap-3 py-2 px-4 cursor-pointer ${
              country === "DE" ? "bg-primary/10" : ""
            }`}
          >
            <span className="text-sm">🇩🇪 {currentCountryConfig.DE.name} ({currentCountryConfig.DE.currency}) {country === "DE" ? "✓" : ""}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleCountryChange("GB")}
            className={`gap-3 py-2 px-4 cursor-pointer ${
              country === "GB" ? "bg-primary/10" : ""
            }`}
          >
            <span className="text-sm">🇬🇧 {currentCountryConfig.GB.name} ({currentCountryConfig.GB.currency}) {country === "GB" ? "✓" : ""}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleCountryChange("US")}
            className={`gap-3 py-2 px-4 cursor-pointer ${
              country === "US" ? "bg-primary/10" : ""
            }`}
          >
            <span className="text-sm">🇺🇸 {currentCountryConfig.US.name} ({currentCountryConfig.US.currency}) {country === "US" ? "✓" : ""}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Çıkış */}
          <DropdownMenuItem
            onClick={signOut}
            className="gap-3 py-3 px-4 cursor-pointer hover:bg-destructive/10 text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm">{t("app.logout")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profil Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profil Bilgileri</DialogTitle>
            <DialogDescription>Hesap detaylarınız</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kişisel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ad Soyad */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Ad Soyad</label>
                  {editingName ? (
                    <div className="flex gap-2">
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ad soyad girin"
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleSaveName} disabled={isSaving} className="gap-1">
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {user.user_metadata?.full_name || "Belirtilmemiş"}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setFullName(user?.user_metadata?.full_name || "");
                          setEditingName(true);
                        }}
                        className="p-1 hover:bg-background rounded transition-colors"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Telefon */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Telefon</label>
                  {editingPhone ? (
                    <div className="flex gap-2">
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Telefon numarası"
                        className="flex-1"
                        type="tel"
                      />
                      <Button size="sm" onClick={handleSavePhone} disabled={isSaving} className="gap-1">
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelPhoneEdit}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {user.user_metadata?.phone || "Belirtilmemiş"}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setPhone(user?.user_metadata?.phone || "");
                          setEditingPhone(true);
                        }}
                        className="p-1 hover:bg-background rounded transition-colors"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>

                {/* E-posta */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">E-posta</label>
                  <div className="p-3 bg-muted rounded-lg flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {showEmail ? user.email : maskEmail(user.email || "")}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowEmail(!showEmail)}
                      className="p-1 hover:bg-background rounded transition-colors"
                    >
                      {showEmail ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Hesap Türü */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Hesap Türü</label>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                      {user.user_metadata?.subscription_tier === "premium" ? "Premium" : "Standart"}
                    </span>
                  </div>
                </div>

                {/* Üyelik Tarihi */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Üyelik Tarihi</label>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("tr-TR")
                        : "Bilinmiyor"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground">
              <p>
                Son güncelleme:{" "}
                {user.updated_at
                  ? new Date(user.updated_at).toLocaleDateString("tr-TR")
                  : "Bilinmiyor"}
              </p>
            </div>

            <Button onClick={() => setProfileOpen(false)} variant="outline" className="w-full">
              {t("common.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
