import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const { t } = useTranslation();
  const { user, updateUserProfile } = useAuth();
  const { addProject } = useProjects();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);

  // Profile form
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");

  // Project form
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error(t("validation.required") || "Lütfen adınızı girin");
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile({
        full_name: fullName,
        phone: phone || undefined,
      });
      toast.success(t("common.saved") || "Kaydedildi");
      setActiveTab("project");
    } catch (error) {
      toast.error(t("common.error") || "Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error(t("validation.required") || "Lütfen proje adını girin");
      return;
    }

    setLoading(true);
    try {
      await addProject({
        name: projectName,
        location: projectLocation,
        description: "",
        status: "planning",
      });
      toast.success(t("projects.created") || "Proje oluşturuldu");
      onComplete();
    } catch (error) {
      toast.error(t("common.error") || "Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Hoşgeldiniz!</DialogTitle>
          <DialogDescription>
            Başlamadan önce profilinizi tamamlayıp ilk projenizi oluşturun
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              {fullName && <CheckCircle2 className="w-4 h-4" />}
              Profil
            </TabsTrigger>
            <TabsTrigger value="project" className="flex items-center gap-2">
              {projectName && <CheckCircle2 className="w-4 h-4" />}
              Proje
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profil Bilgileri</CardTitle>
                <CardDescription>Temel bilgilerinizi tamamlayın</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Ad Soyad *</Label>
                  <Input
                    id="fullName"
                    placeholder="Adınız ve soyadınız"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon (Opsiyonel)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+90 (5XX) XXX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-3 pt-4">
                  <Button
                    className="w-full"
                    onClick={handleSaveProfile}
                    disabled={loading || !fullName.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Kaydet ve Devam Et
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project Tab */}
          <TabsContent value="project" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">İlk Projeniz</CardTitle>
                <CardDescription>Projenizi hemen oluşturup başlayabilirsiniz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Proje Adı *</Label>
                  <Input
                    id="projectName"
                    placeholder="Örn: Ofis Renovasyonu"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectLocation">Konum (Opsiyonel)</Label>
                  <Input
                    id="projectLocation"
                    placeholder="Şehir, Mahalle vb."
                    value={projectLocation}
                    onChange={(e) => setProjectLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-3 pt-4">
                  <Button
                    className="w-full"
                    onClick={handleCreateProject}
                    disabled={loading || !projectName.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Projeyi Oluştur
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleSkip}
                    disabled={loading}
                  >
                    Şimdi Değil, Sonra Oluşturam
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
