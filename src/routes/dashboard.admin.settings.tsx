import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { ROLE_LABELS, updateUserPassword } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  Mail,
  Lock,
  LogOut,
  Save,
  Loader2,
  Settings,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

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
  const [isSaving, setIsSaving] = useState(false);

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

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isSuperAdmin ? "Platform account settings" : "Admin account and restaurant settings"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profile Information
          </CardTitle>
          <CardDescription>Your account details</CardDescription>
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
            {[
              { icon: Mail, label: "Email", value: user.email },
              { icon: Building2, label: "Account ID", value: user.id?.slice(0, 12) + "..." },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="rounded-lg bg-accent/10 p-2">
                  <item.icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          {showPasswordForm ? (
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              onClick={() => setShowPasswordForm(true)}
              variant="outline"
              className="w-full"
            >
              Change Password
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Account
          </CardTitle>
          <CardDescription>Account information and security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-foreground">Role</span>
            <span className="text-sm font-medium capitalize flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              {isSuperAdmin ? "Super Admin" : "Restaurant Admin"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-foreground">Status</span>
            <span className="text-sm font-medium text-emerald-600">Active</span>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">About</p>
            <p className="text-sm text-foreground">Restaurant Management System v1.0.0</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSuperAdmin ? "Super admin platform management dashboard." : "Admin dashboard for complete restaurant control."}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="w-full border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20">
            <LogOut className="h-4 w-4 mr-1" />Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
