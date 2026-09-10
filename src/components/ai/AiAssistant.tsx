import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchAllProfiles, fetchProjects } from "@/lib/supabase-db";
import { recommendProjects, recommendCollaborators } from "@/lib/matching";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import type { Profile, Project } from "@/types";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  ArrowRight,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  projects?: Project[];
  profiles?: Profile[];
  timestamp: Date;
}

export function AiAssistant() {
  const { profile, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cachedProfiles, setCachedProfiles] = useState<Profile[]>([]);
  const [cachedProjects, setCachedProjects] = useState<Project[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && cachedProfiles.length === 0) {
      Promise.all([fetchAllProfiles(), fetchProjects()]).then(([pfs, pjs]) => {
        setCachedProfiles(pfs);
        setCachedProjects(pjs);
      });
    }
  }, [isOpen, cachedProfiles.length]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hello ${
            profile?.fullName ? profile.fullName.split(" ")[0] : "there"
          }! I'm your Synaptra AI Campus Assistant. I can recommend active research projects, match you with peer collaborators, or find faculty advisors based on your skills.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [profile]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const text = queryText || input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    let pfs = cachedProfiles;
    let pjs = cachedProjects;
    if (pfs.length === 0 || pjs.length === 0) {
      const [fetchedPfs, fetchedPjs] = await Promise.all([fetchAllProfiles(), fetchProjects()]);
      pfs = fetchedPfs;
      pjs = fetchedPjs;
      setCachedProfiles(fetchedPfs);
      setCachedProjects(fetchedPjs);
    }

    const q = text.toLowerCase();

    // AI Intent Classification & Retrieval Logic
    setTimeout(() => {
      let replyText = "";
      let matchedProjects: Project[] | undefined;
      let matchedProfiles: Profile[] | undefined;

      if (q.includes("faculty") || q.includes("professor") || q.includes("mentor") || q.includes("advisor")) {
        // Faculty search
        const facultyList = pfs.filter((p) => !!p.designation);
        const filtered = facultyList.filter(
          (f) =>
            f.department.toLowerCase().includes(q) ||
            f.expertise?.some((e) => q.includes(e.toLowerCase())) ||
            f.skills.some((s) => q.includes(s.skill.toLowerCase())) ||
            f.bio?.toLowerCase().includes(q)
        );

        const listToUse = filtered.length > 0 ? filtered : facultyList.slice(0, 3);
        replyText =
          filtered.length > 0
            ? `Found ${filtered.length} faculty member(s) matching your request:`
            : `Here are available faculty advisors across campus departments:`;
        matchedProfiles = listToUse.slice(0, 4);
      } else if (
        q.includes("collaborator") ||
        q.includes("student") ||
        q.includes("partner") ||
        q.includes("peer") ||
        q.includes("team")
      ) {
        // Collaborator recommendation
        if (profile) {
          const recs = recommendCollaborators(profile, pfs, new Set());
          matchedProfiles = recs.map((r) => r.candidate).slice(0, 3);
          replyText = `Based on your profile skills and research interests, here are the top student collaborators on campus:`;
        } else {
          matchedProfiles = pfs.filter((p) => !p.designation && p.userId !== user?.id).slice(0, 3);
          replyText = `Here are active student researchers on campus:`;
        }
      } else if (
        q.includes("project") ||
        q.includes("research") ||
        q.includes("join") ||
        q.includes("recommend") ||
        q.includes("find") ||
        q.includes("python") ||
        q.includes("ai") ||
        q.includes("react")
      ) {
        // Project recommendations
        if (profile) {
          const recs = recommendProjects(profile, pjs, []);
          const relevant = recs.map((r) => r.project);
          matchedProjects = relevant.slice(0, 3);
          replyText = `Here are top active projects matching your skill set and domain interests:`;
        } else {
          matchedProjects = pjs.filter((p) => p.status === "open").slice(0, 3);
          replyText = `Here are featured open projects available right now:`;
        }
      } else {
        // General query fallback
        replyText = `I can help you discover projects, find faculty advisors, or match with student collaborators. Try one of the quick suggestions below or tell me your technical skills!`;
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: replyText,
        projects: matchedProjects,
        profiles: matchedProfiles,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 450);
  };

  const quickPrompts = [
    { label: "🚀 Recommend projects for me", query: "Recommend open projects that match my skills" },
    { label: "👥 Find student collaborators", query: "Find student collaborators with complementary skills" },
    { label: "🎓 Find faculty advisors", query: "Find faculty mentors and research advisors" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-navy px-4 py-3 text-white shadow-xl ring-2 ring-gold/40 transition-all duration-300 hover:scale-105 hover:bg-navy-700 hover:shadow-2xl"
          aria-label="Open Synaptra AI Assistant"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-gold"></span>
          </span>
          <Sparkles className="h-5 w-5 text-gold animate-pulse" />
          <span className="font-serif text-sm font-semibold tracking-wide">Campus AI</span>
        </button>
      )}

      {isOpen && (
        <div className="flex h-[540px] w-[360px] sm:w-[410px] flex-col overflow-hidden rounded-2xl border border-border bg-paper shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-navy px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/20 text-gold">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-white">Synaptra Campus AI</h3>
                <p className="text-[11px] text-white/70">Skill matching & project finder</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-paper-50/50 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {m.sender === "ai" ? (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-gold">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    m.sender === "user"
                      ? "bg-navy text-white rounded-tr-none shadow-sm"
                      : "bg-surface border border-border text-ink rounded-tl-none shadow-xs"
                  }`}
                >
                  <p>{m.text}</p>

                  {/* Project Cards inside AI response */}
                  {m.projects && m.projects.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      {m.projects.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl border border-border bg-paper p-2.5 text-ink transition-colors hover:border-navy"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-serif text-xs font-bold text-navy line-clamp-1">
                              {p.title}
                            </span>
                            <Badge tone="navy" className="text-[9px] px-1 py-0 shrink-0">
                              {p.difficulty}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-[11px] text-ink-500 line-clamp-1">{p.domains.join(" • ") || p.type}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {p.requiredSkills.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="rounded bg-surface-2 px-1.5 py-0.5 text-[9px] text-ink-600"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                          <Link
                            to={`/projects/${p.id}`}
                            onClick={() => setIsOpen(false)}
                            className="mt-2 flex items-center justify-end gap-1 text-[11px] font-semibold text-navy hover:underline"
                          >
                            View Project <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Profile Cards inside AI response */}
                  {m.profiles && m.profiles.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      {m.profiles.map((p) => (
                        <div
                          key={p.userId}
                          className="rounded-xl border border-border bg-paper p-2.5 text-ink transition-colors hover:border-navy"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-serif text-xs font-bold text-ink">
                                {p.fullName}
                              </span>
                              <Badge tone={p.designation ? "brass" : "navy"} className="text-[9px] px-1 py-0">
                                {p.designation ? "Faculty" : "Student"}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-[10px] text-ink-500">{p.department}</p>
                          {p.skills && p.skills.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {p.skills.slice(0, 3).map((s) => (
                                <span
                                  key={s.skill}
                                  className="rounded bg-surface-2 px-1.5 py-0.5 text-[9px] text-ink-600"
                                >
                                  {s.skill}
                                </span>
                              ))}
                            </div>
                          )}
                          <Link
                            to={`/profile/${p.userId}`}
                            onClick={() => setIsOpen(false)}
                            className="mt-1.5 flex items-center justify-end gap-1 text-[11px] font-semibold text-navy hover:underline"
                          >
                            View Profile <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-ink-400 text-xs italic">
                <Sparkles className="h-3.5 w-3.5 animate-spin text-gold" />
                Analyzing campus data & matching skills...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="flex flex-col gap-1 border-t border-border bg-surface-2/40 px-3 py-2">
              <span className="text-[10px] font-medium text-ink-400 uppercase tracking-wider">
                Suggested questions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qp.query)}
                    className="rounded-full border border-border bg-paper px-2.5 py-1 text-[10px] font-medium text-ink-600 hover:border-navy hover:text-navy transition-colors"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-border bg-paper p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about projects, faculty, peers..."
              className="flex-1 rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-xs text-ink placeholder:text-ink-400 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !input.trim()}
              className="rounded-xl px-3 py-2 bg-navy text-white hover:bg-navy-700"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
