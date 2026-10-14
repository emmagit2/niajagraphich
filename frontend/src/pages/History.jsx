import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/format";

const typeVariant = {
  purchase: "default", promotion: "secondary", referral: "secondary",
  signup_bonus: "secondary", charge: "outline", refund: "outline", adjustment: "secondary",
};

export default function History() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (nextCursor) => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      const page = await base44.entities.TokenLedger.filter(
        { user_id: me.id },
        { sort: "-created_date", limit: 25, cursor: nextCursor || undefined }
      );
      const newItems = page.items || [];
      setItems((prev) => (nextCursor ? [...prev, ...newItems] : newItems));
      setCursor(page.next_cursor);
      setHasMore(page.has_more);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Token History</h1>
        <p className="text-muted-foreground">Every credit, charge and refund on your wallet.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-4 w-4 text-primary" /> Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && items.length === 0 ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No token activity yet. Welcome tokens and purchases will appear here.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge variant={typeVariant[l.entry_type] || "outline"}>{l.entry_type}</Badge>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.description || l.entry_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(l.created_date)}
                        {l.balance_after !== undefined && l.balance_after !== null ? ` · balance: ${l.balance_after}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 font-semibold ${l.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                    {l.amount >= 0 ? "+" : ""}{l.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => load(cursor)} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Load more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}