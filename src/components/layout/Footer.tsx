import { Link } from "react-router-dom";
import { ShieldCheck, Sparkles, BookOpen, GitBranch } from "lucide-react";
import { AI_DISCLAIMER } from "@/types";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-100 bg-white text-ink-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Col 1: Brand & Ethics */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-white font-serif font-bold text-lg">
                S
              </div>
              <span className="font-serif text-lg font-bold tracking-tight text-ink">
                SYNAPTRA
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink-500 max-w-md">
              A centralized university digital ecosystem designed to replace fragmented academic channels with structured, AI-assisted research team formation, compatibility analysis, and private collaborative project rooms.
            </p>
            <div className="rounded-lg border border-brass-200 bg-brass-50/50 p-3 text-xs text-brass-800">
              <div className="flex items-center gap-1.5 font-semibold text-brass-900 mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Academic AI Ethics Principle</span>
              </div>
              <p>{AI_DISCLAIMER}</p>
            </div>
          </div>

          {/* Col 2: Platform Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-900">
              Platform
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/projects" className="hover:text-navy transition-colors">
                  Explore Research Projects
                </Link>
              </li>
              <li>
                <Link to="/collaborators" className="hover:text-navy transition-colors">
                  Find Researchers & Mentors
                </Link>
              </li>
              <li>
                <Link to="/projects/new" className="hover:text-navy transition-colors">
                  Create Project Proposal
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-navy transition-colors">
                  Academic Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Academic Standards & Moderation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-900">
              Governance & Integrity
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Role-Based Access Control</span>
              </li>
              <li className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-navy" />
                <span>Explainable AI Engine</span>
              </li>
              <li className="flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-ink-500" />
                <span>GitHub Evidence Audit</span>
              </li>
              <li>
                <Link to="/admin" className="text-navy hover:underline text-xs">
                  Institutional Moderation Desk
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-ink-100 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-ink-400 gap-4">
          <p>© {new Date().getFullYear()} SYNAPTRA Academic Network. Built strictly adhering to PRD Master Specification.</p>
          <div className="flex items-center gap-4">
            <span>Academic Version 2.0</span>
            <span>•</span>
            <span>All Data Local & Secure</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
