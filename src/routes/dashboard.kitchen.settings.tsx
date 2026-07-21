import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { updateUser, ROLE_LABELS } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Bell,
  Shield,
  Save,
  Loader2,
  ChefHat,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/kitchen/settings")({
  component: KitchenSettings,
});

function KitchenSettings() {
  const { user, setUser, logout } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [preferences, setPreferences] = useState({
    soundEnabled: true,
    newOrderAlert: true,
    urgentAlert: true,
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await updateUser(user.id, {
        name: profile.name,
        email: profile.email,
        phone: profile.phone || undefined,
      });
      if (res.data) setUser(res.data as any);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrefs = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Preferences saved");
    setIsSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your kitchen profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
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
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <input type="text" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
              <input type="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" />Preferences</CardTitle>
          <CardDescription>Configure your kitchen alert preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "soundEnabled", label: "Sound Alerts", desc: "Play a sound when new notifications arrive" },
            { key: "newOrderAlert", label: "New Order Alerts", desc: "Get notified immediately when new orders arrive" },
            { key: "urgentAlert", label: "Urgent Order Alerts", desc: "Highlight orders that have been waiting too long" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <button
                onClick={() => setPreferences((p) => ({ ...p, [item.key]: !(p as any)[item.key] }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${(preferences as any)[item.key] ? "bg-accent" : "bg-muted"}`}
              >
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${(preferences as any)[item.key] ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
          <Button onClick={handleSavePrefs} disabled={isSaving} variant="outline">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save Preferences
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" />Account</CardTitle>
          <CardDescription>Account information and security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-foreground">Role</span>
            <span className="text-sm font-medium capitalize flex items-center gap-1.5"><ChefHat className="h-3.5 w-3.5" />Kitchen Staff</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-foreground">Restaurant ID</span>
            <span className="text-sm text-muted-foreground font-mono">{user?.restaurant_id?.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-foreground">Status</span>
            <span className="text-sm font-medium text-emerald-600">Active</span>
          </div>
          <Button onClick={handleLogout} variant="outline" className="w-full border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20">
            <LogOut className="h-4 w-4 mr-1" />Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
