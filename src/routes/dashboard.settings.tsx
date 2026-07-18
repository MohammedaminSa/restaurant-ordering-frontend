import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { UserIcon, KeyRound, Shield, Bell, Palette } from "lucide-react";
import { ROLE_LABELS, type User } from "@/lib/api";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-accent/10 p-2.5">
              <UserIcon className="h-5 w-5 text-accent" />
            </div>
            <h2 className="font-serif text-lg text-foreground">Profile</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Name</p>
              <p className="text-foreground font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="text-foreground">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Role</p>
              <p className="text-foreground">{ROLE_LABELS[user.role as User['role']]}</p>
            </div>
          </div>
          <button className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground">
            Edit Profile
          </button>
        </div>

        {/* Security */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-accent/10 p-2.5">
              <KeyRound className="h-5 w-5 text-accent" />
            </div>
            <h2 className="font-serif text-lg text-foreground">Security</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Update your password and manage active sessions.
          </p>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Change Password
          </button>
        </div>

        {/* Preferences */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-accent/10 p-2.5">
              <Palette className="h-5 w-5 text-accent" />
            </div>
            <h2 className="font-serif text-lg text-foreground">Preferences</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Set your language, timezone, and notification preferences.
          </p>
          <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground">
            Manage Preferences
          </button>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-accent/10 p-2.5">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            <h2 className="font-serif text-lg text-foreground">Notifications</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Control which alerts and updates you receive.
          </p>
          <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground">
            Notification Settings
          </button>
        </div>
      </div>
    </div>
  );
}
