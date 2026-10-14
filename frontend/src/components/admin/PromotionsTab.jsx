import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, TicketPercent } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function PromotionsTab() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ code: "", tokens: "", description: "", usage_limit: "" });

  const load = async () => {
    try {
      const page = await base44.entities.Promotion.filter({}, { sort: "-created_date", limit: 50 });
      setPromos(page.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setMessage("");
    if (!form.code.trim() || !form.tokens) return;
    setSaving(true);
    try {
      await base44.entities.Promotion.create({
        code: form.code.trim().toUpperCase(),
        tokens: Number(form.tokens),
        description: form.description || null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        active: true,
      });
      setForm({ code: "", tokens: "", description: "", usage_limit: "" });
      await load();
      setMessage("Promo code created. Users can redeem it on the Token Shop page.");
    } catch (err) {
      setMessage(err?.response?.data?.error || err?.message || "Could not create the promo code.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (promo) => {
    await base44.entities.Promotion.update(promo.id, { active: !promo.active });
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TicketPercent className="h-4 w-4 text-primary" /> Promotional credits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid items-end gap-3 rounded-lg border border-dashed p-4 sm:grid-cols-[1fr_1fr_2fr_1fr_auto]">
          <div className="space-y-1">
            <Label className="text-xs">Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LAUNCH20" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tokens</Label>
            <Input type="number" value={form.tokens} onChange={(e) => setForm({ ...form, tokens: e.target.value })} placeholder="20" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Launch week bonus" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Usage limit</Label>
            <Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="Optional" />
          </div>
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={create} disabled={saving || !form.code || !form.tokens}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
        </div>
        {message && <p className="text-sm text-primary">{message}</p>}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : promos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No promo codes yet.</p>
        ) : (
          <ul className="divide-y">
            {promos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-semibold">{p.code} <span className="font-normal text-primary">· {p.tokens} tokens</span></p>
                  <p className="text-xs text-muted-foreground">
                    {p.description ? `${p.description} · ` : ""}Used {p.used_count || 0}
                    {p.usage_limit ? ` of ${p.usage_limit}` : ""} times
                    {p.expires_at ? ` · expires ${formatDate(p.expires_at)}` : ""} · created {formatDate(p.created_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "active" : "disabled"}</Badge>
                  <Button variant="outline" size="sm" onClick={() => toggle(p)}>
                    {p.active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Redemption credits each user's wallet exactly once per code and is recorded in their token history.
        </p>
      </CardContent>
    </Card>
  );
}