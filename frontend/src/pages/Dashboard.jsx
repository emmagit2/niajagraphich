import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Wand2, Images, ShoppingBag, Loader2, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/format";

const statusVariant = { succeeded: "default", processing: "secondary", pending: "secondary", failed: "destructive", refunded: "outline" };

export default function Dashboard() {
  const [wallet, setWallet] = useState(null);
  const [designCount, setDesignCount] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [generations, setGenerations] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const [walletPage, designs, purchases, genPage, ledgerPage] = await Promise.all([
          base44.entities.TokenWallet.filter({ user_id: me.id }, { limit: 1 }),
          base44.entities.Generation.count({ user_id: me.id }),
          base44.entities.Payment.count({ user_id: me.id, status: "success" }),
          base44.entities.Generation.filter({ user_id: me.id }, { sort: "-created_date", limit: 6, fields: ["prompt", "status", "operation", "format", "tokens_charged"] }),
          base44.entities.TokenLedger.filter({ user_id: me.id }, { sort: "-created_date", limit: 8 }),
        ]);
        setWallet(walletPage.items[0] || { balance: 0, reserved: 0 });
        setDesignCount(designs);
        setPurchaseCount(purchases);
        setGenerations(genPage.items || []);
        setLedger(ledgerPage.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const balance = wallet?.balance || 0;
  const reserved = wallet?.reserved || 0;
  const available = balance - reserved;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Here's what's happening with your designs.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/studio"><Wand2 className="mr-2 h-4 w-4" /> New design</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/shop"><ShoppingBag className="mr-2 h-4 w-4" /> Buy tokens</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Available tokens</p>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-4xl font-extrabold text-primary">{available.toLocaleString()}</p>
            {reserved > 0 && <p className="mt-1 text-xs text-muted-foreground">{reserved} reserved for in-flight work</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Designs created</p>
              <Images className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-4xl font-extrabold">{designCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Successful purchases</p>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-4xl font-extrabold">{purchaseCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-primary" /> Recent designs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generations.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No designs yet. Create your first one in the studio.
                <div className="mt-4">
                  <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
                    <Link to="/studio">Open Design Studio</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="divide-y">
                {generations.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{g.prompt}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.operation} · {g.format} · {formatDate(g.created_date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">-{g.tokens_charged}</span>
                      <Badge variant={statusVariant[g.status] || "outline"}>{g.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-4 w-4 text-primary" /> Recent token activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ledger.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No token activity yet. Welcome tokens appear here once credited.
              </div>
            ) : (
              <ul className="divide-y">
                {ledger.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.description || l.entry_type}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(l.created_date)}</p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${l.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                      {l.amount >= 0 ? "+" : ""}{l.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-2 text-primary">
              <Link to="/history">View full history</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}