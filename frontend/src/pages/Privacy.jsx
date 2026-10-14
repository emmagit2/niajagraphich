import React from "react";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <h1 className="font-heading text-3xl font-bold">Privacy Policy</h1>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          We respect your privacy. This policy explains what we collect and why.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">What we collect</h2>
        <p>
          Account data (your name, email and role), the prompts and reference images you submit, the
          designs generated for you, your token wallet and transaction history, and basic technical
          logs needed to run the service.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">How we use it</h2>
        <p>
          To operate your account, generate your designs, process payments through Paystack, award
          referral bonuses, prevent abuse, and improve the service. We never sell your personal data.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Your designs</h2>
        <p>
          Generated designs are stored privately with access restricted to your account and authorised
          administrators. Reference images you upload for editing are stored so the AI can read them
          during your session.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Payments</h2>
        <p>
          Payments are handled by Paystack under their own privacy policy. We never see or store your
          card details.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Your rights</h2>
        <p>
          You can request a copy of your data or deletion of your account at any time by contacting
          support from your registered email.
        </p>
      </div>
      <div className="flex gap-4 text-sm">
        <Link to="/terms" className="underline text-primary">Terms</Link>
        <Link to="/refund-policy" className="underline text-primary">Refund Policy</Link>
      </div>
    </div>
  );
}