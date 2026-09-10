import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchAllProfiles, fetchProjects, inviteUser } from "@/lib/supabase-db";
import { PersonCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { INSTITUTIONS, ALL_SKILLS } from "@/lib/taxonomies";
import type { Profile, Project } from "@/types";
import { Search, Users, Mail, Loader2 } from "lucide-react";

export function Collaborators() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedInstitution, setSelectedInstitution] = useState<string>("all");
  const [selectedSkill, setSelectedSkill] = useState<string>("all");

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [signInPrompt, setSignInPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [profs, projs] = await Promise.all([
        fetchAllProfiles(),
        user ? fetchProjects() : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setProfiles(profs);
      setOwnedProjects(projs.filter((p) => p.ownerId === user?.id && p.status === "open"));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
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
      if (selectedRole === "faculty" && !p.designation) return false;
      if (selectedRole === "student" && p.designation) return false;
      if (selectedInstitution !== "all" && p.institution !== selectedInstitution) return false;
      if (selectedSkill !== "all" && !p.skills.some((s) => s.skill === selectedSkill)) return false;
      return true;
    });
  }, [profiles, query, selectedRole, selectedInstitution, selectedSkill]);

  const handleOpenInvite = (userId: string, name: string) => {
    if (!user) { setSignInPrompt(true); return; }
    if (ownedProjects.length === 0) { setInviteError("You need an active project you own to send invitations."); setInviteModalOpen(true); return; }
    setTargetUser({ id: userId, name });
    setSelectedProjectId(ownedProjects[0]?.id || "");
    setInviteModalOpen(true);
    setInviteSuccess(false);
    setInviteError(null);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetUser || !selectedProjectId) return;
    setInviteError(null);
    try {
      await inviteUser(user.id, selectedProjectId, targetUser.id, undefined, inviteMsg);
      setInviteSuccess(true);
      setTimeout(() => { setInviteModalOpen(false); setInviteSuccess(false); setInviteMsg(""); }, 1500);
    } catch (err: any) {
      setInviteError(err?.message || "Failed to send invitation");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brass-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-brass-800">
              <Users className="h-3 w-3" /> Academic Network
            </span>
            <span className="text-xs text-ink-400">• {filteredProfiles.length} Researchers Registered</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink">Find Researchers & Collaborators</h1>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">
            Search verified student researchers, technical specialists, and faculty mentors across participating academic institutions.
          </p>
        </div>
      </div>

      {/* Filters */}
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
          <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            <option value="all">All Academic Roles</option>
            <option value="student">Students & Researchers</option>
            <option value="faculty">Faculty & Mentors</option>
          </Select>
          <Select value={selectedInstitution} onChange={(e) => setSelectedInstitution(e.target.value)}>
            <option value="all">All Institutions</option>
            {INSTITUTIONS.map((inst) => <option key={inst} value={inst}>{inst}</option>)}
          </Select>
          <Select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}>
            <option value="all">All Primary Skills</option>
            {ALL_SKILLS.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy" /></div>
      ) : filteredProfiles.length === 0 ? (
        <EmptyState
          title="No Researchers Found"
          body="No campus profiles matched your current search filters."
          action={
            <Button variant="outline" onClick={() => { setQuery(""); setSelectedRole("all"); setSelectedInstitution("all"); setSelectedSkill("all"); }}>
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((p) => (
            <div key={p.id} className="relative group">
              <PersonCard profile={p} />
              {ownedProjects.length > 0 && user?.id !== p.userId && (
                <div className="absolute top-5 right-5">
                  <Button size="sm" variant="ghost" onClick={() => handleOpenInvite(p.userId, p.fullName)}
                    className="text-xs text-navy hover:bg-navy-50" title="Invite to your project">
                    <Mail className="h-3.5 w-3.5 mr-1" /> Invite
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={inviteModalOpen} onClose={() => { setInviteModalOpen(false); setInviteError(null); }} title={`Invite ${targetUser?.name || "Researcher"} to Project`}>
        <form onSubmit={handleSendInvite} className="space-y-4">
          {inviteSuccess ? (
            <div className="rounded-lg bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200 text-center">
              Invitation sent successfully! The researcher will receive an in-app notification.
            </div>
          ) : (
            <>
              {inviteError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">{inviteError}</div>
              )}
              {ownedProjects.length === 0 ? (
                <p className="text-xs text-ink-500">You need an open project that you own before sending invitations. <a href="/projects/new" className="text-navy underline">Create one →</a></p>
              ) : (
                <>
                  <div className="text-xs text-ink-500">Send an official project invitation to invite this collaborator into your research team room.</div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-800">Select Project You Own</label>
                    <Select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                      {ownedProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-800">Personalized Invitation Message</label>
                    <Input placeholder="e.g. We saw your PyTorch work and would value your expertise." value={inviteMsg} onChange={(e) => setInviteMsg(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" type="button" onClick={() => { setInviteModalOpen(false); setInviteError(null); }}>Cancel</Button>
                    <Button type="submit">Send Project Invitation</Button>
                  </div>
                </>
              )}
            </>
          )}
        </form>
      </Modal>

      {/* Sign-in prompt modal for unauthenticated invite attempt */}
      <Modal open={signInPrompt} onClose={() => setSignInPrompt(false)} title="Sign In Required">
        <div className="space-y-4 text-xs text-ink-600">
          <p>You need to be signed in to invite collaborators to your projects.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSignInPrompt(false)}>Cancel</Button>
            <a href="/login"><Button>Sign In</Button></a>
          </div>
        </div>
      </Modal>
    </div>
  );
}
