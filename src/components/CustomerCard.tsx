import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Pencil, Trash2 } from "lucide-react";

interface CustomerCardProps {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  totalReceivable: number;
  totalPaid: number;
  projectCount?: number;
  onEdit: () => void;
  onDelete: () => void;
}

export const CustomerCard = ({
  name,
  phone,
  address,
  notes,
  totalReceivable,
  totalPaid,
  projectCount = 0,
  onEdit,
  onDelete,
}: CustomerCardProps) => {
  const { t, i18n } = useTranslation();
  
  const balance = totalReceivable - totalPaid;

  const formatCurrency = (amount: number) => {
    const currentLanguage = i18n.language;
    let locale = 'tr-TR';
    let currencySymbol = '₺';
    let symbolAtEnd = false;

    if (currentLanguage.startsWith('sv')) {
      locale = 'sv-SE';
      currencySymbol = 'kr';
      symbolAtEnd = true;
    } else if (currentLanguage.startsWith('en')) {
      locale = 'en-US';
      currencySymbol = '$';
      symbolAtEnd = false;
    }

    const formattedAmount = Math.abs(amount).toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    const sign = amount < 0 ? '-' : '';
    
    if (symbolAtEnd) {
      return `${sign}${formattedAmount} ${currencySymbol}`;
    } else {
      return `${sign}${currencySymbol}${formattedAmount}`;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{phone}</span>
          </div>
        )}
        
        {address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{address}</span>
          </div>
        )}

        {notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{notes}</p>
        )}

        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("customer.totalReceivable")}</span>
            <span className="font-medium">{formatCurrency(totalReceivable)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("customer.totalPaid")}</span>
            <span className="font-medium">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex justify-between text-sm pt-1 border-t border-border">
            <span className="font-medium">{t("customer.balance")}</span>
            <span className={`font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>

        {projectCount > 0 && (
          <div className="text-xs text-muted-foreground">
            {projectCount} {t("customer.projects")}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
