import React from "react";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <h1 className="font-heading text-3xl font-bold">Terms of Service</h1>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Welcome to NaijaDesign. By creating an account and using our AI design service, you agree to
          these terms.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">1. The service</h2>
        <p>
          NaijaDesign uses artificial intelligence to generate graphic designs from text prompts and
          reference images you provide. You purchase design tokens in Nigerian naira and spend them on
          generations, edits and variations.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">2. Your account</h2>
        <p>
          You are responsible for keeping your login credentials secure and for all activity under your
          account. You must provide accurate information when registering.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">3. Tokens and payments</h2>
        <p>
          Token packages are priced in naira and processed by Paystack. Tokens have no cash value, do not
          expire, and are not a deposit. Current generation costs are shown in the studio before you
          confirm each operation. Failed generations are not charged.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">4. Your designs</h2>
        <p>
          You own the designs you generate and may use them for personal and commercial purposes. You
          are responsible for ensuring your prompts do not infringe the rights of others and that the
          generated content complies with applicable law.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">5. Acceptable use</h2>
        <p>
          You may not use the service to create unlawful, hateful, deceptive or harmful content, to
          impersonate others, or to abuse the referral programme through fake accounts.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">6. Limitation of liability</h2>
        <p>
          The service is provided on an "as is" basis. We are not liable for indirect or consequential
          losses arising from your use of the service, to the maximum extent permitted by law.
        </p>
        <p>These terms may be updated from time to time; continued use of the service means you accept the updated terms.</p>
      </div>
      <div className="flex gap-4 text-sm">
        <Link to="/privacy" className="underline text-primary">Privacy Policy</Link>
        <Link to="/refund-policy" className="underline text-primary">Refund Policy</Link>
      </div>
    </div>
  );
}