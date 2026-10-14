import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCircle, Save, LogOut, Check } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function Profile() {
  const [me, setMe] = useState(null);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth.me().then((user) => {
      setMe(user);
      setFullName(user.full_name || "");
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await base44.auth.updateMe({ full_name: fullName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!me) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCircle className="h-4 w-4 text-primary" /> Account details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={me.email} disabled />
            <p className="text-xs text-muted-foreground">Your email is managed by your login provider and cannot be changed here.</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Role: {me.role}</Badge>
              <Badge variant="outline">Joined {formatDate(me.created_date)}</Badge>
            </div>
            <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : saved ? <Check className="mr-2 h-4 w-4" />
                  : <Save className="mr-2 h-4 w-4" />}
              {saved ? "Saved" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="font-medium">Sign out</p>
            <p className="text-sm text-muted-foreground">Log out of NaijaDesign on this device.</p>
          </div>
          <Button variant="outline" onClick={() => base44.auth.logout("/")}>
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}