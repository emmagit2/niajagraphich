import React from "react";
import { Link } from "react-router-dom";

export default function RefundPolicy() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <h1 className="font-heading text-3xl font-bold">Refund Policy</h1>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          We want you to be happy with NaijaDesign. Because designs are generated instantly and tokens
          are consumed at the moment of generation, the following policy applies.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Failed generations</h2>
        <p>
          If a generation, edit or variation fails, the reserved tokens are automatically returned to
          your wallet — you are never charged for failed work, and you can retry immediately.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Token purchases</h2>
        <p>
          Token purchases are generally non-refundable once the payment is verified and tokens are
          credited, because they are digital credits consumed at your own pace.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">When we will refund</h2>
        <p>
          We will review and, where fair, refund a purchase if: tokens were never credited despite a
          successful payment; a clear technical fault on our side consistently prevented you from using
          the service; or the purchase was made in clear error and no tokens have been spent. Contact
          support from your registered email with your payment reference (shown on your receipt page)
          within 7 days.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Duplicated charges</h2>
        <p>
          If a technical issue causes the same purchase to be charged more than once, the duplicate
          charge will be refunded in full once confirmed against our payment records.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Refund method</h2>
        <p>
          Approved refunds are returned via Paystack to the original payment method, typically within
          5–10 business days, subject to your bank's processing time.
        </p>
      </div>
      <div className="flex gap-4 text-sm">
        <Link to="/terms" className="underline text-primary">Terms</Link>
        <Link to="/privacy" className="underline text-primary">Privacy</Link>
      </div>
    </div>
  );
}