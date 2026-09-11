import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProjects,
  fetchMembershipsByUser,
  fetchDiscussions,
  fetchReplies,
  fetchAllProfiles,
  addDiscussion,
  addReply,
} from "@/lib/supabase-db";
import { Button } from "@/components/ui/Button";
import { Card, Badge, EmptyState } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import type { Project, Discussion, DiscussionReply, Profile } from "@/types";
import {
  MessageSquare,
  Send,
  Plus,
  ArrowRight,
  Loader2,
} from "lucide-react";

export function Messages() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [newReplyText, setNewReplyText] = useState("");
  const [newDiscOpen, setNewDiscOpen] = useState(false);
  const [newDiscTitle, setNewDiscTitle] = useState("");
  const [newDiscBody, setNewDiscBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Ref lets loadData read the current selectedProjectId without being a
  // dependency — prevents the re-render cycle where loadData sets
  // selectedProjectId, which recreates loadData, which fires the effect again.
  const selectedProjectIdRef = useRef<string | null>(null);
  selectedProjectIdRef.current = selectedProjectId;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Single query: all projects the user belongs to — replaces N×fetchProjectMembers
      const [allProjs, memberships, profiles] = await Promise.all([
        fetchProjects(),
        fetchMembershipsByUser(user.id),
        fetchAllProfiles(),
      ]);

      const memberProjectIds = new Set(memberships.map((m) => m.projectId));
      const activeProjs = allProjs.filter(
        (p) => p.ownerId === user.id || memberProjectIds.has(p.id)
      );

      setProjects(activeProjs);
      setAllProfiles(profiles);

      // Only auto-select the first project if none is selected yet
      if (activeProjs.length > 0 && !selectedProjectIdRef.current) {
        setSelectedProjectId(activeProjs[0].id);
      }
    } catch (err) {
      console.error("Messages load error:", err);
    } finally {
      setLoading(false);
    }
    // selectedProjectId intentionally excluded — read via ref to avoid loop
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load discussions when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    async function loadDisc() {
      const discs = await fetchDiscussions(selectedProjectId!);
      if (!cancelled) {
        setDiscussions(discs);
        // Set the target discussion — replies are loaded by the
        // selectedDiscussionId effect below (avoids double fetch)
        const currentTargetId =
          selectedDiscussionId && discs.some((d) => d.id === selectedDiscussionId)
            ? selectedDiscussionId
            : discs.length > 0
            ? discs[0].id
            : null;
        setSelectedDiscussionId(currentTargetId);
      }
    }
    loadDisc();
    return () => { cancelled = true; };
  }, [selectedProjectId]);

  // Load replies when selected discussion changes
  useEffect(() => {
    if (!selectedDiscussionId) {
      setReplies([]);
      return;
    }
    let cancelled = false;
    fetchReplies(selectedDiscussionId).then((reps) => {
      if (!cancelled) setReplies(reps);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDiscussionId]);

  if (!user) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-ink-500">You must be signed in to access project messages.</p>
        <Link to="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const activeDiscussion = discussions.find((d) => d.id === selectedDiscussionId) || discussions[0];
  const activeReplies = activeDiscussion
    ? replies.filter((r) => r.discussionId === activeDiscussion.id)
    : [];

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDiscussion || !newReplyText.trim()) return;
    setSending(true);
    try {
      await addReply(user.id, activeDiscussion.id, newReplyText.trim());
      const updatedReplies = await fetchReplies(activeDiscussion.id);
      setReplies(updatedReplies);
      setNewReplyText("");
    } catch (err: any) {
      alert(err?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newDiscTitle.trim() || !newDiscBody.trim()) return;
    try {
      await addDiscussion(user.id, selectedProjectId, newDiscTitle.trim(), newDiscBody.trim());
      const updated = await fetchDiscussions(selectedProjectId);
      setDiscussions(updated);
      if (updated.length > 0) {
        setSelectedDiscussionId(updated[0].id);
        const reps = await fetchReplies(updated[0].id);
        setReplies(reps);
      }
      setNewDiscOpen(false);
      setNewDiscTitle("");
      setNewDiscBody("");
    } catch (err: any) {
      alert(err?.message || "Failed to start discussion");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-navy-800">
              <MessageSquare className="h-3 w-3" /> Team Communications
            </span>
            <span className="text-xs text-ink-400">• Accepted Collaborators Hub</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink">
            Project Messages & Collaboration
          </h1>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">
            Coordinate milestones, discuss implementation details, and collaborate directly with accepted team members and faculty mentors.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No Active Collaborative Workspaces"
          body="You will gain instant access to project team messaging once you create a project or your join request is accepted."
          action={
            <div className="flex justify-center gap-3">
              <Link to="/projects">
                <Button variant="outline">Browse Projects</Button>
              </Link>
              <Link to="/projects/new">
                <Button>Create Project</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Project List Sidebar */}
          <div className="space-y-4">
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-ink-500">
              Your Active Projects ({projects.length})
            </h3>
            <div className="space-y-2">
              {projects.map((proj) => {
                const isSelected = proj.id === selectedProjectId;
                const isOwner = proj.ownerId === user.id;

                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setSelectedProjectId(proj.id);
                      setSelectedDiscussionId(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-navy bg-navy text-white shadow-sm"
                        : "border-ink-100 bg-white hover:border-ink-200 text-ink"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-serif font-bold text-xs truncate">{proj.title}</h4>
                      <span
                        className={`text-[9px] uppercase tracking-wider font-semibold rounded px-1.5 py-0.2 ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : isOwner
                            ? "bg-brass-50 text-brass-800"
                            : "bg-navy-50 text-navy-800"
                        }`}
                      >
                        {isOwner ? "Owner" : "Member"}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] line-clamp-1 mt-1 ${
                        isSelected ? "text-white/80" : "text-ink-500"
                      }`}
                    >
                      {proj.shortDescription}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Discussion & Chat Pane */}
          <div className="lg:col-span-3 space-y-4">
            {selectedProject && (
              <Card className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-xl font-bold text-ink">{selectedProject.title}</h2>
                      <Badge tone="navy">{selectedProject.domains[0] || "Research"}</Badge>
                    </div>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Collaborative discussion channel for team members
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setNewDiscOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> New Thread
                    </Button>
                    <Link to={`/projects/${selectedProject.id}/room`}>
                      <Button size="sm">
                        Full Project Room <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Discussions List / Active Discussion */}
                {discussions.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <MessageSquare className="h-8 w-8 text-ink-300 mx-auto" />
                    <h3 className="font-serif font-bold text-ink text-base">No Discussion Threads Yet</h3>
                    <p className="text-xs text-ink-500 max-w-sm mx-auto">
                      Start the conversation to organize tasks, coordinate schedules, or share research updates with the team.
                    </p>
                    <Button size="sm" onClick={() => setNewDiscOpen(true)}>
                      Start First Discussion Thread
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Thread list */}
                    <div className="space-y-2 border-r border-ink-100 pr-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 block mb-1">
                        Topic Threads
                      </span>
                      {discussions.map((d) => {
                        const author = allProfiles.find((p) => p.userId === d.createdBy);
                        const isSelected = d.id === (activeDiscussion?.id || "");

                        return (
                          <button
                            key={d.id}
                            onClick={() => setSelectedDiscussionId(d.id)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              isSelected
                                ? "border-navy bg-navy-50 text-navy font-semibold"
                                : "border-ink-100 bg-paper-50/50 hover:bg-paper-100 text-ink-700"
                            }`}
                          >
                            <h5 className="text-xs font-bold truncate">{d.title}</h5>
                            <p className="text-[10px] text-ink-400 mt-0.5">by {author?.fullName || "Member"}</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Thread Message Stream */}
                    <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                      {activeDiscussion && (
                        <div className="space-y-4">
                          {/* Main Post */}
                          <div className="rounded-xl border border-navy-100 bg-navy-50/30 p-4 space-y-2">
                            <div className="flex justify-between items-start">
                              <h3 className="font-serif font-bold text-ink text-base">
                                {activeDiscussion.title}
                              </h3>
                              <span className="text-[10px] text-ink-400">
                                {new Date(activeDiscussion.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-ink-700 leading-relaxed whitespace-pre-line">
                              {activeDiscussion.body}
                            </p>
                          </div>

                          {/* Replies Stream */}
                          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                            {activeReplies.length === 0 ? (
                              <p className="text-xs text-ink-400 italic py-2">No replies yet. Post a response below.</p>
                            ) : (
                              activeReplies.map((r) => {
                                const author = allProfiles.find((p) => p.userId === r.userId);
                                const isMe = r.userId === user.id;

                                return (
                                  <div
                                    key={r.id}
                                    className={`flex gap-3 p-3 rounded-xl border ${
                                      isMe
                                        ? "border-navy-200 bg-navy-50/50 ml-6"
                                        : "border-ink-100 bg-paper-50 mr-6"
                                    }`}
                                  >
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-white text-[11px] font-bold">
                                      {author?.fullName?.charAt(0) || "U"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-xs text-ink">
                                          {author?.fullName || "Collaborator"}
                                        </span>
                                        <span className="text-[10px] text-ink-400">
                                          {new Date(r.createdAt).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-ink-700 mt-1 leading-relaxed">
                                        {r.body}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Reply Input Form */}
                          <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-ink-100">
                            <Input
                              placeholder="Write a reply to the team..."
                              value={newReplyText}
                              onChange={(e) => setNewReplyText(e.target.value)}
                              className="text-xs flex-1"
                            />
                            <Button type="submit" size="sm" loading={sending} disabled={!newReplyText.trim()}>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* New Discussion Modal */}
      <Modal open={newDiscOpen} onClose={() => setNewDiscOpen(false)} title="New Team Discussion Thread">
        <form onSubmit={handleCreateDiscussion} className="space-y-4">
          <Field label="Topic Title">
            <Input
              required
              placeholder="e.g. Architecture review, dataset collection plan"
              value={newDiscTitle}
              onChange={(e) => setNewDiscTitle(e.target.value)}
            />
          </Field>
          <Field label="Discussion Scope & Details">
            <Textarea
              required
              rows={4}
              placeholder="Detail your question, agenda, or project update..."
              value={newDiscBody}
              onChange={(e) => setNewDiscBody(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setNewDiscOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Post Thread</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
