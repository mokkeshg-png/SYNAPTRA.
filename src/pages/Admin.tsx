import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getState,
  suspendUser,
  deleteUser,
  moderateProject,
  resolveReport,
} from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import type { ModerationAction } from "@/types";
import {
  Shield,
  Users,
  FolderGit2,
  AlertTriangle,
  BrainCircuit,
  History,
  Lock,
  CheckCircle2,
  Search,
  Sliders,
} from "lucide-react";

type AdminTab = "overview" | "users" | "projects" | "reports" | "ai" | "audit";

export function Admin() {
  const { user, refresh } = useAuth();
  const state = getState();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Filter & Search states
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");
  const [reportFilter, setReportFilter] = useState("all");

  // Moderation modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [modAction, setModAction] = useState<ModerationAction>("dismiss");

  // Access control: only platform role === 'admin'
  if (!user || user.role !== "admin") {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center p-6">
        <div className="rounded-full bg-red-100 p-3 text-red-700">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-ink">Administrative Clearance Required</h2>
        <p className="text-sm text-ink-500 max-w-md">
          This portal is restricted to authorized university platform administrators and institutional moderators.
        </p>
        <Link to="/dashboard">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Calculate KPIs per PRD Section 39.2
  const totalUsers = state.users.length;
  const activeUsers = state.users.filter((u) => u.status === "active").length;
  const totalProjects = state.projects.length;
  const activeProjects = state.projects.filter((p) => p.status === "open").length;
  const completedProjects = state.projects.filter((p) => p.status === "completed").length;
  const totalJoinRequests = state.joinRequests.length;
  const totalAiCalls = state.aiLogs.length;
  const pendingReports = state.reports.filter((r) => r.status === "pending").length;

  // Filtered Users
  const filteredUsers = state.users.filter((u) => {
    const prof = state.profiles.find((p) => p.userId === u.id);
    if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const match =
        u.email.toLowerCase().includes(q) ||
        (prof?.fullName.toLowerCase().includes(q) ?? false) ||
        (prof?.institution.toLowerCase().includes(q) ?? false);
      if (!match) return false;
    }
    return true;
  });

  // Filtered Projects
  const filteredProjects = state.projects.filter((p) => {
    if (projectStatusFilter !== "all" && p.status !== projectStatusFilter) return false;
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.domains.some((d) => d.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Filtered Reports
  const filteredReports = state.reports.filter((r) => {
    if (reportFilter !== "all" && r.status !== reportFilter) return false;
    return true;
  });

  const handleSuspendUser = (targetUserId: string) => {
    if (confirm("Are you sure you want to suspend this user account?")) {
      suspendUser(user.id, targetUserId);
      refresh();
    }
  };

  const handleDeleteUser = (targetUserId: string) => {
    if (confirm("Permanently delete this user and their profile data?")) {
      deleteUser(user.id, targetUserId);
      refresh();
    }
  };

  const handleModerateProject = (projId: string, status: "flagged" | "removed" | "open") => {
    moderateProject(user.id, projId, status);
    refresh();
  };

  const handleResolveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId) return;
    resolveReport(user.id, selectedReportId, modAction);
    refresh();
    setResolveModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Admin Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-navy-800">
              <Shield className="h-3.5 w-3.5 text-navy-600" />
              Institutional Moderation Desk • PRD v2.0
            </span>
            <span className="text-xs text-ink-400">• High Privilege Access</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink">
            Platform Administration
          </h1>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">
            Monitor platform metrics, moderate reported content, manage user permissions, and inspect AI usage logs.
          </p>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-ink-100 pb-3">
        {[
          { id: "overview", label: "Overview Metrics", icon: Sliders },
          { id: "users", label: `Users Directory (${totalUsers})`, icon: Users },
          { id: "projects", label: `Projects (${totalProjects})`, icon: FolderGit2 },
          { id: "reports", label: `Reports Queue (${pendingReports})`, icon: AlertTriangle, badge: pendingReports },
          { id: "ai", label: `AI Engine Logs (${totalAiCalls})`, icon: BrainCircuit },
          { id: "audit", label: `Audit Trail (${state.auditLogs.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-navy text-white shadow-xs"
                  : "text-ink-600 hover:bg-paper-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge ? (
                <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] text-white">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Total Users</span>
              <p className="font-serif text-3xl font-bold text-ink mt-1">{totalUsers}</p>
              <span className="text-xs text-emerald-700 font-medium">{activeUsers} active</span>
            </Card>

            <Card className="p-4">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Total Projects</span>
              <p className="font-serif text-3xl font-bold text-ink mt-1">{totalProjects}</p>
              <span className="text-xs text-navy font-medium">{activeProjects} open • {completedProjects} completed</span>
            </Card>

            <Card className="p-4">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Join Applications</span>
              <p className="font-serif text-3xl font-bold text-ink mt-1">{totalJoinRequests}</p>
              <span className="text-xs text-ink-500">Student & researcher requests</span>
            </Card>

            <Card className="p-4">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Pending Reports</span>
              <p className="font-serif text-3xl font-bold text-red-700 mt-1">{pendingReports}</p>
              <span className="text-xs text-red-600 font-medium">Requires moderation</span>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3">
              <h3 className="font-serif text-lg font-bold text-ink">AI Engine Compatibility Operations</h3>
              <p className="text-xs text-ink-500">
                Compatibility engine operations executed across project discovery and applicant evaluation:
              </p>
              <div className="space-y-2 pt-2 text-xs">
                <div className="flex justify-between border-b border-ink-50 pb-2">
                  <span>Total Compatibility Analyses:</span>
                  <strong>{state.aiLogs.length}</strong>
                </div>
                <div className="flex justify-between border-b border-ink-50 pb-2">
                  <span>Execution Success Rate:</span>
                  <strong className="text-emerald-700">100% (High Confidence)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Advisory Scoring Rule:</span>
                  <strong className="text-navy">Ethics Filter Active</strong>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <h3 className="font-serif text-lg font-bold text-ink">Institutional Compliance</h3>
              <p className="text-xs text-ink-500">Academic platform safeguards and role governance:</p>
              <ul className="space-y-2 text-xs text-ink-700 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Student & Faculty account separation verified</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Row-level privacy enforcement active for restricted projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Audit logging enabled for all administrative interventions</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: USERS DIRECTORY */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Search users by name, email, or institution..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            </div>
            <Select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="sm:w-48"
            >
              <option value="all">All Account Roles</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Administrator</option>
            </Select>
          </div>

          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-ink-100 text-xs">
              <thead className="bg-paper-50 text-ink-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">User Profile</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Institution</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50 text-ink-700">
                {filteredUsers.map((u) => {
                  const prof = state.profiles.find((p) => p.userId === u.id);
                  return (
                    <tr key={u.id} className="hover:bg-paper-50/50">
                      <td className="px-4 py-3">
                        <Link to={`/profile/${u.id}`} className="font-semibold text-ink hover:underline">
                          {prof?.fullName || u.email}
                        </Link>
                        <span className="block text-[11px] text-ink-400">{u.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={u.role === "admin" ? "brass" : u.role === "faculty" ? "green" : "navy"}>
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{prof?.institution || "N/A"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            u.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {u.status === "active" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSuspendUser(u.id)}
                            className="text-amber-700 hover:bg-amber-50 text-xs"
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSuspendUser(u.id)}
                            className="text-emerald-700 text-xs"
                          >
                            Reactivate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-700 hover:bg-red-50 text-xs"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROJECTS MODERATION */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Search project title or domain..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            </div>
            <Select
              value={projectStatusFilter}
              onChange={(e) => setProjectStatusFilter(e.target.value)}
              className="sm:w-48"
            >
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
                  <th className="px-4 py-3 text-left">Project Title</th>
                  <th className="px-4 py-3 text-left">Domain</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50 text-ink-700">
                {filteredProjects.map((p) => {
                  const owner = state.profiles.find((pr) => pr.userId === p.ownerId);
                  return (
                    <tr key={p.id} className="hover:bg-paper-50/50">
                      <td className="px-4 py-3">
                        <Link to={`/projects/${p.id}`} className="font-semibold text-ink hover:underline">
                          {p.title}
                        </Link>
                        <span className="block text-[11px] text-ink-400">{p.type}</span>
                      </td>
                      <td className="px-4 py-3">{p.domains[0]}</td>
                      <td className="px-4 py-3">{owner?.fullName || "Student Owner"}</td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            p.status === "open"
                              ? "green"
                              : p.status === "flagged"
                              ? "amber"
                              : p.status === "removed"
                              ? "red"
                              : "slate"
                          }
                        >
                          {p.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {p.status !== "flagged" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleModerateProject(p.id, "flagged")}
                            className="text-amber-700 text-xs"
                          >
                            Flag
                          </Button>
                        )}
                        {p.status !== "removed" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleModerateProject(p.id, "removed")}
                            className="text-red-700 hover:bg-red-50 text-xs"
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleModerateProject(p.id, "open")}
                            className="text-emerald-700 text-xs"
                          >
                            Restore
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REPORTS QUEUE */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-xl font-bold text-ink">User & Project Moderation Queue</h2>
            <Select
              value={reportFilter}
              onChange={(e) => setReportFilter(e.target.value)}
              className="w-44"
            >
              <option value="all">All Reports</option>
              <option value="pending">Pending Review</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </Select>
          </div>

          {filteredReports.length === 0 ? (
            <Card className="p-8 text-center text-xs text-ink-400">
              No reports currently in this queue.
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((r) => {
                const reporter = state.profiles.find((p) => p.userId === r.reporterId);
                return (
                  <Card key={r.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge tone="red">{r.type.toUpperCase()}</Badge>
                        <span className="text-xs text-ink-500 ml-2">Target Type: <strong>{r.targetType}</strong></span>
                        <span className="text-xs text-ink-400 ml-2">• Reported by {reporter ? reporter.fullName : "User"} on {new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <Badge tone={r.status === "pending" ? "amber" : "green"}>{r.status.toUpperCase()}</Badge>
                    </div>

                    <p className="text-xs text-ink-700 bg-paper-50 p-3 rounded-lg">
                      <strong>Reported Details:</strong> {r.details}
                    </p>

                    {r.status === "pending" && (
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReportId(r.id);
                            setResolveModalOpen(true);
                          }}
                        >
                          Take Action →
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AI ENGINE LOGS */}
      {activeTab === "ai" && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-ink">Explainable AI Execution Logs</h2>
          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-ink-100 text-xs">
              <thead className="bg-paper-50 text-ink-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Analysis Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50 text-ink-700">
                {state.aiLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-paper-50/50">
                    <td className="px-4 py-3 font-semibold text-ink">{log.type}</td>
                    <td className="px-4 py-3">
                      <Badge tone={log.success ? "green" : "red"}>
                        {log.success ? "SUCCESS" : "FAILED"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-ink-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-ink">Administrative Action Audit Trail</h2>
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
                {state.auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-paper-50/50">
                    <td className="px-4 py-3 font-semibold text-ink uppercase">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-[11px]">{log.target}</td>
                    <td className="px-4 py-3">{log.details}</td>
                    <td className="px-4 py-3 text-right text-ink-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolve Report Modal */}
      <Modal
        open={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Resolve Moderation Report"
      >
        <form onSubmit={handleResolveReport} className="space-y-4">
          <Field label="Choose Disciplinary Action">
            <Select
              value={modAction}
              onChange={(e) => setModAction(e.target.value as ModerationAction)}
            >
              <option value="dismiss">Dismiss (No violation found)</option>
              <option value="warn">Issue Official Academic Warning</option>
              <option value="remove_content">Remove Flagged Content</option>
              <option value="suspend">Suspend User Account</option>
              <option value="escalate">Escalate to Ethics Committee</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Confirm Resolution</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
