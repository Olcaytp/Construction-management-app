import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskItemProps {
  title: string;
  project: string;
  assignee: string;
  dueDate: string;
  status: "pending" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
  onStatusChange?: (status: "pending" | "in-progress" | "completed") => void;
}

export const TaskItem = ({
  title,
  project,
  assignee,
  dueDate,
  status,
  priority = "medium",
  onStatusChange,
}: TaskItemProps) => {
  const { t } = useTranslation();

  const statusColors = {
    pending: "bg-warning text-warning-foreground",
    "in-progress": "bg-info text-info-foreground",
    completed: "bg-success text-success-foreground",
  };

  const statusLabels = {
    pending: t('task.pending'),
    "in-progress": t('task.inProgress'),
    completed: t('task.completed'),
  };

  const priorityColors = {
    low: "border-l-success",
    medium: "border-l-warning",
    high: "border-l-destructive",
  };

  return (
    <Card className={`border-l-4 ${priorityColors[priority]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{project}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {assignee}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {dueDate}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange?.("pending")}>
                {t('task.pending')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange?.("in-progress")}>
                {t('task.inProgress')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange?.("completed")}>
                {t('task.completed')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};