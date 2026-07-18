import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { ROLE_LABELS } from "@/lib/api";
import { Settings, User, Shield, Mail, LogOut, Lock, Globe, Palette } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateUserPassword } from "@/lib/api";

export const Route = createFileRoute("/dashboard/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "super_admin";

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      updateUserPassword(userId, password),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to change password"),
  });

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate({ to: "/auth", replace: true });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!user) return;
    passwordMutation.mutate({ userId: user.id, password: newPassword });
  };

  const accountInfo = [
    { label: "Name", value: user?.name || "", icon: User },
    { label: "Email", value: user?.email || "", icon: Mail },
    { label: "Role", value: user ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] : "", icon: Shield },
    { label: "Account ID", value: user?.id || "", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin ? "Platform account settings" : "Admin account and restaurant settings"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Information */}
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-serif text-lg text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              Profile Information
            </h2>
          </div>
          <div className="divide-y divide-border">
            {accountInfo.map((s) => (
              <div key={s.label} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <s.icon className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Change Password */}
          <div className="rounded-xl border border-border bg-card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-serif text-lg text-foreground flex items-center gap-2">
                <Lock className="h-5 w-5 text-accent" />
                Change Password
              </h2>
            </div>
            <div className="p-5">
              {showPasswordForm ? (
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={passwordMutation.isPending}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {passwordMutation.isPending ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground text-left"
                >
                  Change Password
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-serif text-lg text-foreground flex items-center gap-2">
                <Settings className="h-5 w-5 text-accent" />
                Account Settings
              </h2>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={handleLogout}
                className="w-full rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 text-left flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Platform Info */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-serif text-lg text-foreground mb-2">About</h2>
            <p className="text-sm text-muted-foreground">Olivera Restaurant Management System v1.0.0</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isSuperAdmin ? "Super admin platform management dashboard." : "Admin dashboard for complete restaurant control."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
