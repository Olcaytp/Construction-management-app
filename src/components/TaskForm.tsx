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
    assignee: z.string().min(1, t("validation.required") || "Lütfen sorumlu seçin"),
    dueDate: z.string()
      .min(1, t("validation.required") || "Lütfen tarih seçin"),
    status: z.enum(["pending", "in-progress", "completed"]),
    priority: z.enum(["low", "medium", "high"]),
    estimatedCost: z.coerce.number().min(0, "Tahmini maliyet 0 veya daha büyük olmalı").default(0),
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
      assignee: "",
      dueDate: "",
      status: "pending",
      priority: "medium",
      estimatedCost: "",
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
        assignee: "",
        dueDate: "",
        status: "pending",
        priority: "medium",
        estimatedCost: "",
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('task.project')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('task.selectProject')} />
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
                              {taskCount > 0 && ` (${taskCount}/${maxTasksPerProject})`}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('task.assignee')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('task.selectAssignee')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
                      <SelectItem value="pending">{t('task.pending')}</SelectItem>
                      <SelectItem value="in-progress">{t('task.inProgress')}</SelectItem>
                      <SelectItem value="completed">{t('task.completed')}</SelectItem>
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
                      <SelectItem value="low">{t('task.low')}</SelectItem>
                      <SelectItem value="medium">{t('task.medium')}</SelectItem>
                      <SelectItem value="high">{t('task.high')}</SelectItem>
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
