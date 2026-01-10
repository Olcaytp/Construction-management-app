import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Plus } from "lucide-react";
import { WORK_TYPES, Invoice } from "@/hooks/useInvoices";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useProjects } from "@/hooks/useProjects";

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
  const [selectedProject, setSelectedProject] = useState(initialData?.project_id || defaultProjectId || "");
  const [selectedWorkType, setSelectedWorkType] = useState(initialData?.work_type || "");
  const [selectedWorker, setSelectedWorker] = useState(initialData?.assigned_to || "");
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || "");
  const [unitPrice, setUnitPrice] = useState(initialData?.unit_price?.toString() || "");
  const [description, setDescription] = useState(initialData?.description || "");

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

  const selectedType = WORK_TYPES.find((t) => t.value === selectedWorkType);
  const unit = selectedType?.unit || t("invoice.form.unit");
  const total = quantity && unitPrice ? parseFloat(quantity) * parseFloat(unitPrice) : 0;

  const handleSubmit = () => {
    if (!selectedProject || !selectedWorkType || !quantity || !unitPrice) {
      alert(t("invoice.form.fillRequired"));
      return;
    }

    onSubmit({
      project_id: selectedProject,
      assigned_to: selectedWorker || undefined,
      work_type: selectedWorkType,
      work_type_label: getWorkTypeLabel(selectedWorkType),
      quantity: parseFloat(quantity),
      unit: unit,
      unit_price: parseFloat(unitPrice),
      description: description || undefined,
      status: "pending",
    });

    // Reset form
    setSelectedProject(defaultProjectId || "");
    setSelectedWorkType("");
    setSelectedWorker("");
    setQuantity("");
    setUnitPrice("");
    setDescription("");
    setIsOpen(false);
    onOpenChange?.(false);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("invoice.form.title")}</DialogTitle>
          <DialogDescription>{t("invoice.form.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">{t("invoice.form.project")}</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="project">
                <SelectValue placeholder={t("invoice.form.projectPlaceholder") || undefined} />
              </SelectTrigger>
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
          </div>

          {/* Worker Selection */}
          <div className="space-y-2">
            <Label htmlFor="worker">{t("invoice.form.workerOptional")}</Label>
            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger id="worker">
                <SelectValue placeholder={t("invoice.form.workerPlaceholder") || undefined} />
              </SelectTrigger>
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
          </div>

          {/* Work Type */}
          <div className="space-y-2">
            <Label htmlFor="work-type">{t("invoice.form.workType")}</Label>
            <Select value={selectedWorkType} onValueChange={setSelectedWorkType}>
              <SelectTrigger id="work-type">
                <SelectValue placeholder={t("invoice.form.workTypePlaceholder") || undefined} />
              </SelectTrigger>
              <SelectContent>
                {WORK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {getWorkTypeLabel(type.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t("invoice.form.quantity")} ({unit})</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-price">{t("invoice.form.unitPrice", { symbol: currencySymbol })}</Label>
              <Input
                id="unit-price"
                type="number"
                placeholder="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Total Amount Display */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t("invoice.form.total")}</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("invoice.form.descriptionLabel")}</Label>
            <Textarea
              id="description"
              placeholder={t("invoice.form.descriptionPlaceholder") || undefined}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit}>{t("invoice.form.submit")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
