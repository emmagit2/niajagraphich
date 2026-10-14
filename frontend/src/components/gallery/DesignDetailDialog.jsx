import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image } from "@/components/ui/image";
import { Loader2, Download, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatAspect, categoryLabel, styleLabel } from "@/lib/designMeta";
import { formatDate } from "@/lib/format";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function DesignDetailDialog({ asset, src, open, onOpenChange, onVariation }) {
  const [generation, setGeneration] = useState(null);

  useEffect(() => {
    if (!open || !asset?.generation_id) { setGeneration(null); return; }
    let cancelled = false;
    base44.entities.Generation.get(asset.generation_id)
      .then((g) => { if (!cancelled) setGeneration(g); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, asset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{asset?.prompt ? asset.prompt.slice(0, 90) : "Design details"}</DialogTitle>
          <DialogDescription>Generated {asset ? formatDate(asset.created_date) : ""}</DialogDescription>
        </DialogHeader>
        {asset && (
          <div className="space-y-4">
            <div className={`mx-auto w-full max-w-md overflow-hidden rounded-xl border ${formatAspect(asset.format)}`}>
              {src ? (
                <Image src={src} alt={asset.prompt || "Design"} className="h-full w-full" fittingType="fill" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-muted">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </span>
              )}
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {asset.category && (
                <p className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="secondary">{categoryLabel(asset.category)}</Badge>
                </p>
              )}
              <p className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Format</span>
                <Badge variant="outline">{asset.format}</Badge>
              </p>
              {generation && (
                <>
                  <p className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground">Operation</span>
                    <span className="font-medium capitalize">{generation.operation}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground">Quality</span>
                    <span className="font-medium capitalize">{generation.quality}</span>
                  </p>
                  {generation.style && (
                    <p className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground">Style</span>
                      <span className="font-medium">{styleLabel(generation.style)}</span>
                    </p>
                  )}
                  <p className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground">Tokens charged</span>
                    <span className="font-semibold text-destructive">-{generation.tokens_charged}</span>
                  </p>
                </>
              )}
            </div>
            <DialogFooter className="flex-row gap-2 sm:justify-end">
              {src && (
                <Button asChild variant="outline">
                  <a href={src} target="_blank" rel="noreferrer" download>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </a>
                </Button>
              )}
              <Button className="bg-primary hover:bg-primary/90" onClick={onVariation} disabled={!src}>
                <Wand2 className="mr-2 h-4 w-4" /> Create variation
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}