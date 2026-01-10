import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Package } from "lucide-react";

interface MaterialItemProps {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  actualCost: number;
  status: string;
  supplier: string | null;
  onEdit: () => void;
  onDelete: () => void;
  currencySymbol: string;
  currencyCode: string;
  currencyLocale: string;
}

const statusColors: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  ordered: "bg-blue-500/10 text-blue-600",
  delivered: "bg-green-500/10 text-green-600",
  "in-use": "bg-orange-500/10 text-orange-600",
};

export const MaterialItem = ({
  name,
  quantity,
  unit,
  estimatedCost,
  actualCost,
  status,
  supplier,
  onEdit,
  onDelete,
  currencySymbol,
  currencyCode,
  currencyLocale,
}: MaterialItemProps) => {
  const { t } = useTranslation();

  const statusLabel = (() => {
    if (status === "planned") return t("material.planned");
    if (status === "ordered") return t("material.ordered");
    if (status === "delivered") return t("material.delivered");
    if (status === "in-use") return t("material.inUse");
    return status;
  })();

  const formatMoney = (value: number) => {
    try {
      return new Intl.NumberFormat(currencyLocale, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(value || 0);
    } catch {
      return `${currencySymbol}${(value || 0).toLocaleString()}`;
    }
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">{name}</h3>
                <Badge className={statusColors[status]}>{statusLabel}</Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground space-y-1">
                <p>{t('material.quantity')}: {quantity} {unit}</p>
                <p>{t('material.estimatedCost')}: {formatMoney(estimatedCost)}</p>
                {actualCost > 0 && <p>{t('material.actualCost')}: {formatMoney(actualCost)}</p>}
                {supplier && <p>{t('material.supplier')}: {supplier}</p>}
              </div>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
