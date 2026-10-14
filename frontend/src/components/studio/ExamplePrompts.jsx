import React from "react";
import { Lightbulb } from "lucide-react";

const EXAMPLES = {
  instagram_post: [
    "Instagram advert for my natural hair salon in Abuja — headline '20% off your first visit', warm and inviting",
    "Bold teaser announcing my sneaker drop this Friday, street style, price '₦25,000'",
    "Quote card for a business coach page — 'Your brand deserves better than Canva defaults' — deep purple theme",
  ],
  portrait_post: [
    "Portrait announcement for my bakery's Valentine's cake pre-order — 'Order by Feb 10' — roses and cake photos",
    "4:5 poster for a fitness coach's 6-week challenge — 'Transform in 42 days' — energetic energy",
    "Portrait showcase of my thrift fashion haul with prices labelled on each piece",
  ],
  story: [
    "Story invite to my YouTube live this Sunday 8pm — topic: 'Pricing for profit' — bold and clickable",
    "Countdown story for my makeup masterclass — '3 days left' — glamour style",
    "Behind-the-scenes story of my small soap business, natural and authentic feel",
  ],
  flyer: [
    "Flyer for a two-day digital marketing workshop in Lagos — date, venue, speaker list, registration ₦15,000",
    "Church programme flyer for our annual thanksgiving service with guest minister — elegant and reverent",
    "Club flyer for a monthly afrobeats party — DJ lineup, dress code, entry fee",
  ],
  banner: [
    "Website hero banner for my online fashion store — headline 'New Season, New Styles' — shop-now button",
    "YouTube channel banner for a tech review channel — dark theme with purple accents and gadget collage",
    "LinkedIn-style banner for a real estate agency — 'We sell your home faster'",
  ],
  other: [
    "A professional design for promoting my business online",
  ],
};

export default function ExamplePrompts({ category, onSelect }) {
  const examples = EXAMPLES[category] || EXAMPLES.other;
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Lightbulb className="h-3.5 w-3.5 text-primary" /> Need inspiration? Tap an example
      </p>
      <div className="flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onSelect(ex)}
            className="rounded-full border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {ex.length > 58 ? `${ex.slice(0, 55)}…` : ex}
          </button>
        ))}
      </div>
    </div>
  );
}