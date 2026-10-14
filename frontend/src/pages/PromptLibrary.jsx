import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image } from "@/components/ui/image";
import { Loader2, Search, Sparkles, BookOpen } from "lucide-react";

const TEMPLATE_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "electronics", label: "Electronics" },
  { value: "fashion", label: "Fashion" },
  { value: "real_estate", label: "Real estate" },
  { value: "restaurants", label: "Restaurants" },
  { value: "beauty", label: "Beauty" },
  { value: "events", label: "Events" },
  { value: "business", label: "Business" },
];

const DEFAULT_DESIGN_CATEGORY = {
  electronics: "instagram_post",
  fashion: "instagram_post",
  real_estate: "flyer",
  restaurants: "instagram_post",
  beauty: "instagram_post",
  events: "flyer",
  business: "instagram_post",
};

export default function PromptLibrary() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    (async () => {
      try {
        const query = {
          ...(category !== "all" && { category }),
          ...(debounced && { $or: [
            { title: { $regex: debounced, $options: "i" } },
            { description: { $regex: debounced, $options: "i" } },
            { prompt: { $regex: debounced, $options: "i" } },
          ] }),
        };
        const page = await base44.entities.PromptTemplate.filter(query, { sort: "sort_order", limit: 100 });
        setTemplates(page.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [debounced, category]);

  const applyTemplate = (t) => {
    navigate("/studio", {
      state: { prompt: t.prompt, category: DEFAULT_DESIGN_CATEGORY[t.category] || "instagram_post" },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Prompt Library</h1>
        <p className="text-muted-foreground">
          Battle-tested briefs for Nigerian businesses. Pick one, tweak it, and generate.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                category === c.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-20 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No templates match your search{category !== "all" ? " in this category" : ""}.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col overflow-hidden shadow-sm">
              <div className="aspect-[4/5] bg-muted">
                {t.preview_url ? (
                  <Image src={t.preview_url} alt={t.title} className="h-full w-full" fittingType="fill" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Sparkles className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => applyTemplate(t)}>
                  <Sparkles className="mr-2 h-4 w-4" /> Use this template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}