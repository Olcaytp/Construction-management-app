import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  name: z.string().min(1, "Malzeme adı gerekli"),
  quantity: z.coerce.number().min(0, "Miktar 0'dan küçük olamaz"),
  unit: z.string().min(1, "Birim gerekli"),
  estimatedCost: z.coerce.number().min(0, "Tahmini maliyet 0'dan küçük olamaz"),
  actualCost: z.coerce.number().min(0, "Gerçek maliyet 0'dan küçük olamaz"),
  status: z.string(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().optional().default("TRY"),
});

type FormData = z.infer<typeof formSchema>;

interface MaterialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => void;
  defaultValues?: Partial<FormData>;
  title: string;
  projectTitle?: string;
  projectDescription?: string;
}

export const MaterialForm = ({ open, onOpenChange, onSubmit, defaultValues, title, projectTitle, projectDescription }: MaterialFormProps) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [userCountry, setUserCountry] = useState("TR");
  const [userCurrency, setUserCurrency] = useState("TRY");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      quantity: 0,
      unit: "adet",
      estimatedCost: 0,
      actualCost: 0,
      status: "planned",
      supplier: "",
      notes: "",
      currency: "TRY",
      ...defaultValues,
    },
  });

  // Kullanıcı profilini yükle
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data } = await supabase
            .from("profiles")
            .select("country, currency")
            .eq("id", user.id)
            .single();

          if (data) {
            setUserCountry(data.country || "TR");
            setUserCurrency(data.currency || "TRY");
            form.setValue("currency", data.currency || "TRY");
          }
        }
      } catch (error) {
        console.error("Profil yükleme hatası:", error);
      }
    };

    loadUserProfile();
  }, [form]);

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        name: "",
        quantity: 0,
        unit: "adet",
        estimatedCost: 0,
        actualCost: 0,
        status: "planned",
        supplier: "",
        notes: "",
        currency: userCurrency,
        ...defaultValues,
      });
    }
  }, [defaultValues, form, userCurrency]);

  const handleSuggestMaterials = async () => {
    if (!projectTitle) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Proje adı belirtilmeli"
      });
      return;
    }

    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-materials", {
        body: {
          projectTitle,
          projectDescription,
          language: i18n.language,
          country: userCountry,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.materials && data.materials.length > 0) {
        toast({
          title: "Başarılı",
          description: `${data.materials.length} malzeme önerileri yüklendi`
        });
        // Malzemeleri başarıyla yükle
        console.log("Önerilen malzemeler:", data.materials);
      } else {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Malzeme önerileri alınamadı"
        });
      }
    } catch (error) {
      console.error("AI önerisi hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Malzeme önerileri alınamadı"
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            {projectTitle && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSuggestMaterials}
                disabled={isLoadingAI}
                className="gap-2 h-8"
              >
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">{isLoadingAI ? "Yükleniyor..." : "AI Öner"}</span>
              </Button>
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('material.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('material.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('material.quantity')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('material.unit')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('material.selectUnit')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="adet">Adet</SelectItem>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="ton">Ton</SelectItem>
                        <SelectItem value="m²">m²</SelectItem>
                        <SelectItem value="m³">m³</SelectItem>
                        <SelectItem value="metre">Metre</SelectItem>
                        <SelectItem value="paket">Paket</SelectItem>
                        <SelectItem value="torba">Torba</SelectItem>
                        <SelectItem value="litre">Litre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('material.estimatedCost')} ({userCurrency})</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actualCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('material.actualCost')} ({userCurrency})</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Para Birimi</FormLabel>
                  <FormControl>
                    <Input value={field.value} disabled className="bg-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('material.status')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('material.selectStatus')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="planned">{t('material.planned')}</SelectItem>
                      <SelectItem value="ordered">{t('material.ordered')}</SelectItem>
                      <SelectItem value="delivered">{t('material.delivered')}</SelectItem>
                      <SelectItem value="in-use">{t('material.inUse')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('material.supplier')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('material.supplierPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('material.notes')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('material.notesPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('material.cancel')}
              </Button>
              <Button type="submit">{t('material.save')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
