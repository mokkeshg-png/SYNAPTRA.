/**
 * analyze-skill-score — Supabase Edge Function
 *
 * PURPOSE:
 *   Server-side handler for the AI Student Skill Intelligence & Score Engine.
 *   Loads a student's complete profile evidence from the database, runs the
 *   skill scoring algorithm, validates the result, persists it to
 *   student_skill_scores, and returns the analysis to the caller.
 *
 * ISOLATION:
 *   This function is COMPLETELY SEPARATE from the existing analyze-project-fit
 *   function and the AI Campus Chatbot. It shares no logic, prompts, state,
 *   or database writes with those systems.
 *
 * SECURITY:
 *   - Requires a valid authenticated session (Supabase Auth JWT).
 *   - Uses the admin client ONLY after verifying the caller's identity.
 *   - No API keys, GitHub tokens, or PII are returned in the response.
 *   - Score is validated: 0 ≤ overall_score ≤ 100 before persistence.
 *   - Only reads and writes rows belonging to the authenticated user.
 *
 * REQUEST:  POST /functions/v1/analyze-skill-score
 *   Body: {} (empty — all data is loaded from the authenticated user's profile)
 *   Optional body: { "github_public_repos": number }
 *     Pass this if the frontend has already fetched the live GitHub repo count.
 *
 * RESPONSE: { success: true, analysis: SkillScoreRecord }
 *   or       { error: string }
 *
 * ENGINE:   skill-engine-v1 (deterministic, no LLM calls)
 */

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

// ── Constants ──────────────────────────────────────────────────────────────

const ENGINE_VERSION = "skill-engine-v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Helpers ────────────────────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isObject(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function clamp(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)));
}

// ── Scoring logic (mirrors src/lib/skillScoreEngine.ts — server copy) ──────
//
// The Edge Function cannot import from src/ (Vite project), so the scoring
// logic is self-contained here. It is the same algorithm as the client-side
// version and must be kept in sync with SKILL_ENGINE_VERSION.

type Proficiency = "beginner" | "intermediate" | "advanced";

const PROFICIENCY_WEIGHT: Record<Proficiency, number> = {
  beginner: 0.5,
  intermediate: 0.75,
  advanced: 1.0,
};

type EvidenceStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "UNVERIFIED"
  | "INSUFFICIENT_EVIDENCE";

const STATUS_FLOOR: Record<EvidenceStatus, number> = {
  SUPPORTED: 70,
  PARTIALLY_SUPPORTED: 40,
  UNVERIFIED: 10,
  INSUFFICIENT_EVIDENCE: 0,
};

