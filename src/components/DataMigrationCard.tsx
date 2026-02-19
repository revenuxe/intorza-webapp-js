import { useState } from "react";
import { Cloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { runFullMigration, type MigrationProgress, type MigrationResult } from "@/lib/awsMigration";

export const DataMigrationCard = () => {
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const [currentType, setCurrentType] = useState<string>("");
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setResult(null);
    setProgress(null);

    try {
      const migrationResult = await runFullMigration((type, p) => {
        setCurrentType(type);
        setProgress(p);
      });

      setResult(migrationResult);

      const totalMigrated = 
        migrationResult.quotations.migrated +
        migrationResult.invoices.migrated +
        migrationResult.clients.migrated +
        migrationResult.measurements.migrated +
        migrationResult.libraryItems.migrated +
        migrationResult.librarySections.migrated;

      const totalFailed = 
        migrationResult.quotations.failed +
        migrationResult.invoices.failed +
        migrationResult.clients.failed +
        migrationResult.measurements.failed +
        migrationResult.libraryItems.failed +
        migrationResult.librarySections.failed;

      if (totalFailed === 0) {
        toast({
          title: "Migration Complete",
          description: `Successfully migrated ${totalMigrated} records to AWS`,
        });
      } else {
        toast({
          title: "Migration Completed with Errors",
          description: `Migrated ${totalMigrated} records, ${totalFailed} failed`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Migration failed:", error);
      toast({
        title: "Migration Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
      setCurrentType("");
      setProgress(null);
    }
  };

  const progressPercentage = progress 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Cloud className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">AWS Data Sync</CardTitle>
            <CardDescription>
              Migrate your existing data to AWS backend
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && !isMigrating && (
          <p className="text-sm text-muted-foreground">
            This will sync all your quotations, invoices, clients, measurements, and library items to AWS.
            This is a one-time operation to migrate existing data.
          </p>
        )}

        {isMigrating && progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize">{currentType.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span>{progress.completed}/{progress.total}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            {progress.currentItem && (
              <p className="text-xs text-muted-foreground truncate">
                Migrating: {progress.currentItem}
              </p>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <ResultRow label="Clients" result={result.clients} />
              <ResultRow label="Quotations" result={result.quotations} />
              <ResultRow label="Invoices" result={result.invoices} />
              <ResultRow label="Measurements" result={result.measurements} />
              <ResultRow label="Library Items" result={result.libraryItems} />
              <ResultRow label="Sections" result={result.librarySections} />
            </div>
          </div>
        )}

        <Button 
          onClick={handleMigrate} 
          disabled={isMigrating}
          className="w-full"
        >
          {isMigrating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Migrating...
            </>
          ) : result ? (
            "Run Migration Again"
          ) : (
            "Start Migration"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

const ResultRow = ({ 
  label, 
  result 
}: { 
  label: string; 
  result: { migrated: number; failed: number } 
}) => {
  const hasErrors = result.failed > 0;
  const Icon = hasErrors ? AlertCircle : CheckCircle;
  
  return (
    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Icon className={`h-4 w-4 ${hasErrors ? 'text-destructive' : 'text-green-600'}`} />
        <span className={hasErrors ? 'text-destructive' : 'text-green-600'}>
          {result.migrated}
        </span>
        {hasErrors && (
          <span className="text-destructive text-xs">({result.failed} failed)</span>
        )}
      </div>
    </div>
  );
};
