import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAllProfiles,
  fetchProjects,
  fetchReports,
  fetchAuditLogs,
  suspendUser,
  adminDeleteUser,
  moderateProject,
  resolveReport,
} from "@/lib/supabase-db";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import type { Profile, Project, Report, AuditLog, ModerationAction } from "@/types";
import {
  Shield, Users, FolderGit2, AlertTriangle, BrainCircuit,
  History, Lock, CheckCircle2, Search, Sliders,
} from "lucide-react";

type AdminTab = "overview" | "users" | "projects" | "reports" | "ai" | "audit";

export function Admin() {
  const { user, profile: authProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [aiCount, setAiCount] = useState(0);

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");
  const [reportFilter, setReportFilter] = useState("all");

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [modAction, setModAction] = useState<ModerationAction>("dismiss");

  async function loadData() {
    const [profs, projs, reps, logs, aiRes] = await Promise.all([
      fetchAllProfiles(),
      fetchProjects(),
      fetchReports(),
      fetchAuditLogs(),
      supabase!.from("ai_analyses").select("id", { count: "exact", head: true }),
    ]);
    setProfiles(profs);
    setProjects(projs);
    setReports(reps);
    setAuditLogs(logs);
    setAiCount(aiRes.count ?? 0);
  }

  useEffect(() => { loadData(); }, []);

  if (!user) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center p-6">
        <div className="rounded-full bg-red-100 p-3 text-red-700"><Lock className="h-8 w-8" /></div>
        <h2 className="font-serif text-2xl font-bold text-ink">Sign In Required</h2>
        <Link to="/login"><Button variant="outline">Return to Dashboard</Button></Link>
      </div>
    );
  }

  if (authProfile && authProfile.role !== "admin") {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center p-6">
        <div className="rounded-full bg-red-100 p-3 text-red-700"><Lock className="h-8 w-8" /></div>
        <h2 className="font-serif text-2xl font-bold text-ink">Access Restricted</h2>
        <p className="text-sm text-ink-500 max-w-sm">This area is reserved for platform administrators.</p>
        <Link to="/dashboard"><Button variant="outline">Return to Dashboard</Button></Link>
      </div>
    );
  }

  // KPIs
  const totalUsers = profiles.length;
  const totalProjects = projects.length;
  const openProjects = projects.filter((p) => p.status === "open").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const pendingReports = reports.filter((r) => r.status === "pending").length;

  const studentsCount = profiles.filter(p => p.role === "student" && !p.designation).length;
  const teachersCount = profiles.filter(p => p.role === "faculty" || !!p.designation).length;
  const adminsCount = profiles.filter(p => p.role === "admin").length;

  const allSkills = profiles.flatMap(p => p.skills || []).map(s => s.skill);
  const skillCounts = allSkills.reduce((acc, skill) => {
    acc[skill] = (acc[skill] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill, count]) => ({ skill, count, percentage: Math.round((count / Math.max(allSkills.length, 1)) * 100) }));

  const filteredUsers = profiles.filter((p) => {
    const isFaculty = p.role === "faculty" || !!p.designation;
    const isAdmin = p.role === "admin";
    if (userRoleFilter === "faculty" && !isFaculty) return false;
    if (userRoleFilter === "student" && (isFaculty || isAdmin)) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      if (!p.fullName.toLowerCase().includes(q) && !p.institution.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredProjects = projects.filter((p) => {
    if (projectStatusFilter !== "all" && p.status !== projectStatusFilter) return false;
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.domains.some((d) => d.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const filteredReports = reports.filter((r) => {
    if (reportFilter !== "all" && r.status !== reportFilter) return false;
    return true;
  });

  const handleSuspendUser = async (targetUserId: string) => {
    if (confirm("Suspend/restore this user account?")) {
      await suspendUser(user.id, targetUserId);
      await loadData();
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (confirm("Permanently delete this user and their profile data?")) {
      await adminDeleteUser(user.id, targetUserId);
      await loadData();
    }
  };

  const handleModerateProject = async (projId: string, status: "flagged" | "removed" | "open") => {
    await moderateProject(user.id, projId, status);
    await loadData();
  };

  const handleResolveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId) return;
    await resolveReport(user.id, selectedReportId, modAction);
    await loadData();
    setResolveModalOpen(false);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Sliders },
    { id: "users", label: `Users (${filteredUsers.length})`, icon: Users },
    { id: "projects", label: `Projects (${filteredProjects.length})`, icon: FolderGit2 },
    { id: "reports", label: `Reports (${pendingReports} pending)`, icon: AlertTriangle, badge: pendingReports > 0 ? pendingReports : undefined },
    { id: "ai", label: `AI Logs (${aiCount})`, icon: BrainCircuit },
    { id: "audit", label: `Audit (${auditLogs.length})`, icon: History },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-navy-800">
              <Shield className="h-3.5 w-3.5 text-navy-600" /> Institutional Moderation Desk
            </span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink">Platform Administration</h1>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">Monitor platform metrics, moderate reported content, and manage user permissions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-ink-100 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${isActive ? "bg-navy text-white shadow-xs" : "text-ink-600 hover:bg-paper-100"}`}>
              <Icon className="h-4 w-4" /><span>{tab.label}</span>
              {tab.badge ? <span className="rounded-full bg-red-600 px-1.5 text-[10px] text-white">{tab.badge}</span> : null}
            </button>
          );
        })}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Total Users</span>
                <p className="font-serif text-3xl font-bold text-ink mt-1">{totalUsers}</p>
              </div>
              <span className="text-xs text-navy font-medium mt-2">{studentsCount} Students • {teachersCount} Faculty{adminsCount > 0 ? ` • ${adminsCount} Admin` : ""}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Total Projects</span>
                <p className="font-serif text-3xl font-bold text-ink mt-1">{totalProjects}</p>
              </div>
              <span className="text-xs text-navy font-medium mt-2">{openProjects} open • {completedProjects} completed</span>
            </Card>
            <Card className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">AI Analyses</span>
                <p className="font-serif text-3xl font-bold text-ink mt-1">{aiCount}</p>
              </div>
              <span className="text-xs text-ink-500 mt-2">Compatibility mappings</span>
            </Card>
            <Card className="p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Pending Reports</span>
                <p className="font-serif text-3xl font-bold text-red-700 mt-1">{pendingReports}</p>
              </div>
              <span className="text-xs text-red-600 font-medium mt-2">Requires moderation</span>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-serif text-lg font-bold text-ink">Overall Skill Distribution</h3>
              <div className="space-y-3">
                {topSkills.length > 0 ? topSkills.map(ts => (
                  <div key={ts.skill} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink">{ts.skill}</span>
                      <span className="text-ink-500">{ts.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-paper-100 rounded-full overflow-hidden">
                      <div className="h-full bg-navy rounded-full" style={{ width: `${ts.percentage}%` }} />
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-ink-400 italic">No skills recorded yet.</p>
                )}
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <h3 className="font-serif text-lg font-bold text-ink">Institutional Compliance</h3>
              <ul className="space-y-2 text-xs text-ink-700 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>Supabase RLS enforced on all tables</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>Audit logging enabled for interventions</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>Data stored securely within approved regions</span></li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: USERS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input placeholder="Search users by name or institution..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9" />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            </div>
            <Select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} className="sm:w-48">
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </Select>
          </div>
          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-ink-100 text-xs">
              <thead className="bg-paper-50 text-ink-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Profile</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Institution</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50 text-ink-700">
                {filteredUsers.map((p) => (
                  <tr key={p.id} className="hover:bg-paper-50/50">
                    <td className="px-4 py-3">
                      <Link to={`/profile/${p.userId}`} className="font-semibold text-ink hover:underline">{p.fullName}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={p.role === "admin" ? "red" : p.designation || p.role === "faculty" ? "brass" : "navy"}>
                      {p.role === "admin" ? "ADMIN" : p.designation ? "FACULTY" : "STUDENT"}
                    </Badge>
                    </td>
                    <td className="px-4 py-3">{p.institution}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => handleSuspendUser(p.userId)} className="text-amber-700 hover:bg-amber-50 text-xs">Suspend</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(p.userId)} className="text-red-700 hover:bg-red-50 text-xs">Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PROJECTS */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input placeholder="Search project title or domain..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="pl-9" />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            </div>
            <Select value={projectStatusFilter} onChange={(e) => setProjectStatusFilter(e.target.value)} className="sm:w-48">
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="flagged">Flagged</option>
              <option value="removed">Removed</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-ink-100 text-xs">
              <thead className="bg-paper-50 text-ink-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Domain</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50 text-ink-700">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-paper-50/50">
                    <td className="px-4 py-3">
                      <Link to={`/projects/${p.id}`} className="font-semibold text-ink hover:underline">{p.title}</Link>
                    </td>
                    <td className="px-4 py-3">{p.domains[0]}</td>
                    <td className="px-4 py-3">
                      <Badge tone={p.status === "open" ? "green" : p.status === "flagged" ? "amber" : p.status === "removed" ? "red" : "slate"}>
                        {p.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {p.status !== "flagged" && <Button size="sm" variant="outline" onClick={() => handleModerateProject(p.id, "flagged")} className="text-amber-700 text-xs">Flag</Button>}
                      {p.status !== "removed"
                        ? <Button size="sm" variant="ghost" onClick={() => handleModerateProject(p.id, "removed")} className="text-red-700 hover:bg-red-50 text-xs">Remove</Button>
                        : <Button size="sm" variant="outline" onClick={() => handleModerateProject(p.id, "open")} className="text-emerald-700 text-xs">Restore</Button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-xl font-bold text-ink">Moderation Queue</h2>
            <Select value={reportFilter} onChange={(e) => setReportFilter(e.target.value)} className="w-44">
              <option value="all">All Reports</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </Select>
          </div>
          {filteredReports.length === 0 ? (
            <Card className="p-8 text-center text-xs text-ink-400">No reports in this queue.</Card>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((r) => (
                <Card key={r.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge tone="red">{r.type.toUpperCase()}</Badge>
                      <span className="text-xs text-ink-500 ml-2">Target: <strong>{r.targetType}</strong></span>
                    </div>
                    <Badge tone={r.status === "pending" ? "amber" : "green"}>{r.status.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-ink-700 bg-paper-50 p-3 rounded-lg"><strong>Details:</strong> {r.details}</p>
                  {r.status === "pending" && (
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedReportId(r.id); setResolveModalOpen(true); }}>
                        Take Action →
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: AI LOGS */}
      {activeTab === "ai" && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-ink">AI Execution Logs</h2>
          <Card className="p-6 text-center space-y-2">
            <p className="font-serif text-3xl font-bold text-navy">{aiCount}</p>
            <p className="text-xs text-ink-500">Total AI analyses stored in Supabase</p>
            <p className="text-xs text-ink-400">All scores are advisory — humans always decide.</p>
          </Card>
        </div>
      )}

      {/* TAB: AUDIT */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-ink">Administrative Audit Trail</h2>
          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-ink-100 text-xs">
              <thead className="bg-paper-50 text-ink-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Target</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50 text-ink-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-paper-50/50">
                    <td className="px-4 py-3 font-semibold uppercase">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-[11px]">{log.target}</td>
                    <td className="px-4 py-3">{log.details}</td>
                    <td className="px-4 py-3 text-right text-ink-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      <Modal open={resolveModalOpen} onClose={() => setResolveModalOpen(false)} title="Resolve Moderation Report">
        <form onSubmit={handleResolveReport} className="space-y-4">
          <Field label="Choose Action">
            <Select value={modAction} onChange={(e) => setModAction(e.target.value as ModerationAction)}>
              <option value="dismiss">Dismiss (No violation found)</option>
              <option value="warn">Issue Official Warning</option>
              <option value="remove_content">Remove Flagged Content</option>
              <option value="suspend">Suspend User Account</option>
              <option value="escalate">Escalate to Ethics Committee</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setResolveModalOpen(false)}>Cancel</Button>
            <Button type="submit">Confirm Resolution</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
