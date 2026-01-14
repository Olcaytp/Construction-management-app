/**
 * Copyright © 2026 Olcaytp. All rights reserved.
 * This file is part of the Construction Management Application.
 * Licensed under the MIT License. See LICENSE file for details.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";
import { WORK_TYPES, Invoice } from "@/hooks/useInvoices";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useProjects } from "@/hooks/useProjects";

const getFormSchema = (t: any) => z.object({
  project_id: z.string().min(1, t("validation.required") || "Project must be selected"),
  assigned_to: z.string().optional(),
  work_type: z.string().min(1, t("validation.required") || "Work type must be selected"),
  work_type_label: z.string().optional(),
  quantity: z.coerce.number().min(0.01, t("validation.required") || "Quantity must be greater than 0").default(0),
  unit: z.string().min(1, t("validation.required") || "Unit must be specified").default("adet"),
  unit_price: z.coerce.number().min(0.01, t("validation.required") || "Unit price must be greater than 0").default(0),
  description: z.string().optional(),
  status: z.enum(["pending", "approved", "paid"]).default("pending"),
  custom_work_type: z.string().optional(),
  custom_unit: z.string().optional(),
});

type InvoiceFormValues = z.infer<ReturnType<typeof getFormSchema>>;

interface InvoiceFormProps {
  projectId?: string;
  onSubmit: (data: Omit<Invoice, "id" | "created_at" | "updated_at" | "user_id">) => void;
  initialData?: Partial<Invoice>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const InvoiceForm = ({
  projectId: defaultProjectId,
  onSubmit,
  initialData,
  isOpen: controlledIsOpen,
  onOpenChange,
}: InvoiceFormProps) => {
  const { t, i18n } = useTranslation();
  const { teamMembers } = useTeamMembers();
  const { projects } = useProjects();
  const [isOpen, setIsOpen] = useState(controlledIsOpen ?? false);
  
  const formSchema = getFormSchema(t);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_id: initialData?.project_id || defaultProjectId || "",
      assigned_to: initialData?.assigned_to || "",
      work_type: initialData?.work_type || "",
      work_type_label: initialData?.work_type_label || "",
      quantity: initialData?.quantity || 0,
      unit: initialData?.unit || "adet",
      unit_price: initialData?.unit_price || 0,
      description: initialData?.description || "",
      status: (initialData?.status as any) || "pending",
      custom_work_type: "",
      custom_unit: "adet",
    },
  });

  const watchValues = form.watch();
  const isCustomWorkType = watchValues.work_type === "custom";

  const formatCurrency = (amount: number) => {
    const lang = i18n.language;
    const isSv = lang.startsWith("sv");
    const isEn = lang.startsWith("en");
    const locale = isSv ? "sv-SE" : isEn ? "en-US" : "tr-TR";
    const symbol = isSv ? "kr" : isEn ? "$" : "₺";
    const symbolAtEnd = isSv;
    const formatted = amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return symbolAtEnd ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
  };

  const currencySymbol = i18n.language.startsWith("sv") ? "kr" : i18n.language.startsWith("en") ? "$" : "₺";

  const getWorkTypeLabel = (value: string) => t(`invoice.workTypes.${value}`, { defaultValue: WORK_TYPES.find((type) => type.value === value)?.label || value });

  const selectedType = WORK_TYPES.find((t) => t.value === watchValues.work_type);
  const unit = isCustomWorkType ? (watchValues.custom_unit || "adet") : (selectedType?.unit || t("invoice.form.unit"));
  const workTypeLabel = isCustomWorkType ? watchValues.custom_work_type : getWorkTypeLabel(watchValues.work_type);
  const total = (watchValues.quantity || 0) * (watchValues.unit_price || 0);

  const handleSubmit = async (values: InvoiceFormValues) => {
    try {
      const finalWorkType = isCustomWorkType ? values.custom_work_type : values.work_type;
      if (!values.project_id || !finalWorkType || !values.quantity || !values.unit_price) {
        return;
      }

      onSubmit({
        project_id: values.project_id,
        assigned_to: values.assigned_to || undefined,
        work_type: isCustomWorkType ? "custom" : values.work_type,
        work_type_label: workTypeLabel,
        quantity: values.quantity,
        unit: unit,
        unit_price: values.unit_price,
        description: values.description || undefined,
        status: values.status,
      });

      form.reset({
        project_id: defaultProjectId || "",
        assigned_to: "",
        work_type: "",
        work_type_label: "",
        quantity: 0,
        unit: "adet",
        unit_price: 0,
        description: "",
        status: "pending",
        custom_work_type: "",
        custom_unit: "adet",
      });
      setIsOpen(false);
      onOpenChange?.(false);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("invoice.form.addButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10">
          <DialogTitle>{t("invoice.form.title")}</DialogTitle>
          <DialogDescription>{t("invoice.form.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 px-0">
            {/* Project Selection */}
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <label className="text-sm font-medium">{t("invoice.form.project")}</label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("invoice.form.projectPlaceholder") || undefined} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">{t("invoice.form.projectEmpty")}</div>
                      ) : (
                        projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Worker Selection */}
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <label className="text-sm font-medium">{t("invoice.form.workerOptional")}</label>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("invoice.form.workerPlaceholder") || undefined} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} - {member.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {teamMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("invoice.form.noTeamMembers")}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Work Type */}
            <FormField
              control={form.control}
              name="work_type"
              render={({ field }) => (
                <FormItem>
                  <label className="text-sm font-medium">{t("invoice.form.workType")}</label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("invoice.form.workTypePlaceholder") || undefined} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WORK_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {getWorkTypeLabel(type.value)}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">+ {t("invoice.form.customWorkType")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Work Type Input */}
            {isCustomWorkType && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg border border-muted">
                <FormField
                  control={form.control}
                  name="custom_work_type"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-sm font-medium">İş Türü Adı</label>
                      <FormControl>
                        <Input placeholder="örn: Boyacılık, Temizlik..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="custom_unit"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-sm font-medium">Birim</label>
                      <FormControl>
                        <Input placeholder="örn: m², adet, m..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Quantity and Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <label className="text-sm font-medium">{t("invoice.form.quantity")} ({unit})</label>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <label className="text-sm font-medium">{t("invoice.form.unitPrice", { symbol: currencySymbol })}</label>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Amount Display */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t("invoice.form.total")}</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <label className="text-sm font-medium">{t("invoice.form.descriptionLabel")}</label>
                  <FormControl>
                    <Textarea placeholder={t("invoice.form.descriptionPlaceholder") || undefined} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 sticky bottom-0 bg-background border-t">
              <Button type="button" variant="outline" onClick={() => {
                form.reset();
                setIsOpen(false);
                onOpenChange?.(false);
              }}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("invoice.form.submit")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
