import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, Sparkles, AlertCircle, TicketPercent, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNaira } from "@/lib/format";

export default function Shop() {
  const [packages, setPackages] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoOk, setPromoOk] = useState(false);

  useEffect(() => {
    base44.entities.TokenPackage.filter({ active: true }, { sort: "sort_order", limit: 20 })
      .then((page) => setPackages(page.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const buy = async (pkg) => {
    setBusyId(pkg.id);
    setError("");
    try {
      const res = await base44.functions.invoke("initPaystackPayment", { packageId: pkg.id });
      const data = res?.data ?? res;
      if (!data || data.error) throw new Error(data?.error || "Could not start checkout");
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }
      throw new Error("Could not start checkout");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not start checkout");
    } finally {
      setBusyId(null);
    }
  };

  const redeem = async () => {
    setPromoBusy(true);
    setPromoMessage("");
    setPromoOk(false);
    try {
      const res = await base44.functions.invoke("redeemPromotion", { code: promoCode });
      const data = res?.data ?? res;
      if (!data || data.error) throw new Error(data?.error || "Could not redeem code");
      setPromoOk(true);
      setPromoMessage(`${data.credited} bonus tokens were added to your wallet.`);
      setPromoCode("");
    } catch (err) {
      setPromoMessage(err?.response?.data?.error || err?.message || "Could not redeem code");
    } finally {
      setPromoBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Token Shop</h1>
        <p className="text-muted-foreground">Top up your design tokens. Pay securely in naira via Paystack.</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((p) => (
            <Card key={p.id} className={`relative shadow-sm ${p.popular ? "border-primary ring-1 ring-primary" : ""}`}>
              {p.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">Most popular</Badge>
              )}
              <CardContent className="flex h-full flex-col p-6">
                <h3 className="font-heading text-lg font-semibold">{p.name}</h3>
                <p className="mt-2 text-3xl font-extrabold">{formatNaira(p.price_ngn)}</p>
                <p className="mt-1 text-sm font-medium text-primary">{p.tokens.toLocaleString()} tokens</p>
                <p className="mt-3 flex-1 text-xs text-muted-foreground">{p.description}</p>
                <Button
                  className="mt-4 w-full bg-primary hover:bg-primary/90"
                  onClick={() => buy(p)}
                  disabled={busyId === p.id}
                >
                  {busyId === p.id ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting...</>
                  ) : (
                    <><ShoppingBag className="mr-2 h-4 w-4" /> Buy now</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-6 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="promo" className="flex items-center gap-2">
            <TicketPercent className="h-4 w-4 text-primary" /> Have a promo code?
          </Label>
          <Input
            id="promo"
            placeholder="e.g. LAUNCH20"
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoMessage(""); }}
          />
        </div>
        <Button
          variant="outline"
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          onClick={redeem}
          disabled={promoBusy || !promoCode}
        >
          {promoBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Redeem"}
        </Button>
        {promoMessage && (
          <p className={`flex items-center gap-1.5 text-sm sm:absolute sm:-bottom-6 ${promoOk ? "text-primary" : "text-destructive"}`}>
            {promoOk && <CheckCircle2 className="h-4 w-4" />}
            {promoMessage}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-muted/50 p-6 text-sm text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">How tokens work</p>
        <p>
          Tokens never expire. A standard design costs a few tokens (see the live estimate in the
          studio), and failed generations are never charged. Need more help? Visit the{" "}
          <Link to="/help" className="underline">Help Centre</Link>.
        </p>
      </div>
    </div>
  );
}