import { cn } from "@/lib/utils";
import intorzaLoaderLogo from "@/assets/intorza-loader-logo.webp";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

// Card skeleton for quotations/invoices lists
function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex justify-between pt-2 border-t">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

// Dashboard stat card skeleton
function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

// Page loader with branded logo
function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-20 h-20 rounded-xl border-4 border-primary/30 animate-loader-ring" />
        <div className="absolute w-20 h-20 rounded-xl border-4 border-secondary/20 animate-loader-ring" style={{ animationDelay: '0.5s' }} />
        <div className="relative w-16 h-16 flex items-center justify-center animate-loader-pulse">
          <img 
            src={intorzaLoaderLogo.src}
            alt="Loading" 
            className="w-12 h-12 object-contain"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

// List skeleton with multiple cards
function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Dashboard skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { 
  Skeleton, 
  CardSkeleton, 
  StatCardSkeleton, 
  PageLoader, 
  ListSkeleton,
  DashboardSkeleton 
};
