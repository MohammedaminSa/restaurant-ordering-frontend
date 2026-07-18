import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { updateUser } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  User,
  Shield,
  Mail,
  Phone,
  Bell,
  Moon,
  LogOut,
  Save,
  Loader2,
  DollarSign,
  Printer,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/cashier/settings")({
  component: CashierSettings,
});

function CashierSettings() {
  const { user, setUser } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await updateUser(user.id, {
        name,
        email,
        phone: phone || undefined,
      });
      if (res.data) setUser(res.data as any);
      toast.success("Settings saved successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your cashier profile and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cashier Profile
            </CardTitle>
            <CardDescription>
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-accent/5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent text-lg font-bold">
                {user.name?.charAt(0) || "U"}
              </div>
              <div>
                <p className="font-semibold text-lg">{user.name}</p>
                <Badge variant="secondary">{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}</Badge>
              </div>
            </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+1 234 567 890" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Preferences
              </CardTitle>
              <CardDescription>
                Default payment settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <Printer className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Auto-print receipt</p>
                    <p className="text-xs text-muted-foreground">Automatically print after payment</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Enable</Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <Bell className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payment notifications</p>
                    <p className="text-xs text-muted-foreground">Show confirmation on payment</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account
              </CardTitle>
              <CardDescription>
                Account security and session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <Mail className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive daily transaction report</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <LogOut className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Session</p>
                    <p className="text-xs text-muted-foreground">Currently signed in</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
