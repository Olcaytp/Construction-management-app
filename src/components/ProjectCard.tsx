import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Calendar, Users, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProjectCardProps {
  title: string;
  location: string;
  startDate: string;
  team: string;
  progress: number;
  status: "active" | "completed" | "planning";
  photos?: string[];
  onClick?: () => void;
}

export const ProjectCard = ({ 
  title, 
  location, 
  startDate, 
  team, 
  progress, 
  status,
  photos = [],
  onClick 
}: ProjectCardProps) => {
  const { t } = useTranslation();
  const PHOTO_DEBUG = import.meta.env.DEV;

  const statusColors = {
    active: "bg-success text-success-foreground",
    completed: "bg-muted text-muted-foreground",
    planning: "bg-warning text-warning-foreground",
  };

  const statusLabels = {
    active: t("project.active"),
    completed: t("project.completed"),
    planning: t("project.planning"),
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 cursor-pointer border-border hover:border-primary/50" 
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
          <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.slice(0, 3).map((photo, index) => (
              <img 
                key={index} 
                src={photo} 
                alt={`${title} ${index + 1}`} 
                loading="lazy"
                className="w-20 h-20 object-cover rounded flex-shrink-0"
                onLoad={() => {
                  // if (PHOTO_DEBUG) console.log("[ProjectCard] image loaded", photo);
                }}
                onError={(e) => {
                  console.warn("[ProjectCard] photo failed to load", {
                    photo,
                    currentSrc: (e.currentTarget as HTMLImageElement).currentSrc,
                  });
                  (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            ))}
            {photos.length > 3 && (
              <div className="w-20 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-muted-foreground">+{photos.length - 3}</span>
              </div>
            )}
          </div>
        )}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground break-words">
            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
            {startDate}
          </div>
          <div className="flex items-center text-sm text-muted-foreground break-words">
            <Users className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">{team}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("project.progress")}</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
};
