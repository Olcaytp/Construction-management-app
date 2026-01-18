import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
      <div className="bg-muted rounded-full p-4 sm:p-6 mb-4">
        <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 text-center">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-muted-foreground text-center max-w-md mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="default">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
