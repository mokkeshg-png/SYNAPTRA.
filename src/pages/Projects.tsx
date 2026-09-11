import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchProjects, fetchSkillsFromDB, fetchResearchInterestsFromDB } from "@/lib/supabase-db";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Card";

import { PROJECT_TYPES, ROLE_TEMPLATES } from "@/types";
import { projectMatchBreakdown } from "@/lib/matching";
import type { Project } from "@/types";
import { Search, Plus, Compass, X, Loader2 } from "lucide-react";

export function Projects() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [selectedSkill, setSelectedSkill] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"match" | "recent" | "deadline">("match");
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    let cancelled = false;
    fetchProjects().then((projs) => {
      if (!cancelled) { setProjects(projs); setLoading(false); }
    });
    fetchResearchInterestsFromDB().then((domains) => {
      if (!cancelled) setAllDomains(domains);
    });
    fetchSkillsFromDB().then((skills) => {
      if (!cancelled) setAllSkills(skills);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (p.status === "removed" && profile?.role !== "admin") return false;
      if (p.visibility === "private" && p.ownerId !== profile?.id) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesQuery =
          p.title.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)) ||
          p.requiredSkills.some((s) => s.toLowerCase().includes(q)) ||
          p.roles?.some((r) => r.name.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      if (selectedDomain !== "all" && !p.domains.includes(selectedDomain)) return false;
      if (selectedSkill !== "all" && !p.requiredSkills.includes(selectedSkill)) return false;
      if (selectedRole !== "all") {
        const hasRole = p.roles?.some((r) => r.name.toLowerCase() === selectedRole.toLowerCase() || r.name.toLowerCase().includes(selectedRole.toLowerCase()));
        if (!hasRole) return false;
      }
      if (selectedDifficulty !== "all" && p.difficulty !== selectedDifficulty) return false;
      if (selectedType !== "all" && p.type !== selectedType) return false;
      return true;
    });
  }, [projects, query, selectedDomain, selectedSkill, selectedRole, selectedDifficulty, selectedType, profile?.role]);

  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    if (sortBy === "match" && profile) {
      // Pre-compute scores once — avoids O(n log n) × 2 calls in the comparator
      const scores = new Map(list.map((p) => [p.id, projectMatchBreakdown(profile, p).score]));
      return list.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
    }
    if (sortBy === "recent") {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortBy === "deadline") {
      return list.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    }
    return list;
  }, [filteredProjects, sortBy, profile]);

  const displayedProjects = sortedProjects.slice(0, visibleCount);

  const clearFilters = () => {
    setQuery(""); setSelectedDomain("all"); setSelectedSkill("all");
    setSelectedRole("all"); setSelectedDifficulty("all"); setSelectedType("all");
  };

  const hasActiveFilters = query || selectedDomain !== "all" || selectedSkill !== "all" || selectedRole !== "all" || selectedDifficulty !== "all" || selectedType !== "all";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-navy-800">
              <Compass className="h-3 w-3" /> Directory
            </span>
            <span className="text-xs text-ink-400">• {filteredProjects.length} Projects Available</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink">Explore Research Projects</h1>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">
            Discover open academic and laboratory initiatives seeking team collaborators, domain specialists, and student leads.
          </p>
        </div>
        <Link to="/projects/new">
          <Button className="shadow-sm"><Plus className="h-4 w-4" /> Create Research Project</Button>
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search by keywords, algorithms, technologies, or tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-2.5 text-ink-400 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:w-56 shrink-0">
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="match">Sort: AI Match %</option>
              <option value="recent">Sort: Most Recent</option>
              <option value="deadline">Sort: Application Deadline</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 pt-1">
          <Select value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)}>
            <option value="all">All Domains</option>
            {allDomains.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            <option value="all">All Open Roles</option>
            {ROLE_TEMPLATES.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
          </Select>
          <Select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}>
            <option value="all">All Required Skills</option>
            {allSkills.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)}>
            <option value="all">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
          <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="all">All Project Types</option>
            {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-ink-50 text-xs text-ink-500">
            <span>Filtered results active</span>
            <button onClick={clearFilters} className="text-navy font-semibold hover:underline flex items-center gap-1">
              Clear all filters <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
        </div>
      ) : displayedProjects.length === 0 ? (
        <EmptyState
          title="No Matching Projects Found"
          body="Try adjusting your keywords, expanding your domain filters, or create the first project in this research area."
          action={
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={clearFilters}>Reset Filters</Button>
              <Link to="/projects/new"><Button>Create Project</Button></Link>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedProjects.map((p) => (
            <ProjectCard key={p.id} project={p} viewer={profile ?? undefined} />
          ))}
        </div>
      )}

      {visibleCount < sortedProjects.length && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + 6)}>
            Load More Projects ({sortedProjects.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
