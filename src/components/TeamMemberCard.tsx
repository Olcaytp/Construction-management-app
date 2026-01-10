import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Briefcase, Pencil, Trash2, TrendingUp, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TeamMemberCardProps {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  dailyWage?: number;
  totalReceivable?: number;
  totalPaid?: number;
  onEdit: () => void;
  onDelete: () => void;
}

export const TeamMemberCard = ({
  name,
  phone,
  specialty,
  dailyWage = 0,
  totalReceivable = 0,
  totalPaid = 0,
  onEdit,
  onDelete,
}: TeamMemberCardProps) => {
  const { t } = useTranslation();
  const balance = totalReceivable - totalPaid;

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <h3 className="font-semibold text-foreground text-lg">{name}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span className="break-all">{phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Badge variant="secondary">{specialty}</Badge>
              </div>
              {dailyWage > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 flex-shrink-0" />
                  <span>{t("team.dailyWage")}: {dailyWage.toLocaleString()}</span>
                </div>
              )}
              {(totalReceivable > 0 || totalPaid > 0) && (
                <div className="grid grid-cols-1 gap-2 mt-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("team.totalReceivable")}:</span>
                    <span className="font-medium">{totalReceivable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("team.totalPaid")}:</span>
                    <span className="font-medium text-success">{totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="font-medium text-muted-foreground">{t("team.balance")}:</span>
                    <span className={`font-bold ${balance > 0 ? 'text-warning' : 'text-success'}`}>
                      {balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex sm:flex-col gap-2">
            <Button variant="ghost" size="icon" onClick={onEdit} className="flex-1 sm:flex-none">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="flex-1 sm:flex-none">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
