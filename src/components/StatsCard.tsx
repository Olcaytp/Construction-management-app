import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "warning" | "info";
}

export const StatsCard = ({ title, value, icon: Icon, trend, variant = "default" }: StatsCardProps) => {
  const variantStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  };

  // Dynamically scale value text to prevent overflow on small screens
  const valueText = String(value);
  const len = valueText.length;
  const sizeClass =
    len >= 12 ? "text-xl" : len >= 10 ? "text-2xl" : "text-3xl";

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`${sizeClass} sm:text-3xl font-bold text-foreground leading-tight whitespace-nowrap`}>{value}</p>
            {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
