import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchAllProfiles, fetchProjects } from "@/lib/supabase-db";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import type { Profile, Project } from "@/types";
import { Search as SearchIcon, Loader2, X } from "lucide-react";

type Tab = "students" | "faculty" | "projects";

function uniqueId(p: Profile) {
  const prefix = p.designation ? "FAC" : "STU";
  return `${prefix}-${p.userId.substring(0, 6).toUpperCase()}`;
}

export function Search() {
  const { profile: authProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("students");
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [profs, projs] = await Promise.all([fetchAllProfiles(), fetchProjects()]);
      if (!cancelled) {
        setProfiles(profs);
        setProjects(projs);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const students = useMemo(() => profiles.filter(p => !p.designation && p.role !== "admin"), [profiles]);
  const faculty = useMemo(() => profiles.filter(p => !!p.designation), [profiles]);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach(p => p.skills.forEach(s => set.add(s.skill)));
    return Array.from(set).sort();
  }, [profiles]);

  const allDepartments = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach(p => { if (p.department) set.add(p.department); });
    return Array.from(set).sort();
  }, [profiles]);

  const q = query.toLowerCase().trim();

  const filteredStudents = useMemo(() => students.filter(p => {
    if (q && !p.fullName.toLowerCase().includes(q) && !p.department.toLowerCase().includes(q) && !p.skills.some(s => s.skill.toLowerCase().includes(q))) return false;
    if (skillFilter !== "all" && !p.skills.some(s => s.skill === skillFilter)) return false;
    if (deptFilter !== "all" && p.department !== deptFilter) return false;
    return true;
  }), [students, q, skillFilter, deptFilter]);

  const filteredFaculty = useMemo(() => faculty.filter(p => {
    if (q && !p.fullName.toLowerCase().includes(q) && !p.department.toLowerCase().includes(q) && !p.expertise.some(e => e.toLowerCase().includes(q))) return false;
    if (deptFilter !== "all" && p.department !== deptFilter) return false;
    return true;
  }), [faculty, q, deptFilter]);

  const filteredProjects = useMemo(() => projects.filter(p => {
    if (p.status === "removed") return false;
    if (p.visibility === "private" && p.ownerId !== authProfile?.id) return false;
    if (q && !p.title.toLowerCase().includes(q) && !p.requiredSkills.some(s => s.toLowerCase().includes(q)) && !p.tags.some(t => t.toLowerCase().includes(q))) return false;
    if (skillFilter !== "all" && !p.requiredSkills.includes(skillFilter)) return false;
    return true;
  }), [projects, q, skillFilter, authProfile]);

  const clearFilters = () => { setQuery(""); setSkillFilter("all"); setDeptFilter("all"); };
  const hasFilters = q || skillFilter !== "all" || deptFilter !== "all";

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "students", label: "Students", count: filteredStudents.length },
    { id: "faculty", label: "Faculty", count: filteredFaculty.length },
    { id: "projects", label: "Projects", count: filteredProjects.length },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">Search Campus</h1>
        <p className="mt-1 text-sm text-ink-500">Find students, faculty, projects, and skills across the platform</p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search by name, skill, department, technology..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
        </div>
        <Select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} className="sm:w-48">
          <option value="all">All Skills</option>
          {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="sm:w-48">
          <option value="all">All Departments</option>
          {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-ink-100 pb-3">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${tab === t.id ? "bg-navy text-white shadow-sm" : "text-ink-600 hover:bg-paper-100"}`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === t.id ? "bg-white/20" : "bg-ink-100"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Results */}
      {tab === "students" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-ink-400 col-span-3 text-center py-12">No students match your search.</p>
          ) : filteredStudents.map(p => (
            <Card key={p.id} className="p-5 hover:border-navy transition space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy text-white font-serif font-bold text-lg">
                  {p.photoUrl ? <img src={p.photoUrl} alt="" className="h-full w-full rounded-xl object-cover" /> : p.fullName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif font-bold text-ink truncate">{p.fullName}</h3>
                  <p className="text-xs text-ink-500 truncate">{p.department}</p>
                  <p className="text-[11px] text-ink-400">{uniqueId(p)} • Year {p.academicYear ?? "—"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.skills.slice(0, 4).map(s => (
                  <Badge key={s.skill} tone="navy">{s.skill}</Badge>
                ))}
                {p.skills.length > 4 && <span className="text-[10px] text-ink-400 self-center">+{p.skills.length - 4}</span>}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-ink-400">{p.pastProjects?.length || 0} projects</span>
                <Link to={`/profile/${p.userId}`}>
                  <Button size="sm" variant="outline">View Profile</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "faculty" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFaculty.length === 0 ? (
            <p className="text-sm text-ink-400 col-span-3 text-center py-12">No faculty match your search.</p>
          ) : filteredFaculty.map(p => (
            <Card key={p.id} className="p-5 hover:border-brass transition space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brass text-white font-serif font-bold text-lg">
                  {p.photoUrl ? <img src={p.photoUrl} alt="" className="h-full w-full rounded-xl object-cover" /> : p.fullName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif font-bold text-ink truncate">{p.fullName}</h3>
                  <p className="text-xs text-ink-500 truncate">{p.designation}</p>
                  <p className="text-[11px] text-ink-400">{uniqueId(p)} • {p.department}</p>
                </div>
              </div>
              {p.expertise.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.expertise.slice(0, 3).map(e => <Badge key={e} tone="brass">{e}</Badge>)}
                  {p.expertise.length > 3 && <span className="text-[10px] text-ink-400 self-center">+{p.expertise.length - 3}</span>}
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-2">
                  {p.openToMentoring && <Badge tone="green">Open to Mentor</Badge>}
                </div>
                <Link to={`/profile/${p.userId}`}>
                  <Button size="sm" variant="outline">View Profile</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "projects" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.length === 0 ? (
            <p className="text-sm text-ink-400 col-span-3 text-center py-12">No projects match your search.</p>
          ) : filteredProjects.map(proj => {
            const owner = profiles.find(p => p.userId === proj.ownerId);
            return (
              <Card key={proj.id} className="p-5 hover:border-navy transition space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link to={`/projects/${proj.id}`} className="font-serif font-bold text-ink hover:text-navy text-sm block truncate">{proj.title}</Link>
                    <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{proj.shortDescription}</p>
                  </div>
                  <Badge tone={proj.status === "open" ? "green" : "navy"}>{proj.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {proj.requiredSkills.slice(0, 4).map(s => <Badge key={s} tone="navy">{s}</Badge>)}
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-ink-400">
                  <span>by {owner?.fullName ?? "Unknown"}</span>
                  <Link to={`/projects/${proj.id}`}>
                    <Button size="sm">View Project</Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
