import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Users,
  DollarSign,
  Package,
  UserCircle,
  BarChart3,
  Receipt,
  FileText,
  Crown,
  Shield,
  Menu,
  X,
} from "lucide-react";

interface TabItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileTabMenuProps {
  tabs: TabItem[];
  currentValue: string;
  onTabChange: (value: string) => void;
}

export const MobileTabMenu = ({
  tabs,
  currentValue,
  onTabChange,
}: MobileTabMenuProps) => {
  const [open, setOpen] = useState(false);

  const handleTabClick = (value: string) => {
    onTabChange(value);
    setOpen(false);
  };

  const currentTab = tabs.find((t) => t.value === currentValue);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>
            {currentTab?.label || "Menü"}
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabClick(tab.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  currentValue === tab.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div className="text-2xl">{tab.icon}</div>
                <span className="text-xs font-medium text-center line-clamp-2">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
