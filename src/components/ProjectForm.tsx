/**
 * Copyright © 2026 Olcaytp. All rights reserved.
 * This file is part of the Construction Management Application.
 * Licensed under the MIT License. See LICENSE file for details.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ChevronDown } from "lucide-react";

// Sayısal alanlarda başlangıçta "0" görünmesini engellemek için
// boş değerleri `undefined` yapıp kullanıcıyı girdi girmeye zorlarız.
const numberRequired = (min = 0, max?: number) =>
  z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    max !== undefined
      ? z.coerce.number({ invalid_type_error: "Gerekli" }).min(min).max(max)
      : z.coerce.number({ invalid_type_error: "Gerekli" }).min(min)
  );

const getFormSchema = (t: any, isEditing: boolean = false) => {
  const today = new Date().toISOString().split('T')[0];
  
  return z.object({
    title: z.string().min(2, t("validation.titleRequired") || "Proje adı en az 2 karakter olmalı"),
    description: z.string().optional(),
    startDate: z.string()
      .default(today),
    endDate: z.string()
      .optional(),
    assignedTeam: z.array(z.string()),
    customerId: z.string().min(1, t("validation.required") || "Müşteri seçilmelidir"),
    status: z.enum(["planning", "active", "completed"]),
    progress: z.coerce.number().min(0).max(100).default(0),
    budget: z.coerce.number().min(0).default(0),
    actualCost: z.coerce.number().min(0).default(0),
    revenue: z.coerce.number().min(0).default(0),
    photos: z.array(z.string()).optional(),
  }).refine((data) => {
    // Editing mode'da veya planning değilse tarih kontrolü yapma
    if (isEditing || data.status !== "planning") return true;
    return data.startDate >= today;
  }, {
    message: "Başlangıç tarihi bugünün tarihinden eski olamaz",
    path: ["startDate"]
  }).refine((data) => {
    // Editing mode'da veya planning değilse tarih kontrolü yapma
    if (isEditing || data.status !== "planning") return true;
    return !data.endDate || data.endDate >= today;
  }, {
    message: "Bitiş tarihi bugünün tarihinden eski olamaz",
    path: ["endDate"]
  });
};

type FormData = z.infer<ReturnType<typeof getFormSchema>>;

interface TeamMember {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => void;
  defaultValues?: FormData;
  title: string;
  teamMembers?: TeamMember[];
  customers?: Customer[];
  /**
   * Modal açıldığında hangi proje/işlem için reset yapılacağını belirler.
   * (Parent'ta object-literal defaultValues yüzünden gereksiz resetleri engeller.)
   */
  resetKey?: string;
  /**
   * Edit modunda fotoğraflar yüklendiği anda kalıcı kaydetmek için.
   * (Kartta görünmesi için proje güncellenir.)
   */
  onSavePhotos?: (photoUrls: string[]) => void | Promise<void>;
  /**
   * Abonelik planına göre proje başına maksimum fotoğraf sayısı
   */
  maxPhotos?: number;
}

