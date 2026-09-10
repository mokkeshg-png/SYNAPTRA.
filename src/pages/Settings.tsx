import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { updatePassword } from "@/lib/supabase-db";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export function Settings() {
  const { user, profile } = useAuth();

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifMatch, setNotifMatch] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!user) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-ink-500">Please sign in to configure account settings.</p>
        <Link to="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword.length < 8) {
      setPwMsg({ type: "err", text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "err", text: "Passwords do not match." });
      return;
    }
    setPwLoading(true);
    try {
      await updatePassword(newPassword);
      setPwMsg({ type: "ok", text: "Password updated successfully." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwMsg({ type: "err", text: err?.message || "Failed to update password." });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800 mb-2">
          <SettingsIcon className="h-3.5 w-3.5 text-navy-600" />
          <span>Account Preferences</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-ink">Settings & Preferences</h1>
        <p className="mt-1 text-sm text-ink-500">
          Manage your account credentials and notification preferences
        </p>
      </div>

      {/* Account Info */}
      <Card className="p-6 space-y-4">
        <h2 className="font-serif text-lg font-bold text-ink border-b border-ink-100 pb-2">
          Academic Account Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-ink-400 block mb-1 uppercase font-semibold">Registered Email</span>
            <Input disabled value={user.email ?? ""} className="bg-paper-50" />
          </div>
          <div>
            <span className="text-ink-400 block mb-1 uppercase font-semibold">Platform Role</span>
            <div className="flex items-center gap-2 pt-2">
              <Badge tone="navy">{(profile?.role ?? "student").toUpperCase()}</Badge>
              <span className="text-ink-500">• Account Status: {profile ? "active" : "loading"}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-between items-center">
          <Link to={`/profile/${user.id}`}>
            <Button size="sm" variant="outline">
              <User className="h-4 w-4 mr-1" /> View Public Profile
            </Button>
          </Link>
          <span className="text-[11px] text-ink-400">ID: {user.id.slice(0, 8)}…</span>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-6 space-y-4">
        <h2 className="font-serif text-lg font-bold text-ink border-b border-ink-100 pb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-ink-600" />
          Change Password
        </h2>

        {pwMsg && (
          <div className={`rounded-lg p-3 text-xs border ${pwMsg.type === "ok" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
            {pwMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="New Password" hint="Min 8 characters">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Confirm New Password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
          </div>
          <Button type="submit" loading={pwLoading} size="sm">
            Update Password
          </Button>
        </form>
      </Card>

      {/* Notifications Preferences */}
      <Card className="p-6 space-y-4">
        <h2 className="font-serif text-lg font-bold text-ink border-b border-ink-100 pb-2 flex items-center gap-2">
          <Bell className="h-4 w-4 text-ink-600" />
          Notification Channels
        </h2>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-semibold text-ink block">In-App Notification Alerts</span>
              <span className="text-ink-400">Notify on join request decisions, task assignments, and discussions</span>
            </div>
            <input
              type="checkbox"
              checked={notifInApp}
              onChange={(e) => setNotifInApp(e.target.checked)}
              className="rounded text-navy focus:ring-navy h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer border-t border-ink-50 pt-3">
            <div>
              <span className="font-semibold text-ink block">Email Digest & Updates</span>
              <span className="text-ink-400">Receive milestone deadlines and faculty mentorship alerts via email</span>
            </div>
            <input
              type="checkbox"
              checked={notifEmail}
              onChange={(e) => setNotifEmail(e.target.checked)}
              className="rounded text-navy focus:ring-navy h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer border-t border-ink-50 pt-3">
            <div>
              <span className="font-semibold text-ink block">AI Project Recommendations</span>
              <span className="text-ink-400">Notify when new high-compatibility research initiatives are published</span>
            </div>
            <input
              type="checkbox"
              checked={notifMatch}
              onChange={(e) => setNotifMatch(e.target.checked)}
              className="rounded text-navy focus:ring-navy h-4 w-4"
            />
          </label>
        </div>
      </Card>

      {/* Danger zone info */}
      <Card className="p-6 space-y-3 border-red-100 bg-red-50/20">
        <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
          <AlertTriangle className="h-4 w-4 text-red-700" />
          Account Management
        </div>
        <p className="text-xs text-ink-600 leading-relaxed">
          To deactivate or delete your account, contact your institution administrator or the platform support team.
        </p>
        <div className="flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Your data is stored securely in Supabase with row-level security.
        </div>
      </Card>
    </div>
  );
}
