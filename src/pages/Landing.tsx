import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BrainCircuit,
  Layers,
  GraduationCap,
} from "lucide-react";

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      {/* Hero Section with College Campus Background */}
      <section className="relative overflow-hidden py-20 lg:py-28 border-b border-ink-100 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/college-bg.png')" }}>
        {/* Subtle translucent overlay to ensure all text and UI elements remain perfectly clear and readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-paper-100/90 via-white/85 to-paper-50/90 backdrop-blur-[1px]" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-navy-50/80 px-3 py-1 text-xs font-semibold text-navy-800 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-navy-600" />
              <span>AI-Powered Academic Collaboration Platform • PRD v2.0</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink leading-tight">
              From scattered messages to <span className="text-navy">structured research collaboration</span>.
            </h1>

            <p className="mt-6 text-lg leading-8 text-ink-600 font-normal">
              A centralized digital university platform where students, researchers, and faculty discover projects, match via explainable AI compatibility, form balanced teams, and collaborate inside private research project rooms.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="shadow-md">
                    Open Your Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="shadow-md">
                      Get Started as Student or Faculty
                    </Button>
                  </Link>
                  <Link to="/projects">
                    <Button variant="outline" size="lg">
                      Explore Open Projects
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Live Campus Metrics Banner */}
      <section className="bg-navy text-white py-8 border-y border-navy-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-center">
            <div>
              <p className="font-serif text-3xl font-bold text-white">4</p>
              <p className="text-xs text-navy-200 mt-1 uppercase tracking-wider">Top Institutions</p>
            </div>
            <div>
              <p className="font-serif text-3xl font-bold text-white">8+</p>
              <p className="text-xs text-navy-200 mt-1 uppercase tracking-wider">Active Research Projects</p>
            </div>
            <div>
              <p className="font-serif text-3xl font-bold text-white">94%</p>
              <p className="text-xs text-navy-200 mt-1 uppercase tracking-wider">AI Match Accuracy</p>
            </div>
            <div>
              <p className="font-serif text-3xl font-bold text-white">100%</p>
              <p className="text-xs text-navy-200 mt-1 uppercase tracking-wider">Explainable AI Scoring</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="py-16 lg:py-24 bg-paper-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brass">The Academic Challenge</h2>
            <h3 className="mt-2 font-serif text-3xl font-bold text-ink sm:text-4xl">
              Why Traditional Collaboration Fails
            </h3>
            <p className="mt-3 text-sm text-ink-500">
              Students and professors spend weeks attempting to recruit compatible collaborators through unorganized chat channels and social platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Way */}
            <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 md:p-8">
              <div className="flex items-center gap-2 text-red-900 font-semibold mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-200 text-red-800 text-xs">✕</span>
                <h4>The Informal Way (WhatsApp / Telegram / Cold Email)</h4>
              </div>
              <ul className="space-y-3 text-sm text-red-900/80">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Zero skill verification:</strong> Unchecked self-declarations lead to mismatched technical roles.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Unbalanced teams:</strong> Too many duplicate skills with critical areas (frontend, ML, writing) completely missing.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Review burnout:</strong> Project owners spend countless hours sifting through unformatted messages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Fragmented progress:</strong> Notes scattered across docs, code lost in repos, no centralized project log.</span>
                </li>
              </ul>
            </div>

            {/* The Synaptra Way */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 md:p-8">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-200 text-emerald-800 text-xs">✓</span>
                <h4>The SYNAPTRA Ecosystem</h4>
              </div>
              <ul className="space-y-3 text-sm text-emerald-900/80">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span><strong>Explainable AI Matching:</strong> Mathematical compatibility breakdown with strengths, gaps, and evidence.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span><strong>Intelligent Team Formation:</strong> Algorithms identify team skill-gaps and recommend complementary teammates.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span><strong>Private Research Rooms:</strong> Collaborative workspace with Kanban tasks, literature notes, and datasets.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span><strong>Faculty Mentorship:</strong> Structured mentorship requests and milestone tracking for university professors.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Pillars */}
      <section className="py-16 lg:py-24 bg-white border-t border-ink-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-navy">Built for Academic Rigor</h2>
            <h3 className="mt-2 font-serif text-3xl font-bold text-ink sm:text-4xl">
              End-to-End Collaboration Architecture
            </h3>
            <p className="mt-3 text-sm text-ink-500">
              Designed according to academic workflow patterns: Discovery, Evaluation, Formation, and Execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:border-navy transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy mb-5">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h4 className="font-serif text-xl font-bold text-ink">AI Compatibility Engine</h4>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                Calculates a multi-factor score across technical skills, research domain interests, required role fit, and past academic experience with transparent confidence levels.
              </p>
              <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-brass font-medium">
                <span>Deterministic + AI Semantics</span>
                <span>Rule of Ethics ✓</span>
              </div>
            </Card>

            <Card className="hover:border-navy transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brass-50 text-brass mb-5">
                <Layers className="h-6 w-6" />
              </div>
              <h4 className="font-serif text-xl font-bold text-ink">Private Project Rooms</h4>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                Once accepted, team members access an all-in-one workspace featuring Kanban boards, literature review notes, citation managers, experiment records, and file stores.
              </p>
              <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-brass font-medium">
                <span>10 Specialized Workspaces</span>
                <span>Role Protected</span>
              </div>
            </Card>

            <Card className="hover:border-navy transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 mb-5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h4 className="font-serif text-xl font-bold text-ink">Institutional Integrity</h4>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                Clear separation between student and faculty workflows, role-based project access control, GitHub audit trail integration, and an administrative moderation desk.
              </p>
              <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-brass font-medium">
                <span>Student & Faculty Roles</span>
                <span>Full Audit Trail</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-br from-navy-900 to-ink-900 text-white text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <GraduationCap className="h-12 w-12 mx-auto text-brass-300 mb-4" />
          <h2 className="font-serif text-3xl sm:text-4xl font-bold">
            Ready to form your next research breakthrough?
          </h2>
          <p className="mt-4 text-base text-navy-200 max-w-2xl mx-auto">
            Join students and faculty across engineering and science departments. Discover projects matching your skills and start collaborating today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-brass hover:bg-brass-600 text-white shadow-lift">
                Register Your Account
              </Button>
            </Link>
            <Link to="/projects">
              <Button variant="outline" size="lg" className="border-navy-400 text-white hover:bg-navy-800">
                Browse Research Directory
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
