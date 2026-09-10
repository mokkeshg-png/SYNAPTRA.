import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { resetStore, initStore, login } from "@/lib/store";
import { DEMO_CREDENTIALS } from "@/lib/seed";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export function Settings() {
  const { user, refresh } = useAuth();

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifMatch, setNotifMatch] = useState(true);
  const [resetting, setResetting] = useState(false);

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

  const handleSwitchPersona = async (email: string) => {
    await login(email, DEMO_CREDENTIALS.password);
    refresh();
  };

  const handleResetSeed = async () => {
    if (confirm("Reset local database to default demo seed data? All custom additions will revert to initial state.")) {
      setResetting(true);
      resetStore();
      await initStore();
      refresh();
      setResetting(false);
      alert("Local store re-initialized to default demo data.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800 mb-2">
          <SettingsIcon className="h-3.5 w-3.5 text-navy-600" />
          <span>Account Preferences & Testing</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-ink">Settings & Preferences</h1>
        <p className="mt-1 text-sm text-ink-500">
          Manage your account credentials, notifications, and test platform roles
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
            <Input disabled value={user.email} className="bg-paper-50" />
          </div>
          <div>
            <span className="text-ink-400 block mb-1 uppercase font-semibold">Platform Role</span>
            <div className="flex items-center gap-2 pt-2">
              <Badge tone="navy">{user.role.toUpperCase()}</Badge>
              <span className="text-ink-500">• Account Status: {user.status}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-between items-center">
          <Link to={`/profile/${user.id}`}>
            <Button size="sm" variant="outline">
              <User className="h-4 w-4 mr-1" /> View Public Profile
            </Button>
          </Link>
          <span className="text-[11px] text-ink-400">User ID: {user.id}</span>
        </div>
      </Card>

      {/* Demo Role Switcher Section */}
      <Card className="p-6 space-y-4 border-brass-200 bg-brass-50/20">
        <div>
          <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
            <Shield className="h-4 w-4 text-brass-700" />
            Switch Active Academic Persona
          </h2>
          <p className="text-xs text-ink-500">
            Instant evaluation tool to test the platform as different PRD user personas:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSwitchPersona(DEMO_CREDENTIALS.student)}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              user.email === DEMO_CREDENTIALS.student
                ? "border-navy bg-navy-50 font-bold"
                : "border-ink-200 bg-white hover:bg-paper-50"
            }`}
          >
            <div>
              <div className="text-xs font-bold text-ink">Rahul Mehta (Student)</div>
              <div className="text-[11px] text-ink-500">Computer Vision & PyTorch</div>
            </div>
            {user.email === DEMO_CREDENTIALS.student && <CheckCircle2 className="h-4 w-4 text-navy" />}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchPersona(DEMO_CREDENTIALS.owner)}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              user.email === DEMO_CREDENTIALS.owner
                ? "border-navy bg-navy-50 font-bold"
                : "border-ink-200 bg-white hover:bg-paper-50"
            }`}
          >
            <div>
              <div className="text-xs font-bold text-ink">Arjun Nair (Project Owner)</div>
              <div className="text-[11px] text-ink-500">Plant Disease Detection Lab</div>
            </div>
            {user.email === DEMO_CREDENTIALS.owner && <CheckCircle2 className="h-4 w-4 text-navy" />}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchPersona(DEMO_CREDENTIALS.faculty)}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              user.email === DEMO_CREDENTIALS.faculty
                ? "border-navy bg-navy-50 font-bold"
                : "border-ink-200 bg-white hover:bg-paper-50"
            }`}
          >
            <div>
              <div className="text-xs font-bold text-ink">Dr. Priya Sharma (Faculty)</div>
              <div className="text-[11px] text-ink-500">Healthcare AI Research Mentor</div>
            </div>
            {user.email === DEMO_CREDENTIALS.faculty && <CheckCircle2 className="h-4 w-4 text-navy" />}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchPersona(DEMO_CREDENTIALS.admin)}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              user.email === DEMO_CREDENTIALS.admin
                ? "border-navy bg-navy-50 font-bold"
                : "border-ink-200 bg-white hover:bg-paper-50"
            }`}
          >
            <div>
              <div className="text-xs font-bold text-ink">Platform Administrator</div>
              <div className="text-[11px] text-ink-500">Moderation & Platform Desk</div>
            </div>
            {user.email === DEMO_CREDENTIALS.admin && <CheckCircle2 className="h-4 w-4 text-navy" />}
          </button>
        </div>
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

      {/* Reset State Action */}
      <Card className="p-6 space-y-3 border-red-100 bg-red-50/20">
        <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
          <AlertTriangle className="h-4 w-4 text-red-700" />
          Reset Demo Data
        </div>
        <p className="text-xs text-ink-600 leading-relaxed">
          Restore the browser local storage state back to original PRD seed data (all seed projects, users, tasks, and notes).
        </p>
        <Button variant="danger" size="sm" onClick={handleResetSeed} loading={resetting}>
          <RefreshCw className="h-3.5 w-3.5" /> Re-seed Demo Database
        </Button>
      </Card>
    </div>
  );
}
