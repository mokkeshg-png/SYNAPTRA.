import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { resetPasswordEmail } from "@/lib/supabase-db";
import { Lock, Mail, AlertCircle } from "lucide-react";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string>("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirect);
    } catch (err: any) {
      setError(err?.message || "Invalid email or password. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await resetPasswordEmail(forgotEmail);
      setForgotMsg("Password reset email sent. Check your inbox for a link to reset your password.");
    } catch (err: any) {
      setForgotMsg(err?.message || "Failed to send reset email. Please verify your email address.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white font-serif font-bold text-2xl shadow-md">
            S
          </div>
          <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink">
            Sign in to SYNAPTRA
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            Access your research projects, teams, and collaborative workspace
          </p>
        </div>

        <Card className="shadow-lift border-ink-200">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Institutional Email" hint="Your university or research institute email">
              <div className="relative">
                <Input
                  type="email"
                  required
                  placeholder="name@institution.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
              </div>
            </Field>

            <Field label="Password">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
              </div>
            </Field>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-ink-300 text-navy focus:ring-navy"
              />
              <label htmlFor="showPassword" className="text-sm text-ink-600 cursor-pointer">
                Show Password
              </label>
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotEmail(email);
                  setForgotMsg("");
                }}
                className="font-medium text-navy hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-ink-500">
          Don't have an account yet?{" "}
          <Link to="/register" className="font-semibold text-navy hover:underline">
            Register as Student or Faculty
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset Account Password"
      >
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          {forgotMsg && (
            <div className="rounded-lg bg-navy-50 p-3 text-xs text-navy-800 border border-navy-200">
              {forgotMsg}
            </div>
          )}

          <Field label="Your Registered Email">
            <Input
              type="email"
              required
              placeholder="name@university.ac.in"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setForgotOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={forgotLoading}>
              Send Reset Email
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
