import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gift, Copy, Check, Users, Coins } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function Referrals() {
  const [me, setMe] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [earned, setEarned] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        try { await base44.functions.invoke("setupAccount", { referralCode: "" }); } catch (err) { /* non-fatal */ }
        const user = await base44.auth.me();
        setMe(user);
        const [refs, rwds, agg] = await Promise.all([
          base44.entities.Referral.filter({ referrer_id: user.id }, { sort: "-created_date", limit: 50 }),
          base44.entities.ReferralReward.filter({ user_id: user.id }, { sort: "-created_date", limit: 50 }),
          base44.entities.ReferralReward.aggregate({ query: { user_id: user.id }, sum: "amount" }),
        ]);
        setReferrals(refs.items || []);
        setRewards(rwds.items || []);
        setEarned(agg?.rows?.[0]?.sum_amount || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const link = me?.referral_code ? `${window.location.origin}/register?ref=${me.referral_code}` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const rewarded = referrals.filter((r) => r.status === "rewarded").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Referrals</h1>
        <p className="text-muted-foreground">Invite friends. Earn tokens when they make their first purchase.</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-4 w-4 text-primary" /> Your referral link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 overflow-x-auto rounded-lg border bg-background px-4 py-3 text-sm">
              {link || "Generating your code..."}
            </code>
            <Button className="bg-primary hover:bg-primary/90" onClick={copy} disabled={!link}>
              {copied ? <><Check className="mr-2 h-4 w-4" /> Copied</> : <><Copy className="mr-2 h-4 w-4" /> Copy link</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            When someone signs up with your link and completes their first token purchase, bonus tokens
            are credited to your wallet automatically.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Friends invited</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-extrabold">{referrals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Qualified referrals</p>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-extrabold">{rewarded}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Tokens earned</p>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-primary">{earned.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Referral activity</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No referrals yet. Share your link to start earning.
            </p>
          ) : (
            <ul className="divide-y">
              {referrals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">Signed up {formatDate(r.created_date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.status === "rewarded" ? `You earned ${r.reward_amount} tokens` : "Waiting for their first purchase"}
                    </p>
                  </div>
                  <Badge variant={r.status === "rewarded" ? "default" : "secondary"}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}