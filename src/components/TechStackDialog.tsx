import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Network, FileImage, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import {
  buildTechStackSVG,
  downloadTechStackPNG,
  downloadTechStackSVG,
} from "@/lib/techStackDiagram";

export const TechStackDialog = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const svgMarkup = useMemo(() => (open ? buildTechStackSVG() : ""), [open]);

  const handlePng = async () => {
    setBusy(true);
    try {
      await downloadTechStackPNG();
      toast.success("Tech stack diagram downloaded (PNG)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download the diagram");
    } finally {
      setBusy(false);
    }
  };

  const handleSvg = () => {
    try {
      downloadTechStackSVG();
      toast.success("Tech stack diagram downloaded (SVG)");
    } catch {
      toast.error("Could not download the diagram");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3">
          <Network className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Tech stack</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(96vw,1200px)] max-h-[92vh] overflow-hidden rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base sm:text-lg">Product &amp; tech stack diagram</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            How INTORZA is put together — clients, app modules, database, storage, hosting and the
            services they connect to.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto rounded-xl border bg-muted/30 p-2 max-h-[62vh]">
          <div
            className="min-w-[760px] [&>svg]:h-auto [&>svg]:w-full"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
          <Button variant="outline" onClick={handleSvg} className="rounded-xl">
            <FileCode2 className="h-4 w-4 mr-2" />
            Download SVG
          </Button>
          <Button onClick={handlePng} disabled={busy} className="rounded-xl">
            {busy ? (
              <Download className="h-4 w-4 mr-2 animate-pulse" />
            ) : (
              <FileImage className="h-4 w-4 mr-2" />
            )}
            {busy ? "Preparing…" : "Download PNG"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
