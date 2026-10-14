import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image } from "@/components/ui/image";
import { Sparkles, Zap, ShieldCheck, Wallet, ArrowRight, Check } from "lucide-react";
import { formatNaira } from "@/lib/format";

const EXAMPLES = [
  {
    url: "https://media.base44.com/images/public/6ace037c47a728273786f24b/5abdf86a2_generated_image.png",
    label: "Fashion sale flyer",
    cls: "aspect-square",
  },
  {
    url: "https://media.base44.com/images/public/6ace037c47a728273786f24b/5fa6cfbf6_generated_image.png",
    label: "Skincare product ad",
    cls: "aspect-[3/4]",
  },
  {
    url: "https://media.base44.com/images/public/6ace037c47a728273786f24b/641fe6560_generated_image.png",
    label: "Restaurant promo banner",
    cls: "aspect-[4/3]",
  },
];

const BENEFITS = [
  {
    icon: Zap,
    title: "Designs in seconds",
    text: "Describe what you need and our AI creates polished, professional graphics for your business — no design skills required.",
  },
  {
    icon: Wallet,
    title: "Pay in naira",
    text: "Buy design tokens with your Nigerian bank card, transfer or USSD through Paystack. No dollar cards needed.",
  },
  {
    icon: ShieldCheck,
    title: "Yours to keep",
    text: "Every design is saved privately to your gallery with full-quality downloads. Your work stays yours.",
  },
];

const STEPS = [
  { title: "Buy tokens", text: "Choose a naira package and pay securely with Paystack." },
  { title: "Describe your design", text: "Tell the AI what you want — a flyer, a product ad, a banner — and pick your format." },
  { title: "Download and shine", text: "Get your design in seconds, create variations, and download in full quality." },
];

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setAuthed).catch(() => setAuthed(false));
    base44.entities.TokenPackage.filter({ active: true }, { sort: "sort_order", limit: 10 })
      .then((page) => setPackages(page.items || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold">NaijaDesign</span>
          </div>
          <div className="flex items-center gap-2">
            {authed ? (
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link to="/register">Get started free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="secondary" className="mb-4 bg-accent/15 text-accent-foreground">
              <Sparkles className="mr-1 h-3 w-3" /> AI graphic design for Nigerian businesses
            </Badge>
            <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Professional designs,
              <span className="text-primary"> in seconds.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Generate flyers, product ads and banners with AI — and pay for it in naira.
              Perfect for small businesses, sellers, restaurants and creators.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-primary text-lg hover:bg-primary/90">
                <Link to={authed ? "/studio" : "/register"}>
                  {authed ? "Open Design Studio" : "Start designing free"} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg">
                <Link to="/shop">See pricing</Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              New users get free welcome tokens to try the studio.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {EXAMPLES.map((ex, i) => (
              <div key={ex.label} className={`group overflow-hidden rounded-2xl border bg-muted shadow-sm ${i === 0 ? "col-span-2" : ""}`}>
                <div className={ex.cls}>
                  <Image src={ex.url} alt={ex.label} className="h-full w-full" fittingType="fill" />
                </div>
                <p className="px-3 py-2 text-xs font-medium text-muted-foreground">{ex.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/40 py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-8 text-center font-heading text-3xl font-bold">Why NaijaDesign?</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <Card key={b.title} className="border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <b.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-heading text-lg font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="mb-8 text-center font-heading text-3xl font-bold">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border p-6">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="mb-1 font-heading text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t bg-muted/40 py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-2 text-center font-heading text-3xl font-bold">Simple pricing in naira</h2>
          <p className="mb-8 text-center text-muted-foreground">Buy tokens once, spend them on any design. No subscriptions.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p) => (
              <Card key={p.id} className={`relative shadow-sm ${p.popular ? "border-primary ring-1 ring-primary" : ""}`}>
                {p.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">Most popular</Badge>
                )}
                <CardContent className="p-6">
                  <h3 className="font-heading text-lg font-semibold">{p.name}</h3>
                  <p className="mt-2 text-3xl font-extrabold">{formatNaira(p.price_ngn)}</p>
                  <p className="mt-1 text-sm font-medium text-primary">{p.tokens.toLocaleString()} tokens</p>
                  <p className="mt-3 min-h-10 text-xs text-muted-foreground">{p.description}</p>
                  <Button asChild className="mt-4 w-full bg-primary hover:bg-primary/90">
                    <Link to={authed ? "/shop" : "/register"}>Buy {p.name}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} NaijaDesign. Made for Nigerian businesses.</p>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/help" className="hover:text-foreground">Help Centre</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/refund-policy" className="hover:text-foreground">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}