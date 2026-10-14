import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image } from "@/components/ui/image";
import { Loader2, Download, Trash2, Wand2 } from "lucide-react";
import { formatAspect, categoryLabel } from "@/lib/designMeta";
import { formatDate } from "@/lib/format";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DesignCard({ asset, src, onOpen, onVariation, onDelete, deleting }) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open design details"
        className={`block w-full ${formatAspect(asset.format)}`}
      >
        {src ? (
          <Image src={src} alt={asset.prompt || "Design"} className="h-full w-full" fittingType="fill" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </span>
        )}
      </button>
      <CardContent className="space-y-3 p-4">
        <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{asset.prompt || "Untitled design"}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {asset.category && <Badge variant="secondary">{categoryLabel(asset.category)}</Badge>}
            <Badge variant="outline">{asset.format}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(asset.created_date)}</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          {src && (
            <Button asChild variant="ghost" size="icon" aria-label="Download design">
              <a href={src} target="_blank" rel="noreferrer" download>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Create variation" onClick={onVariation} disabled={!src}>
            <Wand2 className="h-4 w-4 text-primary" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Delete design" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this design?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{(asset.prompt || "Untitled design").slice(0, 80)}" will be permanently removed from your gallery.
                  Tokens already spent are not refunded.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(asset.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}