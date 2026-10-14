import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Download, Images, Pencil, Shuffle, RotateCcw } from "lucide-react";
import { formatAspect } from "@/lib/designMeta";

export default function ResultPanel({ result, format, busy, onEdit, onVariation, onRegenerate }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border">
        <div className={formatAspect(format)}>
          <Image src={result.url} alt="Generated design" className="h-full w-full" fittingType="fill" />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Charged <span className="font-semibold text-foreground">{result.tokensCharged}</span> tokens · Saved to your gallery.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={result.url} target="_blank" rel="noreferrer" download>
              <Download className="mr-2 h-4 w-4" /> Download
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} disabled={busy}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onVariation} disabled={busy}>
            <Shuffle className="mr-2 h-4 w-4" /> Variation
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={busy}>
            <RotateCcw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link to="/gallery">
              <Images className="mr-2 h-4 w-4" /> Gallery
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}