export const ProjectForm = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  title,
  teamMembers = [],
  customers = [],
  resetKey,
  onSavePhotos,
  maxPhotos = 4,
}: ProjectFormProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(defaultValues?.photos || []);
  const PHOTO_DEBUG = import.meta.env.DEV;
  
  const remainingPhotoSlots = maxPhotos - photoUrls.length;
  const isEditing = !!defaultValues;
  const formSchema = getFormSchema(t, isEditing);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      assignedTeam: [],
      customerId: "",
      status: "planning",
      progress: "",
      budget: "",
      actualCost: "",
      revenue: "",
      photos: [],
    },
  });

  const selectedStatus = form.watch("status");

  const lastResetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      lastResetKeyRef.current = null;
      return;
    }

    const key = resetKey ?? (defaultValues ? "edit" : "new");
    if (lastResetKeyRef.current === key) return;
    lastResetKeyRef.current = key;

    // if (PHOTO_DEBUG) {
    //   console.log("[ProjectForm] reset", {
    //     key,
    //     hasDefaultValues: Boolean(defaultValues),
    //     photosCount: defaultValues?.photos?.length ?? 0,
    //   });
    // }

    if (defaultValues) {
      form.reset(defaultValues);
      setPhotoUrls(defaultValues.photos || []);
      return;
    }

    form.reset({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      assignedTeam: [],
      customerId: "",
      status: "planning",
      progress: "",
      budget: "",
      actualCost: "",
      revenue: "",
      photos: [],
    });
    setPhotoUrls([]);
  }, [open, resetKey]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limit kontrolü
    const allowedCount = Math.min(files.length, remainingPhotoSlots);
    if (allowedCount <= 0) {
      toast({
        variant: "destructive",
        title: t("project.photoLimitReached") || "Fotoğraf limiti doldu",
        description: t("project.photoLimitDescription", { max: maxPhotos }) || `Maksimum ${maxPhotos} fotoğraf yükleyebilirsiniz.`,
      });
      e.target.value = "";
      return;
    }

    const filesToUpload = Array.from(files).slice(0, allowedCount);
    if (filesToUpload.length < files.length) {
      toast({
        title: t("project.photoLimitPartial") || "Bazı fotoğraflar yüklenmedi",
        description: t("project.photoLimitPartialDesc", { uploaded: filesToUpload.length, total: files.length }) || `Sadece ${filesToUpload.length}/${files.length} fotoğraf yüklendi (limit: ${maxPhotos})`,
      });
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      if (PHOTO_DEBUG) {
        const { data } = await supabase.auth.getSession();
        console.log("[ProjectForm] photo upload started", {
          files: filesToUpload.map((f) => ({ name: f.name, size: f.size, type: f.type })),
          hasSession: Boolean(data.session),
          userId: data.session?.user?.id,
          maxPhotos,
          remainingSlots: remainingPhotoSlots,
        });
      }

      for (const file of filesToUpload) {
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        if (PHOTO_DEBUG) console.log("[ProjectForm] uploading...", { filePath, fileName });

        const { error: uploadError } = await supabase.storage
          .from("project-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          if (PHOTO_DEBUG) console.error("[ProjectForm] uploadError", uploadError);
          throw uploadError;
        }

        const { data } = supabase.storage.from("project-photos").getPublicUrl(filePath);
        if (PHOTO_DEBUG) console.log("[ProjectForm] publicUrl", { filePath, publicUrl: data.publicUrl });

        newUrls.push(data.publicUrl);
      }

      const updatedUrls = [...photoUrls, ...newUrls];
      setPhotoUrls(updatedUrls);
      form.setValue("photos", updatedUrls, { shouldDirty: true });

      // Fotoğraflar storage'a yüklendi ama projeye yazılması için (edit modunda) otomatik kaydet
      await onSavePhotos?.(updatedUrls);

      if (PHOTO_DEBUG) console.log("[ProjectForm] photo upload finished", { updatedUrls });

      toast({ title: t("project.uploadPhotos") + " ✓" });
    } catch (error: any) {
      if (PHOTO_DEBUG) console.error("[ProjectForm] photo upload failed", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || String(error),
      });
    } finally {
      setUploading(false);
      // Reset input to allow uploading same file again
      e.target.value = "";
    }
  };

  const removePhoto = (url: string) => {
    const updatedUrls = photoUrls.filter((u) => u !== url);
    setPhotoUrls(updatedUrls);
    form.setValue("photos", updatedUrls);
  };

  const handleSubmit = (data: FormData) => {
    onSubmit({ ...data, photos: photoUrls });
    form.reset();
    setPhotoUrls([]);
    onOpenChange(false);
  };

  const selectedTeam = form.watch("assignedTeam") || [];

  const toggleTeamMember = (memberId: string) => {
    const current = form.getValues("assignedTeam") || [];
    if (current.includes(memberId)) {
      form.setValue("assignedTeam", current.filter(id => id !== memberId));
    } else {
      form.setValue("assignedTeam", [...current, memberId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("project.title")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("project.titlePlaceholder")} {...field} />
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
                    <FormLabel>{t("project.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("project.selectStatus")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planning">{t("project.planning")}</SelectItem>
                        <SelectItem value="active">{t("project.active")}</SelectItem>
                        <SelectItem value="completed">{t("project.completed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("project.description")}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t("project.descriptionPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => {
                  const today = new Date().toISOString().split('T')[0];
                  const maxDate = new Date();
                  maxDate.setFullYear(maxDate.getFullYear() + 10);
                  const maxDateStr = maxDate.toISOString().split('T')[0];
                  
                  return (
                    <FormItem>
                      <FormLabel>{t("project.startDate")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          key={`startDate-${selectedStatus}`}
                          {...field}
                          min={isEditing || selectedStatus === "completed" ? "" : today}
                          max={maxDateStr}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => {
                  const maxDate = new Date();
                  maxDate.setFullYear(maxDate.getFullYear() + 10);
                  const maxDateStr = maxDate.toISOString().split('T')[0];
                  
                  return (
                    <FormItem>
                      <FormLabel>{t("project.endDate")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          max={maxDateStr}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* Customer Selection */}
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("project.customer")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("project.selectCustomer")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team Member Selection - Dropdown with Multiple Select */}
            <FormField
              control={form.control}
              name="assignedTeam"
              render={() => (
                <FormItem>
                  <FormLabel>{t("project.assignedMasters")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-10 px-3 py-2"
                        type="button"
                      >
                        <span className="truncate">
                          {selectedTeam.length === 0 
                            ? t("project.selectMasters")
                            : selectedTeam.length === 1
                            ? teamMembers.find(m => m.id === selectedTeam[0])?.name || t("project.selectMasters")
                            : `${selectedTeam.length} ${t("project.masterSelected") || "usta seçildi"}`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                        {teamMembers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">{t("project.noMasters")}</p>
                        ) : (
                          teamMembers.map((member) => (
                            <div 
                              key={member.id} 
                              className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                              onClick={() => toggleTeamMember(member.id)}
                            >
                              <Checkbox
                                id={`team-${member.id}`}
                                checked={selectedTeam.includes(member.id)}
                                onCheckedChange={() => toggleTeamMember(member.id)}
                              />
                              <label
                                htmlFor={`team-${member.id}`}
                                className="text-sm font-medium flex-1 cursor-pointer"
                              >
                                {member.name}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Selected Team Members Display */}
                  {selectedTeam.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTeam.map(memberId => {
                        const member = teamMembers.find(m => m.id === memberId);
                        return member ? (
                          <Badge key={memberId} variant="secondary" className="gap-1">
                            {member.name}
                            <button
                              type="button"
                              onClick={() => toggleTeamMember(memberId)}
                              className="ml-1 hover:bg-destructive/20 rounded px-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("project.progress")} (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="100" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("project.budget")}</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder={t("project.budgetPlaceholder")} {...field} />
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
                    <FormLabel>{t("project.actualCost")}</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("project.revenue")}</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>{t("project.photos")}</FormLabel>
                <span className="text-xs text-muted-foreground">
                  {photoUrls.length}/{maxPhotos}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{t("project.photosHint")}</p>
              <div className="flex items-start gap-3">
                {remainingPhotoSlots > 0 ? (
                  <label className="flex-shrink-0 w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    {uploading && <span className="text-xs text-muted-foreground mt-1">...</span>}
                  </label>
                ) : (
                  <div className="flex-shrink-0 w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center bg-muted/30 cursor-not-allowed">
                    <Upload className="h-5 w-5 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground mt-1">Limit</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 flex-1">
                  {photoUrls.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative group">
                      <img 
                        src={url} 
                        alt={`Photo ${index + 1}`} 
                        loading="lazy"
                        className="w-20 h-20 object-cover rounded border border-border"
                        onLoad={() => {
                          // if (PHOTO_DEBUG) console.log("[ProjectForm] image loaded", url);
                        }}
                        onError={(e) => {
                          if (PHOTO_DEBUG) {
                            console.warn("[ProjectForm] image failed to load", {
                              url,
                              currentSrc: (e.currentTarget as HTMLImageElement).currentSrc,
                            });
                          }
                          (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(url)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                {t("project.cancel")}
              </Button>
              <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
                {t("project.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
