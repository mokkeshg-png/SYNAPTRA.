import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getState, inviteUser } from "@/lib/store";
import { PersonCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { INSTITUTIONS, ALL_SKILLS } from "@/lib/taxonomies";
import { Search, Users, Mail } from "lucide-react";

export function Collaborators() {
  const { user, refresh } = useAuth();
  const state = getState();

  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedInstitution, setSelectedInstitution] = useState<string>("all");
  const [selectedSkill, setSelectedSkill] = useState<string>("all");

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Projects owned by current user
  const ownedProjects = user
    ? state.projects.filter((p) => p.ownerId === user.id && p.status === "open")
    : [];

  const filteredProfiles = useMemo(() => {
    return state.profiles.filter((p) => {
      // Don't show suspended or deleted accounts
      const u = state.users.find((x) => x.id === p.userId);
      if (u && u.status !== "active") return false;

      // Search query
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesQuery =
          p.fullName.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          p.institution.toLowerCase().includes(q) ||
          p.skills.some((s) => s.skill.toLowerCase().includes(q)) ||
          p.interests.some((i) => i.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Role filter (student vs faculty)
      if (selectedRole !== "all") {
        if (u && u.role !== selectedRole) return false;
      }

      // Institution filter
      if (selectedInstitution !== "all" && p.institution !== selectedInstitution) {
        return false;
      }

      // Skill filter
      if (selectedSkill !== "all" && !p.skills.some((s) => s.skill === selectedSkill)) {
        return false;
      }

      return true;
    });
  }, [state.profiles, state.users, query, selectedRole, selectedInstitution, selectedSkill]);

  const handleOpenInvite = (userId: string, name: string) => {
    if (!user) {
      alert("Please sign in to invite collaborators.");
      return;
    }
    if (ownedProjects.length === 0) {
      alert("You need to have an active project you own to send invitations.");
      return;
    }
    setTargetUser({ id: userId, name });
    setSelectedProjectId(ownedProjects[0]?.id || "");
    setInviteModalOpen(true);
    setInviteSuccess(false);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetUser || !selectedProjectId) return;
    try {
      inviteUser(user.id, selectedProjectId, targetUser.id, undefined, inviteMsg);
      refresh();
      setInviteSuccess(true);
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteSuccess(false);
        setInviteMsg("");
      }, 1500);
    } catch (err: any) {
      alert(err?.message || "Failed to send invitation");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brass-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-brass-800">
              <Users className="h-3 w-3" /> Academic Network
            </span>
            <span className="text-xs text-ink-400">• {filteredProfiles.length} Researchers Registered</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink">
            Find Researchers & Collaborators
          </h1>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">
            Search verified student researchers, technical specialists, and faculty mentors across participating academic institutions.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm space-y-3">
        <div className="relative">
          <Input
            placeholder="Search by researcher name, department, skill, or research domain..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">All Academic Roles</option>
            <option value="student">Students & Researchers</option>
            <option value="faculty">Faculty & Mentors</option>
          </Select>

          <Select
            value={selectedInstitution}
            onChange={(e) => setSelectedInstitution(e.target.value)}
          >
            <option value="all">All Institutions</option>
            {INSTITUTIONS.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </Select>

          <Select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
          >
            <option value="all">All Primary Skills</option>
            {ALL_SKILLS.map((s: string) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Results Grid */}
      {filteredProfiles.length === 0 ? (
        <EmptyState
          title="No Researchers Found"
          body="No campus profiles matched your current search filters. Try clearing your filters or search terms."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setSelectedRole("all");
                setSelectedInstitution("all");
                setSelectedSkill("all");
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((p) => {
            return (
              <div key={p.id} className="relative group">
                <PersonCard profile={p} />
                {ownedProjects.length > 0 && user?.id !== p.userId && (
                  <div className="absolute top-5 right-5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenInvite(p.userId, p.fullName)}
                      className="text-xs text-navy hover:bg-navy-50"
                      title="Invite to your project"
                    >
                      <Mail className="h-3.5 w-3.5 mr-1" /> Invite
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Collaborator Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={`Invite ${targetUser?.name || "Researcher"} to Project`}
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          {inviteSuccess ? (
            <div className="rounded-lg bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200 text-center">
              Invitation sent successfully! The researcher will receive an in-app notification.
            </div>
          ) : (
            <>
              <div className="text-xs text-ink-500">
                Send an official project invitation to invite this collaborator into your research team room.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-800">Select Project You Own</label>
                <Select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  {ownedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-800">Personalized Invitation Message</label>
                <Input
                  placeholder="e.g. We saw your PyTorch work and would value your expertise on our CNN models."
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Send Project Invitation
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
