import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[hsl(215,47%,22%)] group-[.toaster]:text-white group-[.toaster]:border-[hsl(215,47%,22%)] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-white/80",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-[hsl(215,47%,22%)]",
          cancelButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white",
          error: "group-[.toaster]:bg-destructive group-[.toaster]:text-white group-[.toaster]:border-destructive",
          success: "group-[.toaster]:bg-[hsl(142,71%,35%)] group-[.toaster]:text-white group-[.toaster]:border-[hsl(142,71%,35%)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
