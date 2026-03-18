import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, User, Mail, LogOut, Eye, EyeOff, Edit2, Save, X, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const ProfileDropdown = () => {
  const { t } = useTranslation();
  const { user, signOut, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [country, setCountry] = useState("TR");
  const [currency, setCurrency] = useState("TRY");

  // Ülke-Para Birimi eşlemesi
  const countryConfig: Record<string, { name: string; currency: string }> = {
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
  };

  // Profile verisini yükle
  useEffect(() => {
    const loadProfile = async () => {
      // First check localStorage for recently set values from location detection
      const storedCountry = localStorage.getItem('userCountry');
      const storedCurrency = localStorage.getItem('userCurrency');
      
      if (storedCountry) {
        setCountry(storedCountry);
        setCurrency(storedCurrency || countryConfig[storedCountry]?.currency || "TRY");
        console.log('[ProfileDropdown] Loaded from localStorage:', storedCountry);
      }

      if (!user?.id) return;
      try {
        console.log("Loading profile for user:", user.id);
        const { data, error } = await supabase
          .from("profiles")
          .select("country, currency")
          .eq("id", user.id)
          .single();

        console.log("Profile data:", data);
        console.log("Profile error:", error);

        if (data) {
          setCountry(data.country || storedCountry || "TR");
          setCurrency(data.currency || storedCurrency || "TRY");
        } else if (error?.code === "PGRST116") {
          // Profil yoksa, oluştur
          console.log("Profile not found, creating...");
          const finalCountry = storedCountry || "TR";
          const finalCurrency = storedCurrency || countryConfig[finalCountry]?.currency || "TRY";
          
          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            country: finalCountry,
            currency: finalCurrency,
            language: localStorage.getItem('language') || "tr",
          });
          console.log("Insert error:", insertError);
          setCountry(finalCountry);
          setCurrency(finalCurrency);
        }
      } catch (error) {
        console.error("Profile yükleme hatası:", error);
      }
    };

    loadProfile();
  }, [user?.id]);

  if (!user) return null;

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 3) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.substring(0, 2)}***@${domain}`;
  };

  const handleCountryChange = async (newCountry: string) => {
    try {
      const newCurrency = countryConfig[newCountry]?.currency || "TRY";
      setCountry(newCountry);
      setCurrency(newCurrency);

      // Save to localStorage
      localStorage.setItem('userCountry', newCountry);
      localStorage.setItem('userCurrency', newCurrency);

      if (!user?.id) {
        console.warn("No user ID available");
        return;
      }

      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          country: newCountry,
          currency: newCurrency,
          updated_at: new Date().toISOString(),
        });

      toast({
        title: "Başarılı",
        description: `Ülke değiştirildi: ${countryConfig[newCountry]?.name || newCountry}`,
      });
    } catch (error) {
      console.error("Ülke güncelleme hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ülke güncellenemedi",
      });
    }
  };

  const handleSaveName = async () => {
    try {
      if (!fullName.trim()) {
        toast({ variant: "destructive", title: "Hata", description: "Ad soyad boş olamaz" });
        return;
      }

      setIsSaving(true);
      await updateUserProfile({ full_name: fullName.trim() });
      toast({ title: "Başarılı", description: "Ad soyad güncellendi" });
      setEditingName(false);
    } catch (error) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: "Hata", description: "Ad soyad güncellenemedi" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFullName(user?.user_metadata?.full_name || "");
    setEditingName(false);
  };

  const handleSavePhone = async () => {
    try {
      if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
        toast({ variant: "destructive", title: "Hata", description: "Geçerli bir telefon numarası girin" });
        return;
      }

      setIsSaving(true);
      await updateUserProfile({ phone: phone.trim() });
      toast({ title: "Başarılı", description: "Telefon numarası güncellendi" });
      setEditingPhone(false);
    } catch (error) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: "Hata", description: "Telefon numarası güncellenemedi" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelPhoneEdit = () => {
    setPhone(user?.user_metadata?.phone || "");
    setEditingPhone(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 h-9">
            <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="hidden sm:inline text-sm max-w-[120px] truncate">
              {user.user_metadata?.full_name || user.email?.split("@")[0] || "Kullanıcı"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t('app.profile')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Ülke Seçimi - TEST */}
          <div className="px-2 py-2 text-sm font-semibold text-muted-foreground">
            🌍 Ülke Seç
          </div>
          
          <DropdownMenuItem onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCountryChange("TR").catch(err => console.error("Country change error:", err));
          }}>
            🇹🇷 Türkiye (TRY) {country === "TR" ? "✓" : ""}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCountryChange("SE").catch(err => console.error("Country change error:", err));
          }}>
            🇸🇪 İsveç (SEK) {country === "SE" ? "✓" : ""}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCountryChange("DE").catch(err => console.error("Country change error:", err));
          }}>
            🇩🇪 Almanya (EUR) {country === "DE" ? "✓" : ""}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCountryChange("GB").catch(err => console.error("Country change error:", err));
          }}>
            🇬🇧 İngiltere (GBP) {country === "GB" ? "✓" : ""}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setProfileOpen(true)} className="gap-2">
            <User className="h-4 w-4" />
            <span>Profili Görüntüle</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="gap-2 text-red-600">
            <LogOut className="h-4 w-4" />
            <span>Çıkış Yap</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-lg max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profil Bilgileri</DialogTitle>
            <DialogDescription>Hesap detaylarınız</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pr-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kişisel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      <Button
                        size="sm"
                        onClick={handleSaveName}
                        disabled={isSaving}
                        className="gap-1"
                      >
                        <Save className="h-4 w-4" />
                        <span className="hidden sm:inline">Kaydet</span>
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
                      <Button
                        size="sm"
                        onClick={handleSavePhone}
                        disabled={isSaving}
                        className="gap-1"
                      >
                        <Save className="h-4 w-4" />
                        <span className="hidden sm:inline">Kaydet</span>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Ülke / Para Birimi
                  </label>
                  <Select value={country} onValueChange={handleCountryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ülke seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(countryConfig).map(([code, config]) => (
                        <SelectItem key={code} value={code}>
                          {config.name} ({config.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Malzeme fiyatları bu ülkeye göre gösterilecek
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Hesap Türü</label>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                      {user.user_metadata?.subscription_tier === "premium"
                        ? "Premium"
                        : "Standart"}
                    </span>
                  </div>
                </div>

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
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <p>Son güncelleme: {user.updated_at ? new Date(user.updated_at).toLocaleDateString("tr-TR") : "Bilinmiyor"}</p>
              <Button variant="outline" size="sm" onClick={() => setProfileOpen(false)} className="h-7 px-3">
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

