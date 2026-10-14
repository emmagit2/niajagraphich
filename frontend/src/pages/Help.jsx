import React from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What are design tokens?",
    a: "Tokens are the credits you spend on AI designs. You buy them in naira and spend a few on each generation — failed generations are never charged.",
  },
  {
    q: "How do I pay?",
    a: "Payments are processed by Paystack. You can pay with your Nigerian debit card, bank transfer or USSD. Tokens are credited to your wallet as soon as the payment is verified.",
  },
  {
    q: "How long does a design take?",
    a: "Most designs finish in well under a minute. High-quality settings can take a little longer. You'll see a live progress state in the studio.",
  },
  {
    q: "Do my tokens expire?",
    a: "No. Tokens stay in your wallet until you spend them.",
  },
  {
    q: "How does the referral programme work?",
    a: "Share your referral link from the Referrals page. When a friend signs up with it and makes their first purchase, bonus tokens are credited to your wallet automatically.",
  },
  {
    q: "Can I edit or get more versions of a design?",
    a: "Yes. In the studio, upload any design as a reference image and choose Edit or Create variation. Variations and edits cost slightly fewer tokens than a fresh generation.",
  },
];

export default function Help() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Help Centre</h1>
        <p className="text-muted-foreground">Answers to the most common questions.</p>
      </div>
      <Accordion type="single" collapsible className="rounded-2xl border px-4">
        {FAQS.map((f, i) => (
          <AccordionItem key={f.q} value={`item-${i}`}>
            <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="rounded-xl bg-muted/50 p-6 text-sm text-muted-foreground">
        Still stuck? Email support from your registered email address and include your account email —
        we usually reply within one business day.
      </div>
      <div className="flex gap-4 text-sm text-muted-foreground">
        <Link to="/terms" className="underline">Terms</Link>
        <Link to="/privacy" className="underline">Privacy</Link>
        <Link to="/refund-policy" className="underline">Refund Policy</Link>
      </div>
    </div>
  );
}