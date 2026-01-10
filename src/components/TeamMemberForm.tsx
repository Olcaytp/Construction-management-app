import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
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
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  specialty: z.string().min(2),
  dailyWage: z.coerce.number().min(0),
  totalReceivable: z.coerce.number().min(0),
  totalPaid: z.coerce.number().min(0),
});

type FormData = z.infer<typeof formSchema>;

interface TeamMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => void;
  defaultValues?: FormData;
  title: string;
}

export const TeamMemberForm = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  title,
}: TeamMemberFormProps) => {
  const { t } = useTranslation();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      name: "",
      phone: "",
      specialty: "",
      dailyWage: 0,
      totalReceivable: 0,
      totalPaid: 0,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    } else {
      form.reset({
        name: "",
        phone: "",
        specialty: "",
        dailyWage: 0,
        totalReceivable: 0,
        totalPaid: 0,
      });
    }
  }, [defaultValues, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("team.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("team.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.phone")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("team.phonePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.specialty")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("team.specialtyPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dailyWage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("team.dailyWage")}</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder={t("team.dailyWagePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalReceivable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.totalReceivable")}</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder={t("team.totalReceivablePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team.totalPaid")}</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder={t("team.totalPaidPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                {t("team.cancel")}
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                {t("team.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
