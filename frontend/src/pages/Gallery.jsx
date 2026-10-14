import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Images, Search, RefreshCw } from "lucide-react";
import { FORMATS } from "@/lib/designMeta";
import DesignCard from "@/components/gallery/DesignCard";
import DesignDetailDialog from "@/components/gallery/DesignDetailDialog";

export default function Gallery() {
  const navigate = useNavigate();
  const meRef = useRef(null);
  const [items, setItems] = useState([]);
  const [urls, setUrls] = useState({});
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("-created_date");
  const [formatFilter, setFormatFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const buildQuery = () => ({
    ...(meRef.current ? { user_id: meRef.current } : {}),
    ...(formatFilter !== "all" && { format: formatFilter }),
    ...(debounced && { prompt: { $regex: debounced, $options: "i" } }),
  });

  const load = async (nextCursor) => {
    try {
      if (!meRef.current) meRef.current = (await base44.auth.me()).id;
      const page = await base44.entities.DesignAsset.filter(buildQuery(), {
        sort, limit: 24, cursor: nextCursor || undefined,
      });
      const newItems = page.items || [];
      setItems((prev) => nextCursor ? [...prev, ...newItems] : newItems);
      setCursor(page.next_cursor);
      setHasMore(page.has_more);

      const newUrls = {};
      await Promise.all(newItems.filter((a) => a.file_uri).map(async (a) => {
        try {
          const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: a.file_uri });
          newUrls[a.id] = signed_url;
        } catch (_err) { /* falls back to file_url */ }
      }));
      setUrls((prev) => ({ ...prev, ...newUrls }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(null); }, [debounced, sort, formatFilter]);

  const variation = (asset) => {
    const src = urls[asset.id] || asset.file_url;
    navigate("/studio", {
      state: {
        prompt: asset.prompt,
        category: asset.category,
        operation: "variation",
        referenceUrl: src,
        referenceName: "From your gallery",
      },
    });
  };

  const remove = async (id) => {
    setDeletingId(id);
    try {
      await base44.entities.DesignAsset.delete(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const hasFilters = debounced !== "" || formatFilter !== "all";
  const clearFilters = () => { setSearch(""); setFormatFilter("all"); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">My Designs</h1>
        <p className="text-muted-foreground">Search, sort and manage everything you've created.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search your designs by prompt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="-created_date">Newest first</SelectItem>
              <SelectItem value="created_date">Oldest first</SelectItem>
            </SelectContent>
          </Select>
          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              {FORMATS.map((f) => (
                <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-20 text-center">
          <Images className="h-10 w-10 text-muted-foreground/50" />
          {hasFilters ? (
            <>
              <p className="text-muted-foreground">No designs match your search or filters.</p>
              <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">No designs yet. Create your first one in the studio.</p>
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to="/studio">Open Design Studio</Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <DesignCard
                key={a.id}
                asset={a}
                src={urls[a.id] || a.file_url}
                onOpen={() => setSelected(a)}
                onVariation={() => variation(a)}
                onDelete={remove}
                deleting={deletingId === a.id}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => load(cursor)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Load more
              </Button>
            </div>
          )}
        </>
      )}

      <DesignDetailDialog
        asset={selected}
        src={selected ? (urls[selected.id] || selected.file_url) : null}
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        onVariation={() => variation(selected)}
      />
    </div>
  );
}