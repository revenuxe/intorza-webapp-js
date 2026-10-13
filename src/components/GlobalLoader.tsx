import intorzaLoaderLogo from "@/assets/intorza-loader-logo.webp";

interface GlobalLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const GlobalLoader = ({ message = "Loading...", fullScreen = true }: GlobalLoaderProps) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullScreen ? 'fixed inset-0 bg-background/95 backdrop-blur-sm z-50' : 'py-12'}`}>
      <div className="relative flex items-center justify-center">
        {/* Animated ring */}
        <div className="absolute w-24 h-24 rounded-xl border-4 border-primary/30 animate-loader-ring" />
        <div className="absolute w-24 h-24 rounded-xl border-4 border-secondary/20 animate-loader-ring" style={{ animationDelay: '0.5s' }} />
        
        {/* Logo container with pulse */}
        <div className="relative w-20 h-20 flex items-center justify-center animate-loader-pulse">
          <img 
            src={intorzaLoaderLogo.src}
            alt="Loading" 
            className="w-16 h-16 object-contain"
          />
        </div>
      </div>
      
      {/* Loading text */}
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
};

// Smaller inline loader for buttons and components
export const InlineLoader = ({ size = "sm" }: { size?: "sm" | "md" }) => {
  const sizeClasses = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  
  return (
    <div className={`${sizeClasses} animate-spin rounded-full border-2 border-primary border-t-transparent`} />
  );
};
