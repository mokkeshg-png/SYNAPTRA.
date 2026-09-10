import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchAllProfiles, fetchProjects } from "@/lib/supabase-db";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import type { Profile, Project } from "@/types";
import {
  processCampusQuery,
  type AiConversationContext,
} from "./campusAiEngine";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  ArrowRight,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  students?: Profile[];
  faculty?: Profile[];
  projects?: Project[];
  timestamp: Date;
}

function formatUid(p: Profile) {
  const prefix = p.designation ? "FAC" : "STU";
  return `${prefix}-${p.userId.substring(0, 6).toUpperCase()}`;
}

export function AiAssistant() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationContext, setConversationContext] = useState<AiConversationContext>({});
  const [cachedProfiles, setCachedProfiles] = useState<Profile[]>([]);
  const [cachedProjects, setCachedProjects] = useState<Project[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load campus data when chat opens
  useEffect(() => {
    if (isOpen && (cachedProfiles.length === 0 || cachedProjects.length === 0)) {
      Promise.all([fetchAllProfiles(), fetchProjects()])
        .then(([pfs, pjs]) => {
          setCachedProfiles(pfs);
          setCachedProjects(pjs);
          setError(null);
        })
        .catch((err) => {
          console.error("Campus AI data load error:", err);
          setError("Sorry, I couldn't access the campus information right now.");
        });
    }
  }, [isOpen, cachedProfiles.length, cachedProjects.length]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hello ${
            profile?.fullName ? profile.fullName.split(" ")[0] : "there"
          }! I'm your Synaptra AI Campus Assistant. I can search student collaborators by technical skill, find faculty mentors, or recommend active campus research projects based on your interests.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [profile, messages.length]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  const handleClearConversation = () => {
    setConversationContext({});
    setMessages([
      {
        id: Date.now().toString(),
        sender: "ai",
        text: `Conversation reset. How can I assist you with campus research, skills, or collaborators today?`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSend = async (queryText?: string) => {
    const text = (queryText || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);
    setError(null);

    try {
      let pfs = cachedProfiles;
      let pjs = cachedProjects;

      if (pfs.length === 0 || pjs.length === 0) {
        const [fetchedPfs, fetchedPjs] = await Promise.all([fetchAllProfiles(), fetchProjects()]);
        pfs = fetchedPfs;
        pjs = fetchedPjs;
        setCachedProfiles(fetchedPfs);
        setCachedProjects(fetchedPjs);
      }

      // Process query using the intelligent campus engine
      setTimeout(() => {
        try {
          const result = processCampusQuery(text, pfs, pjs, profile ?? null, conversationContext);
          setConversationContext(result.contextUpdate);

          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: result.text,
            students: result.students,
            faculty: result.faculty,
            projects: result.projects,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, aiMsg]);
        } catch (procErr) {
          console.error("Query processing error:", procErr);
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              sender: "ai",
              text: "Sorry, I couldn't process that request right now. Please try again.",
              timestamp: new Date(),
            },
          ]);
        } finally {
          setLoading(false);
        }
      }, 350);
    } catch (fetchErr) {
      console.error("Data fetch error in AI assistant:", fetchErr);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Sorry, I couldn't access the campus information right now. Please check your connection.",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const quickPrompts = [
    { label: "🔍 Frontend students", query: "Show me students who know frontend development" },
    { label: "🐍 Python + AI peers", query: "I need a student who knows Python and AI" },
    { label: "🚀 Backend projects", query: "Find projects that need backend developers" },
    { label: "🎓 AI faculty mentors", query: "Find faculty who have AI expertise" },
    { label: "💡 Skills on campus", query: "What skills are available on this campus?" },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-navy px-4 py-3 text-white shadow-xl ring-2 ring-gold/40 transition-all duration-300 hover:scale-105 hover:bg-navy-700 hover:shadow-2xl"
          aria-label="Open Synaptra AI Campus Assistant"
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
        <div className="flex h-[580px] w-[360px] sm:w-[440px] flex-col overflow-hidden rounded-2xl border border-border bg-paper shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-navy px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/20 text-gold shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-white tracking-wide">
                  Synaptra Campus AI
                </h3>
                <p className="text-[11px] text-white/70">Skill matching & people assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearConversation}
                title="Reset conversation"
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Reset conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-paper-50/60 text-xs">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {m.sender === "ai" ? (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-gold shadow-xs">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink shadow-xs">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    m.sender === "user"
                      ? "bg-navy text-white rounded-tr-none shadow-sm"
                      : "bg-surface border border-border text-ink rounded-tl-none shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Student Result Cards */}
                  {m.students && m.students.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {m.students.map((s) => (
                        <div
                          key={s.userId}
                          className="rounded-xl border border-border bg-paper p-3 text-ink transition-all hover:border-navy hover:shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-white font-serif font-bold text-xs">
                                {s.photoUrl ? (
                                  <img
                                    src={s.photoUrl}
                                    alt={s.fullName}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  s.fullName.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-serif text-xs font-bold text-ink truncate">
                                  {s.fullName}
                                </h4>
                                <span className="font-mono text-[10px] text-ink-400">
                                  {formatUid(s)}
                                </span>
                              </div>
                            </div>
                            <Badge tone="navy" className="text-[9px] px-1.5 py-0 shrink-0">
                              Year {s.academicYear ?? "—"}
                            </Badge>
                          </div>

                          <p className="mt-1.5 text-[11px] text-ink-600 line-clamp-1">
                            {s.department}
                          </p>

                          {s.skills && s.skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {s.skills.slice(0, 4).map((sk) => (
                                <span
                                  key={sk.skill}
                                  className="rounded bg-surface-2 px-1.5 py-0.5 text-[9px] font-medium text-ink-700"
                                >
                                  {sk.skill}
                                </span>
                              ))}
                              {s.skills.length > 4 && (
                                <span className="text-[9px] text-ink-400 self-center">
                                  +{s.skills.length - 4}
                                </span>
                              )}
                            </div>
                          )}

                          {s.pastProjects && s.pastProjects.length > 0 && (
                            <p className="mt-1.5 text-[10px] text-ink-500 italic line-clamp-1">
                              Project: {s.pastProjects[0].title}
                            </p>
                          )}

                          <div className="mt-2.5 flex justify-end border-t border-ink-50 pt-1.5">
                            <Link
                              to={`/profile/${s.userId}`}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy hover:underline"
                            >
                              View Profile <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Faculty Result Cards */}
                  {m.faculty && m.faculty.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {m.faculty.map((f) => (
                        <div
                          key={f.userId}
                          className="rounded-xl border border-border bg-paper p-3 text-ink transition-all hover:border-brass hover:shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass text-white font-serif font-bold text-xs">
                                {f.photoUrl ? (
                                  <img
                                    src={f.photoUrl}
                                    alt={f.fullName}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  f.fullName.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-serif text-xs font-bold text-ink truncate">
                                  {f.fullName}
                                </h4>
                                <span className="font-mono text-[10px] text-ink-400">
                                  {formatUid(f)}
                                </span>
                              </div>
                            </div>
                            <Badge tone="brass" className="text-[9px] px-1.5 py-0 shrink-0">
                              Faculty
                            </Badge>
                          </div>

                          <p className="mt-1 text-[11px] font-medium text-ink-700">
                            {f.designation} • {f.department}
                          </p>

                          {f.expertise && f.expertise.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {f.expertise.slice(0, 3).map((exp) => (
                                <Badge key={exp} tone="brass" className="text-[9px] px-1 py-0">
                                  {exp}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="mt-2.5 flex items-center justify-between border-t border-ink-50 pt-1.5">
                            <span className="text-[10px] text-emerald-700 font-medium">
                              {f.openToMentoring ? "Open to Mentor ✓" : "Advisory"}
                            </span>
                            <Link
                              to={`/profile/${f.userId}`}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy hover:underline"
                            >
                              View Profile <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Project Result Cards */}
                  {m.projects && m.projects.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {m.projects.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl border border-border bg-paper p-3 text-ink transition-all hover:border-navy hover:shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="font-serif text-xs font-bold text-navy line-clamp-1">
                              {p.title}
                            </h4>
                            <Badge tone="navy" className="text-[9px] px-1.5 py-0 shrink-0 capitalize">
                              {p.difficulty}
                            </Badge>
                          </div>

                          <p className="mt-1 text-[11px] text-ink-500 line-clamp-2 leading-relaxed">
                            {p.shortDescription || p.domains.join(" • ")}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.requiredSkills.slice(0, 4).map((sk) => (
                              <span
                                key={sk}
                                className="rounded bg-surface-2 px-1.5 py-0.5 text-[9px] font-medium text-ink-700"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>

                          {p.roles && p.roles.length > 0 && (
                            <p className="mt-1.5 text-[10px] text-ink-500">
                              Open Roles: {p.roles.map((r) => r.name).slice(0, 2).join(", ")}
                            </p>
                          )}

                          <div className="mt-2.5 flex items-center justify-between border-t border-ink-50 pt-1.5">
                            <span className="text-[10px] text-ink-400 capitalize">
                              Status: {p.status}
                            </span>
                            <Link
                              to={`/projects/${p.id}`}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy hover:underline"
                            >
                              View Project <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 rounded-xl bg-surface p-2.5 text-xs text-ink-500 italic shadow-xs">
                <Sparkles className="h-3.5 w-3.5 animate-spin text-gold" />
                Thinking & analyzing campus data...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 3 && (
            <div className="flex flex-col gap-1 border-t border-border bg-surface-2/40 px-3 py-2">
              <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">
                Quick Prompts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qp.query)}
                    className="rounded-full border border-border bg-paper px-2.5 py-1 text-[10px] font-medium text-ink-700 hover:border-navy hover:text-navy transition-colors"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
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
              placeholder="Ask about students, skills, projects, faculty..."
              disabled={loading}
              className="flex-1 rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-xs text-ink placeholder:text-ink-400 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy disabled:opacity-50"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !input.trim()}
              className="rounded-xl px-3 py-2 bg-navy text-white hover:bg-navy-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
