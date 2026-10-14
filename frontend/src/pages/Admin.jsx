import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, ShieldAlert, Package, Settings as SettingsIcon, Users, Wallet } from "lucide-react";
import { formatNaira, formatDate } from "@/lib/format";
import PromotionsTab from "@/components/admin/PromotionsTab";
import PaystackModeCard from "@/components/admin/PaystackModeCard";

export default function Admin() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [packages, setPackages] = useState([]);
  const [settings, setSettings] = useState([]);
  const [users, setUsers] = useState([]);
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustResult, setAdjustResult] = useState("");
  const [newPkg, setNewPkg] = useState({ name: "", price_ngn: "", tokens: "", description: "" });

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setMe(user);
        if (user.role !== "admin") return;
        const [payAgg, genAgg, userPage, pkgPage, settingList] = await Promise.all([
          base44.entities.Payment.aggregate({ groupBy: "status", sum: ["amount_ngn", "tokens"] }),
          base44.entities.Generation.aggregate({ groupBy: "status" }),
          base44.entities.User.list(),
          base44.entities.TokenPackage.filter({}, { sort: "sort_order", limit: 50 }),
          base44.entities.Setting.filter({}),
        ]);
        const payByStatus = {};
        let revenue = 0, tokensSold = 0, purchases = 0;
        (payAgg?.rows || []).forEach((r) => {
          payByStatus[r.status] = { count: r.count, revenue: r.sum_amount_ngn || 0 };
          if (r.status === "success") {
            revenue = r.sum_amount_ngn || 0;
            tokensSold = r.sum_tokens || 0;
            purchases = r.count;
          }
        });
        const genRows = {};
        (genAgg?.rows || []).forEach((r) => { genRows[r.status] = r.count; });
        setStats({
          revenue,
          tokensSold,
          purchases,
          generations: genRows,
          payByStatus,
        });
        setUsers(userPage.items || userPage || []);
        setPackages(pkgPage.items || []);
        setSettings(settingList.items || settingList || []);
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

  if (me?.role !== "admin") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <p className="font-medium text-destructive">This area is restricted to administrators.</p>
      </div>
    );
  }

  const savePackage = async (pkg) => {
    await base44.entities.TokenPackage.update(pkg.id, {
      name: pkg.name, price_ngn: Number(pkg.price_ngn), tokens: Number(pkg.tokens),
      description: pkg.description, active: pkg.active,
    });
  };

  const saveSetting = async (s) => {
    await base44.entities.Setting.update(s.id, { value: String(s.value) });
  };

  const createPackage = async () => {
    if (!newPkg.name || !newPkg.price_ngn || !newPkg.tokens) return;
    const created = await base44.entities.TokenPackage.create({
      name: newPkg.name, price_ngn: Number(newPkg.price_ngn), tokens: Number(newPkg.tokens),
      description: newPkg.description, active: true, sort_order: packages.length + 1,
    });
    setPackages((prev) => [...prev, created]);
    setNewPkg({ name: "", price_ngn: "", tokens: "", description: "" });
  };

  const submitAdjust = async () => {
    setAdjustResult("");
    try {
      const res = await base44.functions.invoke("adminAdjustWallet", {
        userId: adjustUserId, amount: Number(adjustAmount), description: adjustNote,
      });
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      setAdjustResult(`Credited ${adjustAmount} tokens (ref: ${data.reference}).`);
      setAdjustUserId(""); setAdjustAmount(""); setAdjustNote("");
    } catch (err) {
      setAdjustResult(err?.response?.data?.error || err?.message || "Adjustment failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-3xl font-bold">
          <Shield className="h-6 w-6 text-primary" /> Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Manage packages, costs, users and revenue.</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="settings">Token costs</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="adjust">Wallet adjustments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Verified revenue</p>
                <p className="mt-2 text-3xl font-extrabold text-primary">{formatNaira(stats.revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Tokens sold</p>
                <p className="mt-2 text-3xl font-extrabold">{(stats.tokensSold || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Successful purchases</p>
                <p className="mt-2 text-3xl font-extrabold">{stats.purchases || 0}</p>
              </CardContent>
            </Card>
            <PaystackModeCard />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Generation volume</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {Object.entries(stats.generations || {}).map(([status, count]) => (
                <Badge key={status} variant={status === "succeeded" ? "default" : status === "failed" ? "destructive" : "secondary"}>
                  {status}: {count}
                </Badge>
              ))}
              {Object.keys(stats.generations || {}).length === 0 && (
                <p className="text-sm text-muted-foreground">No generations yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Payments by status</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {Object.entries(stats.payByStatus || {}).map(([status, s]) => (
                <Badge key={status} variant={status === "success" ? "default" : status === "failed" ? "destructive" : "secondary"}>
                  {status}: {s.count} ({formatNaira(s.revenue)})
                </Badge>
              ))}
              {Object.keys(stats.payByStatus || {}).length === 0 && (
                <p className="text-sm text-muted-foreground">No payments yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Package className="h-4 w-4 text-primary" /> Token packages</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {packages.map((p) => (
                <div key={p.id} className="grid items-end gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_1fr_2fr_auto]">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={p.name} onChange={(e) => setPackages((prev) => prev.map((x) => x.id === p.id ? { ...x, name: e.target.value } : x))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price (₦)</Label>
                    <Input type="number" value={p.price_ngn} onChange={(e) => setPackages((prev) => prev.map((x) => x.id === p.id ? { ...x, price_ngn: e.target.value } : x))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tokens</Label>
                    <Input type="number" value={p.tokens} onChange={(e) => setPackages((prev) => prev.map((x) => x.id === p.id ? { ...x, tokens: e.target.value } : x))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={p.description || ""} onChange={(e) => setPackages((prev) => prev.map((x) => x.id === p.id ? { ...x, description: e.target.value } : x))} />
                  </div>
                  <Button size="sm" onClick={() => savePackage(p)}>Save</Button>
                </div>
              ))}
              <div className="grid items-end gap-3 rounded-lg border border-dashed p-4 sm:grid-cols-[1fr_1fr_1fr_2fr_auto]">
                <div className="space-y-1">
                  <Label className="text-xs">New name</Label>
                  <Input value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Price (₦)</Label>
                  <Input type="number" value={newPkg.price_ngn} onChange={(e) => setNewPkg({ ...newPkg, price_ngn: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tokens</Label>
                  <Input type="number" value={newPkg.tokens} onChange={(e) => setNewPkg({ ...newPkg, tokens: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input value={newPkg.description} onChange={(e) => setNewPkg({ ...newPkg, description: e.target.value })} />
                </div>
                <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={createPackage}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><SettingsIcon className="h-4 w-4 text-primary" /> Token costs & referral rules</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {settings.map((s) => (
                <div key={s.id} className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">{s.key}</Label>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  <Input
                    className="w-28"
                    type="number"
                    value={s.value}
                    onChange={(e) => setSettings((prev) => prev.map((x) => x.id === s.id ? { ...x, value: e.target.value } : x))}
                  />
                  <Button size="sm" variant="outline" onClick={() => saveSetting(s)}>Save</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions" className="mt-4">
          <PromotionsTab />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-4 w-4 text-primary" /> Users</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y">
                {users.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-medium">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.email} · joined {formatDate(u.created_date)}</p>
                    </div>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjust" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Wallet className="h-4 w-4 text-primary" /> Manual wallet adjustment (credit)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={adjustUserId} onValueChange={setAdjustUserId}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Token amount</Label>
                  <Input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="e.g. 50" />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="e.g. Goodwill credit" />
                </div>
              </div>
              <Button className="bg-primary hover:bg-primary/90" onClick={submitAdjust} disabled={!adjustUserId || !adjustAmount}>
                Credit tokens
              </Button>
              {adjustResult && <p className="text-sm text-primary">{adjustResult}</p>}
              <p className="text-xs text-muted-foreground">
                Adjustments are recorded in the audit log with your admin identity and a unique reference.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}