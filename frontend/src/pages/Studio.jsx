import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Loader2, Sparkles, AlertCircle, Upload, ImagePlus, BookOpen } from "lucide-react";
import { CATEGORIES, STYLES, categoryMeta } from "@/lib/designMeta";
import ExamplePrompts from "@/components/studio/ExamplePrompts";
import ResultPanel from "@/components/studio/ResultPanel";

const num = (v, fallback) => (v !== undefined && v !== null && !isNaN(Number(v)) ? Number(v) : fallback);

export default function Studio() {
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [settings, setSettings] = useState({});
  const [wallet, setWallet] = useState({ balance: 0, reserved: 0 });
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("instagram_post");
  const [style, setStyle] = useState("bold_colourful");
  const [operation, setOperation] = useState("generate");
  const [quality, setQuality] = useState("standard");
  const [refImage, setRefImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setMe(user);
        const [settingList, walletPage] = await Promise.all([
          base44.entities.Setting.filter({ category: "costs" }),
          base44.entities.TokenWallet.filter({ user_id: user.id }, { limit: 1 }),
        ]);
        const map = {};
        (settingList.items || settingList || []).forEach((s) => { map[s.key] = s.value; });
        setSettings(map);
        if ((walletPage.items || []).length) setWallet(walletPage.items[0]);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    const prefill = location.state;
    if (!prefill) return;
    if (prefill.prompt) setPrompt(prefill.prompt);
    if (CATEGORIES.some((c) => c.value === prefill.category)) setCategory(prefill.category);
    if (["edit", "variation"].includes(prefill.operation)) setOperation(prefill.operation);
    if (prefill.referenceUrl) setRefImage({ url: prefill.referenceUrl, name: prefill.referenceName || "Reference image", uri: null });
    window.history.replaceState({}, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const format = categoryMeta(category).format;
  const cost = operation === "edit" ? num(settings.cost_edit, 4)
    : operation === "variation" ? num(settings.cost_variation, 3)
      : quality === "high" ? num(settings.cost_generate_high, 10)
        : num(settings.cost_generate_standard, 5);
  const available = (wallet.balance || 0) - (wallet.reserved || 0);

  const refreshWallet = async () => {
    if (!me) return;
    try {
      const page = await base44.entities.TokenWallet.filter({ user_id: me.id }, { limit: 1 });
      if ((page.items || []).length) setWallet(page.items[0]);
    } catch (_err) { /* keep local state */ }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("That image is too large — please keep it under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 900 });
      setRefImage({ url: signed_url, uri: file_uri, name: file.name });
    } catch (err) {
      setError("Could not upload the image: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setError("");
    setResult(null);
    if (!prompt.trim()) {
      setError("Please describe the design you want.");
      return;
    }
    if ((operation === "edit" || operation === "variation") && !refImage) {
      setError("Please upload a reference image for edits and variations.");
      return;
    }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateDesign", {
        prompt, operation, category, style, quality, format,
        referenceImageUrl: refImage?.url || null,
      });
      const data = res?.data ?? res;
      if (!data || data.error) throw new Error(data?.error || "Generation failed");
      let displayUrl = data.fileUrl;
      if (data.fileUri) {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: data.fileUri });
        displayUrl = signed_url;
      }
      setResult({ url: displayUrl, tokensCharged: data.tokensCharged, generationId: data.generationId });
      await refreshWallet();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Generation failed. Your tokens were not charged.");
    } finally {
      setGenerating(false);
    }
  };

  const applyResultAsReference = (op) => {
    if (!result) return;
    setOperation(op);
    setRefImage({ url: result.url, name: "Your generated design", uri: null });
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-3xl font-bold">Design Studio</h1>
          <p className="text-muted-foreground">Describe it. The AI designs it.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="font-semibold">{available.toLocaleString()}</span>
          <span className="text-muted-foreground">tokens available</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Your brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="prompt">What do you want to design?</Label>
              <Textarea
                id="prompt"
                rows={5}
                maxLength={1500}
                placeholder="e.g. A vibrant Instagram flyer for my Lagos fashion boutique's end-of-season sale, bold headline 'SALE', purple accents"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground">{prompt.length}/1500</p>
              <ExamplePrompts category={category} onSelect={setPrompt} />
            </div>

            <div className="space-y-2">
              <Label>Design category</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`rounded-lg border p-3 text-center transition-colors ${
                      category === c.value ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="block text-sm font-medium">{c.label}</span>
                    <span className="text-xs text-muted-foreground">{c.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Operation</Label>
                <Select value={operation} onValueChange={setOperation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generate">Generate from text</SelectItem>
                    <SelectItem value="edit">Edit an image</SelectItem>
                    <SelectItem value="variation">Create variation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quality</Label>
              <Select value={quality} onValueChange={setQuality} disabled={operation !== "generate"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High quality</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(operation === "edit" || operation === "variation") && (
              <div className="space-y-2">
                <Label>Reference image (product photo or design to edit)</Label>
                {refImage ? (
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <img src={refImage.url} alt="Reference" className="h-14 w-14 rounded object-cover" />
                    <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{refImage.name}</p>
                    <Button variant="ghost" size="sm" onClick={() => setRefImage(null)}>Remove</Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                    {uploading ? "Uploading..." : "Click to upload an image (stored privately)"}
                    <Input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  </label>
                )}
              </div>
            )}

            <div className="rounded-lg bg-muted/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated cost</span>
                <span className="font-semibold text-primary">{cost} tokens</span>
              </div>
              {available < cost && (
                <p className="mt-2 text-xs text-destructive">
                  Not enough tokens. <Link to="/shop" className="underline">Buy more</Link>.
                </p>
              )}
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
              onClick={handleGenerate}
              disabled={generating || uploading || available < cost}
            >
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Designing...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate design</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Preview</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/prompts"><BookOpen className="mr-2 h-4 w-4" /> Prompt library</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {generating && (
              <div className="flex aspect-square max-h-[560px] w-full flex-col items-center justify-center gap-3 rounded-xl bg-muted/50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  The AI is creating your design — this usually takes under a minute.
                </p>
              </div>
            )}
            {!generating && error && (
              <div className="flex aspect-square max-h-[560px] w-full flex-col items-center justify-center gap-4 rounded-xl bg-destructive/5 px-8 text-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <p className="text-xs text-muted-foreground">Your tokens were not charged for the failed attempt.</p>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  <Loader2 className="hidden" />Retry
                </Button>
              </div>
            )}
            {!generating && result && (
              <ResultPanel
                result={result}
                format={format}
                busy={generating}
                onEdit={() => applyResultAsReference("edit")}
                onVariation={() => applyResultAsReference("variation")}
                onRegenerate={handleGenerate}
              />
            )}
            {!generating && !error && !result && (
              <div className="flex aspect-square max-h-[560px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed">
                <Upload className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Fill in your brief and hit Generate — your design appears here.
                </p>
                <Button asChild variant="link" size="sm" className="text-primary">
                  <Link to="/prompts">Or start from a template</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}