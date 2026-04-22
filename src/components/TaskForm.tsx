/**
 * Copyright © 2026 Olcaytp. All rights reserved.
 * This file is part of the Construction Management Application.
 * Licensed under the MIT License. See LICENSE file for details.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Project } from "@/hooks/useProjects";
import type { TeamMember } from "@/hooks/useTeamMembers";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const getFormSchema = (t: any) => {
  const today = new Date().toISOString().split('T')[0];
  
  return z.object({
    title: z.string().min(2, t("validation.taskTitleRequired") || "Görev adı en az 2 karakter olmalı"),
    project: z.string().min(1, t("validation.required") || "Lütfen proje seçin"),
    assignee: z.array(z.string()).min(1, t("validation.required") || "Lütfen sorumlu seçin"),
    dueDate: z.string()
      .min(1, t("validation.required") || "Lütfen tarih seçin"),
    status: z.enum(["pending", "in-progress", "completed"]),
    priority: z.enum(["low", "medium", "high"]),
    estimatedCost: z.coerce.number().min(0, "Tahmini maliyet 0 veya daha büyük olmalı").default(0),
    quantity: z.coerce.number().min(0, "Miktar 0 veya daha büyük olmalı").default(0),
    unit: z.string().min(1, "Birim seçilmelidir").default("adet"),
  }).refine((data) => {
    // Status completed ise tarih kısıtlaması yoktur
    if (data.status === "completed") return true;
    // Diğer durumlar için dueDate bugünden eski olamaz
    return data.dueDate >= today;
  }, {
    message: "Bitiş tarihi bugünün tarihinden eski olamaz",
    path: ["dueDate"]
  });
};

type FormData = z.infer<ReturnType<typeof getFormSchema>>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => void;
  defaultValues?: FormData;
  title: string;
  projects: Project[];
  teamMembers: TeamMember[];
  tasksByProject?: Record<string, number>;
  maxTasksPerProject?: number;
  hasPremiumAccess?: boolean;
  onValidationError?: (message: string) => void;
}

export const TaskForm = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  title,
  projects,
  teamMembers,
  tasksByProject = {},
  maxTasksPerProject = 3,
  hasPremiumAccess = false,
  onValidationError,
}: TaskFormProps) => {
  const { t } = useTranslation();
  const formSchema = getFormSchema(t);
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      title: "",
      project: "",
      assignee: [],
      dueDate: "",
      status: "pending",
      priority: "medium",
      estimatedCost: "",
      quantity: "",
      unit: "adet",
    },
  });

  const selectedStatus = form.watch("status");

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    } else {
      form.reset({
        title: "",
        project: "",
        assignee: [],
        dueDate: "",
        status: "pending",
        priority: "medium",
        estimatedCost: "",
        quantity: "",
        unit: "adet",
      });
    }
  }, [defaultValues, form, open, tasksByProject]);

  const handleSubmit = (data: FormData) => {
    // Validate task limit before submitting (only for new tasks, not editing)
    if (!hasPremiumAccess && !defaultValues) {
      const projectTaskCount = tasksByProject[data.project] || 0;
      if (projectTaskCount >= maxTasksPerProject) {
        onValidationError?.(`Bu proje zaten ${maxTasksPerProject} görev limitine ulaştı. Premium plana yükseltin.`);
        return;
      }
    }
    
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('task.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('task.titlePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="project"
              render={({ field }) => {
                const selectedProject = projects.find((p) => p.id === field.value);
                return (
                  <FormItem>
                    <FormLabel>{t('task.project')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('task.selectProject')}>
                            {selectedProject ? selectedProject.title : t('task.selectProject')}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects
                          .filter((project) => {
                            const taskCount = tasksByProject[project.id] || 0;
                            const isAtLimit = !hasPremiumAccess && taskCount >= maxTasksPerProject;
                            return !isAtLimit;
                          })
                          .map((project) => {
                            const taskCount = tasksByProject[project.id] || 0;
                            return (
                              <SelectItem key={project.id} value={project.id}>
                                {project.title}
                                {taskCount > 0 && ` (${taskCount}${maxTasksPerProject === Infinity ? '' : `/${maxTasksPerProject}`})`}
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="assignee"
              render={({ field }) => {
                const selected: string[] = field.value || [];
                const toggle = (id: string) => {
                  const next = selected.includes(id)
                    ? selected.filter((x) => x !== id)
                    : [...selected, id];
                  field.onChange(next);
                };
                return (
                  <FormItem>
                    <FormLabel>{t('task.master')}</FormLabel>
                    <div className="border border-input rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                      {teamMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">Ekip üyesi yok</p>
                      ) : (
                        teamMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggle(member.id)}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                              ${selected.includes(member.id) ? "bg-primary border-primary" : "border-input"}`}>
                              {selected.includes(member.id) && (
                                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm">{member.name}</span>
                            {member.specialty && (
                              <span className="text-xs text-muted-foreground ml-auto">{member.specialty}</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {selected.length > 0 && (
                      <p className="text-xs text-muted-foreground">{selected.length} usta seçildi</p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('task.dueDate')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      key={`dueDate-${selectedStatus}`}
                      {...field}
                      min={selectedStatus === "completed" ? "" : new Date().toISOString().split('T')[0]}
                    />
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
                  <FormLabel>{t('task.status')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('task.selectStatus')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">{t('task.status.pending')}</SelectItem>
                      <SelectItem value="in-progress">{t('task.status.in-progress')}</SelectItem>
                      <SelectItem value="completed">{t('task.status.completed')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('task.priority')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('task.selectPriority')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">{t('task.priority.low')}</SelectItem>
                      <SelectItem value="medium">{t('task.priority.medium')}</SelectItem>
                      <SelectItem value="high">{t('task.priority.high')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimatedCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('task.estimatedCost')}</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder={t('task.estimatedCostPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('task.quantity') || 'Miktar'}</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder={t('task.quantityPlaceholder') || 'Örn: 100'} {...field} />
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
                  <FormLabel>{t('task.unit') || 'Birim'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('task.selectUnit') || 'Birim seçin'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="adet">Adet</SelectItem>
                      <SelectItem value="m2">m² (Metrekare)</SelectItem>
                      <SelectItem value="m3">m³ (Metreküp)</SelectItem>
                      <SelectItem value="kg">kg (Kilogram)</SelectItem>
                      <SelectItem value="ton">Ton</SelectItem>
                      <SelectItem value="m">m (Meter)</SelectItem>
                      <SelectItem value="cm">cm (Santimetre)</SelectItem>
                      <SelectItem value="lt">Litre</SelectItem>
                      <SelectItem value="saat">Saat</SelectItem>
                      <SelectItem value="gün">Gün</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('task.cancel')}
              </Button>
              <Button type="submit">{t('task.save')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