function textContains(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function recencyMult(year?: number): number {
  if (!year) return 0.8;
  const age = new Date().getFullYear() - year;
  if (age <= 2) return 1.0;
  if (age <= 4) return 0.85;
  if (age <= 6) return 0.7;
  return 0.55;
}

interface SkillEvidenceItem {
  skill: string;
  claimedLevel: Proficiency;
  confidenceScore: number;
  status: EvidenceStatus;
  supportingEvidence: string[];
  gapNote?: string;
}

function analyzeSkillEvidence(
  skillName: string,
  proficiency: Proficiency,
  pastProjects: any[],
  internships: any[],
  certifications: any[],
  publications: any[],
  interests: string[],
  githubConnected: boolean,
  githubUsername?: string,
  resumeUrl?: string,
  githubPublicRepos?: number
): SkillEvidenceItem {
  const supporting: string[] = [];

  const relProjects = pastProjects.filter((p: any) =>
    textContains(`${p.title ?? ""} ${p.description ?? ""}`, skillName)
  );
  if (relProjects.length > 0) {
    supporting.push(
      `${relProjects.length} past project${relProjects.length > 1 ? "s" : ""} reference this skill`
    );
  }

  const relInternships = internships.filter((i: any) =>
    textContains(`${i.role ?? ""} ${i.description ?? ""} ${i.organization ?? ""}`, skillName)
  );
  if (relInternships.length > 0) {
    supporting.push(`${relInternships.length} internship record${relInternships.length > 1 ? "s" : ""} mention this skill`);
  }

  // GitHub connectivity + live repo count
  if (githubConnected && githubUsername) {
    const repoNote = githubPublicRepos !== undefined && githubPublicRepos > 0
      ? `, ${githubPublicRepos} public repo${githubPublicRepos !== 1 ? "s" : ""}`
      : "";
    supporting.push(`GitHub profile linked (@${githubUsername}${repoNote})`);
  } else if (githubUsername) {
    supporting.push(`GitHub username on file (@${githubUsername})`);
  }

  // Resume linked
  if (resumeUrl) {
    supporting.push("Academic resume linked");
  }

  const relCerts = certifications.filter((c: any) =>
    textContains(`${c.name ?? ""} ${c.issuer ?? ""}`, skillName)
  );
  if (relCerts.length > 0) {
    supporting.push(`Certification: "${relCerts[0].name}"`);
  }

  const relPubs = publications.filter((p: any) =>
    textContains(`${p.title ?? ""} ${p.venue ?? ""}`, skillName)
  );
  if (relPubs.length > 0) {
    supporting.push(`${relPubs.length} academic publication${relPubs.length > 1 ? "s" : ""} related to this area`);
  }

  const relInterests = interests.filter(
    (i) => textContains(i, skillName) || textContains(skillName, i)
  );
  if (relInterests.length > 0) {
    supporting.push(`Listed research interest: "${relInterests[0]}"`);
  }

  // Evidence source count — resumeUrl is soft corroborator, repo count
  // doubles GitHub's weight when confirmed active (≥5 repos)
  const hasGithub = githubConnected || Boolean(githubUsername);
  const hasResume = Boolean(resumeUrl);
  const githubWeight = hasGithub && githubPublicRepos !== undefined && githubPublicRepos >= 5 ? 2 : hasGithub ? 1 : 0;

  const srcCount =
    (relProjects.length > 0 ? 1 : 0) +
    (relInternships.length > 0 ? 1 : 0) +
    githubWeight +
    (relCerts.length > 0 ? 1 : 0) +
    (relPubs.length > 0 ? 1 : 0) +
    (relInterests.length > 0 ? 1 : 0) +
    (hasResume ? 1 : 0);

  let status: EvidenceStatus;
  if (srcCount >= 2) {
    status = "SUPPORTED";
  } else if (srcCount === 1) {
    if (relProjects.length > 0 || relInternships.length > 0 || relCerts.length > 0) {
      status = "PARTIALLY_SUPPORTED";
    } else {
      status = "INSUFFICIENT_EVIDENCE";
    }
  } else {
    status = "UNVERIFIED";
  }

  const profBonus = proficiency === "advanced" ? 8 : proficiency === "intermediate" ? 4 : 0;

  const repoConfidenceBonus =
    githubPublicRepos === undefined ? 0 :
    githubPublicRepos >= 20 ? 6 :
    githubPublicRepos >= 10 ? 4 :
    githubPublicRepos >= 5  ? 2 : 1;

  let raw =
    STATUS_FLOOR[status] +
    relProjects.length * 10 +
    relInternships.length * 7 +
    (hasGithub ? 5 : 0) +
    repoConfidenceBonus +
    (hasResume ? 3 : 0) +
    relCerts.length * 8 +
    relPubs.length * 6 +
    relInterests.length * 3 +
    profBonus;

  if (proficiency === "advanced" && status === "UNVERIFIED") raw = Math.min(raw, 25);

  const confidenceScore = clamp(raw);

  let gapNote: string | undefined;
  if (status === "UNVERIFIED") {
    gapNote = `Limited evidence supports the claimed ${skillName} skill. Adding a related project or certification would improve confidence.`;
  } else if (status === "INSUFFICIENT_EVIDENCE") {
    const onlySignal = hasGithub ? "GitHub connectivity" : hasResume ? "A resume link" : "Limited evidence";
    gapNote = `${onlySignal} is the only evidence signal for ${skillName}. A project or certification would strengthen this claim.`;
  } else if (status === "PARTIALLY_SUPPORTED" && proficiency === "advanced") {
    gapNote = `The claimed "advanced" level for ${skillName} is only partially supported. Additional evidence would improve this.`;
  }

  return { skill: skillName, claimedLevel: proficiency, confidenceScore, status, supportingEvidence: supporting, gapNote };
}

interface Breakdown {
  skillEvidence: number;
  projectEvidence: number;
  githubEvidence: number;
  experienceEvidence: number;
  certificationEvidence: number;
  consistencyScore: number;
  publicationBonus: number;
}

function calcSkillEvidenceScore(skills: any[], skillItems: SkillEvidenceItem[]): number {
  if (skillItems.length === 0) return 0;
  const contribs = skillItems.map((s) => (s.confidenceScore / 100) * PROFICIENCY_WEIGHT[s.claimedLevel]);
  const avg = contribs.reduce((a, b) => a + b, 0) / contribs.length;
  const wellSupported = skillItems.filter((s) => s.status === "SUPPORTED" || s.status === "PARTIALLY_SUPPORTED").length;
  const breadth = Math.min(0.2, (wellSupported / 10) * 0.2);
  return clamp((avg + breadth) * 20);
}

function calcProjectScore(pastProjects: any[], skillNames: string[]): number {
  if (pastProjects.length === 0) return 0;
  let total = 0;
  for (const p of pastProjects) {
    const txt = `${p.title ?? ""} ${p.description ?? ""}`.toLowerCase();
    let pts = 4;
    const matches = skillNames.filter((s) => txt.includes(s.toLowerCase())).length;
    pts += Math.min(4, matches);
    if ((p.description?.trim()?.length ?? 0) >= 30) pts += 1;
    pts *= recencyMult(p.year);
    total += pts;
  }
  return clamp(total, 0, 25);
}

function calcGithubScore(
  githubConnected: boolean,
  githubUsername?: string,
  resumeUrl?: string,
  linkedinUrl?: string,
  portfolioUrl?: string,
  publicRepos?: number
): number {
  let pts = 0;
  // Mutually exclusive connectivity tiers
  if (githubConnected && githubUsername) {
    pts += 16; // Fully connected via OAuth + username confirmed
  } else if (githubUsername) {
    pts += 8;  // Username entered but not OAuth-verified
  }
  if (resumeUrl)    pts += 2;
  if (linkedinUrl)  pts += 2;
  if (portfolioUrl) pts += 2;
  if (publicRepos && publicRepos > 0) {
    if (publicRepos >= 20) pts += 4;
    else if (publicRepos >= 10) pts += 3;
    else if (publicRepos >= 5) pts += 2;
    else pts += 1;
  }
  return clamp(pts, 0, 20);
}

function calcExperienceScore(internships: any[], skillNames: string[]): number {
  if (internships.length === 0) return 0;
  let total = 0;
  for (const i of internships) {
    const txt = `${i.role ?? ""} ${i.description ?? ""} ${i.organization ?? ""}`.toLowerCase();
    let pts = 4;
    const matches = skillNames.filter((s) => txt.includes(s.toLowerCase())).length;
    pts += Math.min(3, matches);
    if ((i.description?.trim()?.length ?? 0) >= 30) pts += 1;
    total += pts;
  }
  return clamp(total, 0, 15);
}

function calcCertScore(certifications: any[], skillNames: string[]): number {
  if (certifications.length === 0) return 0;
  let total = 0;
  for (const c of certifications) {
    const txt = `${c.name ?? ""} ${c.issuer ?? ""}`.toLowerCase();
    let pts = 3;
    if (skillNames.some((s) => txt.includes(s.toLowerCase()))) pts += 1;
    pts *= recencyMult(c.year);
    total += pts;
  }
  return clamp(total, 0, 10);
}

function calcConsistencyScore(skillItems: SkillEvidenceItem[]): number {
  const consistent = skillItems.filter(
    (s) => s.status === "SUPPORTED" || s.supportingEvidence.length >= 2
  ).length;
  return clamp(consistent * 1.25, 0, 5);
}

function calcPubBonus(publications: any[]): number {
  const n = publications.length;
  if (n === 0) return 0;
  if (n === 1) return 2;
  if (n === 2) return 3;
  return 5;
}

function buildStrengths(
  pastProjects: any[],
  internships: any[],
  certifications: any[],
  publications: any[],
  githubConnected: boolean,
  resumeUrl: string | undefined,
  skillItems: SkillEvidenceItem[],
  breakdown: Breakdown
): string[] {
  const out: string[] = [];
  const supported = skillItems.filter((s) => s.status === "SUPPORTED").map((s) => s.skill);
  if (supported.length >= 2) out.push(`Well-evidenced skills: ${supported.slice(0, 3).join(", ")}.`);
  if (pastProjects.length >= 2) out.push(`${pastProjects.length} past projects provide strong applied evidence.`);
  else if (pastProjects.length === 1) out.push(`Past project "${pastProjects[0].title}" supports claimed skills.`);
  if (githubConnected && breakdown.githubEvidence >= 14) out.push("GitHub profile connected and verified.");
  if (resumeUrl) out.push("Academic resume linked, providing an additional external evidence signal.");
  if (internships.length >= 2) out.push(`${internships.length} internship/lab records demonstrate professional exposure.`);
  else if (internships.length === 1) out.push(`Internship at ${internships[0].organization} provides real-world context.`);
  if (certifications.length >= 2) out.push(`${certifications.length} certifications externally validate technical knowledge.`);
  else if (certifications.length === 1) out.push(`Certification "${certifications[0].name}" provides external validation.`);
  if (publications.length > 0) out.push(`${publications.length} academic publication${publications.length > 1 ? "s" : ""} demonstrate research output.`);
  if (breakdown.consistencyScore >= 4) out.push("Strong consistency across evidence sources.");
  return out.slice(0, 6);
}

function buildImprovements(
  pastProjects: any[],
  internships: any[],
  certifications: any[],
  githubConnected: boolean,
  githubUsername: string | undefined,
  resumeUrl: string | undefined,
  skillItems: SkillEvidenceItem[]
): string[] {
  const out: string[] = [];
  const unverified = skillItems.filter((s) => s.status === "UNVERIFIED").map((s) => s.skill);
  if (unverified.length > 0) out.push(`Add evidence for: ${unverified.slice(0, 3).join(", ")}.`);
  if (pastProjects.length === 0) out.push("Add at least one past project with a description to significantly improve your score.");
  if (!githubConnected && !githubUsername) out.push("Linking your GitHub profile provides external credibility.");
  if (!resumeUrl) out.push("Adding a resume link provides an additional external evidence signal for all your claimed skills.");
  if (certifications.length === 0) out.push("Add a relevant certification to provide external validation.");
  if (internships.length === 0) out.push("Add internship or laboratory experience to demonstrate applied practice.");
  const weakAdv = skillItems.filter((s) => s.claimedLevel === "advanced" && (s.status === "UNVERIFIED" || s.status === "INSUFFICIENT_EVIDENCE"));
  if (weakAdv.length > 0) out.push(`The "advanced" claim for ${weakAdv.map((s) => s.skill).join(", ")} currently lacks sufficient supporting evidence.`);
  return out.slice(0, 5);
}

function buildSummary(
  fullName: string,
  overallScore: number,
  skillItems: SkillEvidenceItem[],
  pastProjects: any[],
  githubConnected: boolean,
  certifications: any[]
): string {
  const first = (fullName || "This student").split(" ")[0];
  const label = overallScore >= 80 ? "strong" : overallScore >= 60 ? "solid" : overallScore >= 40 ? "developing" : "early-stage";
  const supported = skillItems.filter((s) => s.status === "SUPPORTED").length;
  const parts = [
    `${first}'s profile demonstrates a ${label} evidence foundation with an overall score of ${overallScore}/100.`,
    skillItems.length > 0
      ? `${supported} of ${skillItems.length} claimed skill${skillItems.length !== 1 ? "s are" : " is"} supported by corroborating evidence.`
      : null,
    pastProjects.length > 0
      ? `${pastProjects.length} past project${pastProjects.length !== 1 ? "s" : ""} contribute to the applied evidence base.`
      : null,
    githubConnected ? "A connected GitHub profile adds external credibility." : null,
    certifications.length > 0
      ? `${certifications.length} certification${certifications.length !== 1 ? "s" : ""} provide external validation.`
      : null,
    overallScore < 50
      ? "Adding projects, linking GitHub, and including certifications will meaningfully improve this score."
      : null,
    "This AI Skill Score is an evidence-based estimate using your profile data. It is not a certified assessment of your abilities.",
  ].filter(Boolean);
  return parts.join(" ");
}

interface SkillScoreAnalysis {
  overallScore: number;
  breakdown: Breakdown;
  skillEvidence: SkillEvidenceItem[];
  strengths: string[];
  improvementAreas: string[];
  summary: string;
  confidence: "high" | "medium" | "low";
  analyzedAt: string;
  modelVersion: string;
}

function computeScore(
  profile: any,
  studentProfile: any,
  skills: any[],
  interests: string[],
  internships: any[],
  pastProjects: any[],
  publications: any[],
  certifications: any[],
  githubPublicRepos?: number
): SkillScoreAnalysis {
  const githubConnected: boolean = profile.github_connected ?? false;
  const githubUsername: string | undefined = profile.github_username ?? undefined;
  const resumeUrl: string | undefined = profile.resume_url ?? undefined;
  const linkedinUrl: string | undefined = profile.linkedin_url ?? undefined;
  const portfolioUrl: string | undefined = profile.portfolio_url ?? undefined;

  const skillNames = skills.map((s: any) => s.skills?.name ?? s.name ?? "").filter(Boolean);

  // Per-skill evidence — now includes resumeUrl + githubPublicRepos
  const skillItems: SkillEvidenceItem[] = skills.map((s: any) => {
    const name: string = s.skills?.name ?? s.name ?? "";
    const prof: Proficiency = (s.proficiency as Proficiency) ?? "intermediate";
    return analyzeSkillEvidence(
      name, prof, pastProjects, internships, certifications, publications,
      interests, githubConnected, githubUsername, resumeUrl, githubPublicRepos
    );
  }).filter((s) => s.skill !== "");

  const breakdown: Breakdown = {
    skillEvidence: calcSkillEvidenceScore(skills, skillItems),
    projectEvidence: calcProjectScore(pastProjects, skillNames),
    githubEvidence: calcGithubScore(githubConnected, githubUsername, resumeUrl, linkedinUrl, portfolioUrl, githubPublicRepos),
    experienceEvidence: calcExperienceScore(internships, skillNames),
    certificationEvidence: calcCertScore(certifications, skillNames),
    consistencyScore: calcConsistencyScore(skillItems),
    publicationBonus: calcPubBonus(publications),
  };

  const rawTotal = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const overallScore = clamp(rawTotal);

  const strengths = buildStrengths(pastProjects, internships, certifications, publications, githubConnected, resumeUrl, skillItems, breakdown);
  const improvementAreas = buildImprovements(pastProjects, internships, certifications, githubConnected, githubUsername, resumeUrl, skillItems);
  const summary = buildSummary(profile.full_name ?? "", overallScore, skillItems, pastProjects, githubConnected, certifications);

  const evidenceCount =
    pastProjects.length +
    internships.length +
    certifications.length +
    publications.length +
    (githubConnected ? 2 : 0) +
    (resumeUrl ? 1 : 0) +
    skillItems.filter((s) => s.status === "SUPPORTED").length;

  const confidence: "high" | "medium" | "low" =
    evidenceCount >= 8 ? "high" : evidenceCount >= 4 ? "medium" : "low";

  return {
    overallScore,
    breakdown,
    skillEvidence: skillItems,
    strengths,
    improvementAreas,
    summary,
    confidence,
    analyzedAt: new Date().toISOString(),
    modelVersion: ENGINE_VERSION,
  };
}

function validateAnalysis(analysis: SkillScoreAnalysis): void {
  if (
    typeof analysis.overallScore !== "number" ||
    analysis.overallScore < 0 ||
    analysis.overallScore > 100
  ) {
    throw new Error("Skill score validation failed: overallScore out of range.");
  }
  if (!isObject(analysis.breakdown)) {
    throw new Error("Skill score validation failed: breakdown missing.");
  }
  if (!Array.isArray(analysis.skillEvidence)) {
    throw new Error("Skill score validation failed: skillEvidence is not an array.");
  }
  if (!["high", "medium", "low"].includes(analysis.confidence)) {
    throw new Error("Skill score validation failed: invalid confidence value.");
  }
}

// ── Edge Function Handler ─────────────────────────────────────────────────

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      // Handle browser CORS preflight
      if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS_HEADERS });
      }

      if (req.method !== "POST") {
        return jsonResponse({ error: "Only POST requests are supported." }, 405);
      }

      try {
        // ── 1. Authenticate ─────────────────────────────────────────────
        const userId = ctx.userClaims?.sub ?? ctx.userClaims?.id;
        if (!userId) {
          return jsonResponse({ error: "Authenticated user not found." }, 401);
        }

        // Parse optional body params
        let githubPublicRepos: number | undefined;
        try {
          const body = await req.json();
          if (isObject(body) && typeof body.github_public_repos === "number") {
            githubPublicRepos = body.github_public_repos;
          }
        } catch {
          // Empty body is fine
        }

        // Use admin client after auth verification
        const supabase = ctx.supabaseAdmin;

        // ── 2. Verify profile exists ────────────────────────────────────
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (profileErr) {
          console.error("Profile lookup error:", profileErr.message);
          return jsonResponse({ error: "Unable to load student profile." }, 500);
        }
        if (!profile) {
          return jsonResponse({ error: "No profile exists for the authenticated user." }, 403);
        }

        // ── 3. Load all evidence sources in parallel ────────────────────
        const [
          skillsRes,
          interestsRes,
          internshipsRes,
          pastProjectsRes,
          publicationsRes,
          certificationsRes,
          studentProfileRes,
        ] = await Promise.all([
          supabase.from("user_skills").select("*, skills(name, id)").eq("profile_id", userId),
          supabase.from("user_interests").select("*, research_interests(name)").eq("profile_id", userId),
          supabase.from("user_internships").select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
          supabase.from("user_past_projects").select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
          supabase.from("user_publications").select("*").eq("profile_id", userId).order("year", { ascending: false }),
          supabase.from("user_certifications").select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
          supabase.from("student_profiles").select("*").eq("profile_id", userId).maybeSingle(),
        ]);

        const queryErrors = [
          skillsRes.error, interestsRes.error, internshipsRes.error,
          pastProjectsRes.error, publicationsRes.error, certificationsRes.error,
          studentProfileRes.error,
        ].filter(Boolean);

        if (queryErrors.length > 0) {
          console.error("DB query errors:", queryErrors.map((e) => e?.message));
          return jsonResponse({ error: "Unable to load the required profile evidence." }, 500);
        }

        const interests: string[] = (interestsRes.data ?? []).map(
          (i: any) => i.research_interests?.name ?? ""
        ).filter(Boolean);

        // ── 4. Compute skill score ──────────────────────────────────────
        const analysis = computeScore(
          profile,
          studentProfileRes.data,
          skillsRes.data ?? [],
          interests,
          internshipsRes.data ?? [],
          pastProjectsRes.data ?? [],
          publicationsRes.data ?? [],
          certificationsRes.data ?? [],
          githubPublicRepos
        );

        // ── 5. Validate result ──────────────────────────────────────────
        try {
          validateAnalysis(analysis);
        } catch (validErr) {
          console.error("Validation error:", validErr instanceof Error ? validErr.message : validErr);
          return jsonResponse({ error: "Score validation failed. Please try again." }, 500);
        }

        // ── 6. Persist to student_skill_scores ──────────────────────────
        const { data: saved, error: insertErr } = await supabase
          .from("student_skill_scores")
          .insert({
            profile_id: userId,
            overall_score: analysis.overallScore,
            breakdown: analysis.breakdown,
            skill_evidence: analysis.skillEvidence,
            strengths: analysis.strengths,
            improvement_areas: analysis.improvementAreas,
            summary: analysis.summary,
            confidence: analysis.confidence,
            model_version: analysis.modelVersion,
            status: "completed",
            analyzed_at: analysis.analyzedAt,
          })
          .select(
            "id, profile_id, overall_score, breakdown, skill_evidence, strengths, improvement_areas, summary, confidence, model_version, status, analyzed_at, created_at"
          )
          .single();

        if (insertErr) {
          console.error("Insert error:", insertErr.message);
          // Return the computed analysis even if saving failed — don't block the user
          return jsonResponse({
            success: true,
            analysis: { id: null, profileId: userId, ...analysis },
            warning: "Analysis computed but could not be saved. Result is shown but may not persist.",
          });
        }

        // ── 7. Return saved record ──────────────────────────────────────
        return jsonResponse({
          success: true,
          analysis: {
            id: saved.id,
            profileId: saved.profile_id,
            overallScore: saved.overall_score,
            breakdown: saved.breakdown,
            skillEvidence: saved.skill_evidence,
            strengths: saved.strengths,
            improvementAreas: saved.improvement_areas,
            summary: saved.summary,
            confidence: saved.confidence,
            modelVersion: saved.model_version,
            status: saved.status,
            analyzedAt: saved.analyzed_at,
            createdAt: saved.created_at,
          },
        });
      } catch (err) {
        console.error(
          "analyze-skill-score unexpected error:",
          err instanceof Error ? err.message : String(err)
        );
        return jsonResponse(
          { error: err instanceof Error ? err.message : "Unexpected server error." },
          500
        );
      }
    }
  ),
};
