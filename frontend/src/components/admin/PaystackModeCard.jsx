import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";

export default function PaystackModeCard() {
  const [mode, setMode] = useState(null); // null = loading, false = unconfigured

  useEffect(() => {
    base44.functions.invoke("adminGetPaystackMode", {})
      .then((res) => setMode(res?.data ?? res))
      .catch(() => setMode({ configured: false }));
  }, []);

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">Paystack</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <CreditCard className="h-4 w-4 text-primary" /> Payments
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Mode follows the secret key configured in app secrets.</p>
        </div>
        {mode === null ? (
          <Badge variant="secondary">Checking…</Badge>
        ) : mode?.configured ? (
          <Badge className={mode.mode === "live" ? "bg-emerald-600" : "bg-amber-500"}>
            {mode.mode === "live" ? "Live mode" : "Test mode"}
          </Badge>
        ) : (
          <Badge variant="destructive">Not configured</Badge>
        )}
      </CardContent>
    </Card>
  );
}