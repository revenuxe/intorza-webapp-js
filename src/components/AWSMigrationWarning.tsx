import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, Server } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface AWSMigrationWarningProps {
  pageName: string;
}

export const AWSMigrationWarning = ({ pageName }: AWSMigrationWarningProps) => {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check if user has already dismissed for this session/page
    const dismissedKey = `aws_migration_dismissed_${location.pathname}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey);
    
    if (!wasDismissed) {
      setOpen(true);
    } else {
      setDismissed(true);
    }
  }, [location.pathname]);

  const handleProceed = () => {
    const dismissedKey = `aws_migration_dismissed_${location.pathname}`;
    sessionStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
    // Navigate back
    window.history.back();
  };

  if (dismissed) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-[340px] rounded-xl p-4 gap-3">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
              <Server className="h-5 w-5 text-warning" />
            </div>
            <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
              Migration in Progress
            </Badge>
          </div>
          <AlertDialogTitle className="text-base font-semibold text-left">
            Server Update Notice
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-left leading-relaxed">
            We are currently migrating <strong>{pageName}</strong> to AWS for better performance. 
            <span className="block mt-2 text-warning font-medium">
              Saving data in this section may face temporary issues.
            </span>
            <span className="block mt-1 text-muted-foreground">
              Sorry for the inconvenience.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
          <AlertDialogCancel 
            onClick={handleCancel}
            className="flex-1 m-0"
          >
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleProceed}
            className="flex-1 m-0"
          >
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
