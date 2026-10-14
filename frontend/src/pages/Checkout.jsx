import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { formatNaira, formatDate } from "@/lib/format";

export default function Checkout() {
  const reference = new URLSearchParams(window.location.search).get("reference");
  const [state, setState] = useState(reference ? "verifying" : "idle");
  const [message, setMessage] = useState("");
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    if (!reference) return;
    base44.entities.Payment.filter({ reference }, { limit: 1 })
      .then((page) => setPayment(page.items?.[0] || null))
      .catch(() => {});
  }, [reference]);

  const verify = useCallback(async () => {
    setState("verifying");
    setMessage("");
    try {
      const res = await base44.functions.invoke("verifyPaystackPayment", { reference });
      const data = res?.data ?? res;
      if (data?.status === "success") {
        setState("success");
      } else if (data?.status === "failed" || data?.error) {
        setState("failed");
        setMessage(data?.error || "The payment did not go through.");
      } else {
        setState("pending");
        setMessage("Your payment is still processing. Check again in a moment.");
      }
    } catch (err) {
      setState("failed");
      setMessage(err?.response?.data?.error || err?.message || "Could not verify the payment.");
    }
  }, [reference]);

  useEffect(() => {
    if (reference) verify();
  }, [reference, verify]);

  if (!reference) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="mb-2 font-heading text-2xl font-bold">Checkout</h1>
        <p className="mb-6 text-muted-foreground">No payment reference found. Start again from the token shop.</p>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link to="/shop">Go to Token Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-8">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {state === "verifying" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h1 className="font-heading text-2xl font-bold">Verifying your payment...</h1>
              <p className="text-sm text-muted-foreground">Please wait while we confirm your transaction.</p>
            </>
          )}
          {state === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h1 className="font-heading text-2xl font-bold">Payment successful!</h1>
              <p className="text-sm text-muted-foreground">
                {payment ? `${payment.tokens.toLocaleString()} tokens have been added to your wallet.` : "Your tokens have been added to your wallet."}
              </p>
              <div className="flex gap-2">
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link to="/studio">Start designing</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/history">View receipt</Link>
                </Button>
              </div>
            </>
          )}
          {state === "pending" && (
            <>
              <Clock className="h-12 w-12 text-muted-foreground" />
              <h1 className="font-heading text-2xl font-bold">Payment processing</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button variant="outline" onClick={verify}>
                <RefreshCw className="mr-2 h-4 w-4" /> Check status
              </Button>
            </>
          )}
          {state === "failed" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <h1 className="font-heading text-2xl font-bold">Payment not completed</h1>
              <p className="text-sm text-destructive">{message}</p>
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to="/shop">Try again</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {payment && (
        <Card className="mt-4">
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Receipt</h2>
              <Badge variant={payment.status === "success" ? "default" : payment.status === "pending" ? "secondary" : "destructive"}>
                {payment.status}
              </Badge>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Package</dt><dd>{payment.package_name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Amount</dt><dd>{formatNaira(payment.amount_ngn)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Tokens</dt><dd>{payment.tokens.toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Reference</dt><dd className="font-mono text-xs">{payment.reference}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{formatDate(payment.created_date)}</dd></div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}