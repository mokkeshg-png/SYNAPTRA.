# AI Student Skill Score Engine

A client-side evidence scoring engine for student profiles on the Synaptra platform. The engine (`skillScoreEngine.ts`) computes a 0–100 score from profile data (projects, GitHub, certifications, internships, publications), surfaces per-skill evidence status, and persists results to Supabase. The UI (`SkillScorePanel`) renders only on a user's own profile view. The hook (`useSkillScore`) tries an Edge Function first and falls back to local computation. No integration with the existing AI chatbot.

Watch for: `BREAKDOWN_LABELS` in the panel has a confirmed key mismatch against `SkillScoreBreakdown` — `publicationBonus` never renders; `calcGithubEvidenceScore` double-counts connected + username, inflating scores for all connected users; `invokeSkillScoreAnalysis` passes no `userId` to the Edge Function, relying on JWT inference with no documented guarantee; the initial load error path in `useSkillScore` is unreachable.

**Verdict**: NEEDS_CHANGES

---

## High-level view

`SkillScorePanel` is correctly gated to `isSelf && user` in `Profile.tsx`. `isSelf` is `user?.id === profile.userId`, computed after the `if (!profile) return` early exit, so `profile` is guaranteed non-null at the render site. None of the new files import from `AiAssistant.tsx` or `campusAiEngine.ts`.

`BREAKDOWN_LABELS` in `SkillScorePanel` has seven entries, but one — `resumeUrl` — does not exist in `SkillScoreBreakdown`. The map is missing `publicationBonus`. The `as any` cast on `currentScore.breakdown` suppresses the TypeScript error that would have caught this, so the publication bonus bar silently renders as zero and the correct bar is never shown.

`calcGithubEvidenceScore` awards `+12` for `githubConnected` and then unconditionally awards `+4` more for `githubUsername`. Because the profile page enforces `githubConnected: !!githubUsername.trim()`, these two fields always move together — so every connected user starts at 16/20 before any other signal, and the `else if (githubUsername)` branch (the "username entered but OAuth not completed" path) accumulates 10 pts rather than 6, making it too close to the fully-connected path.

`invokeSkillScoreAnalysis` sends only `github_public_repos` to the Edge Function body; the caller identity is implicit in the JWT. Supabase forwards the JWT automatically, but the Edge Function must call `auth.getUser()` to extract it — and that call is not visible in the client-side code. If the Edge Function omits that step, persisted rows are orphaned or attributed incorrectly with no client-side error surfaced.

The hook's `loadPersistedScore` outer try/catch is unreachable for the common failure scenario (missing table, RLS denial). Both DB helpers catch errors internally and return null/[]. The hook receives null + [] with no exception and sets `status = "idle"`, which produces the "No analysis yet" prompt. The error branch in the load path (`setStatus("error")`) is dead code unless the Supabase client itself throws (e.g., `supabase` is null).

---

<details>
<summary>Issues (4)</summary>

1. **BREAKDOWN_LABELS key mismatch** — The panel defines `resumeUrl` as a breakdown key; `SkillScoreBreakdown` has no such field. `publicationBonus` (max 5) is absent from the UI entirely. Fix: replace `resumeUrl` with `publicationBonus` in `BREAKDOWN_LABELS`.

2. **GitHub score double-counts connected + username** — `calcGithubEvidenceScore` adds 12 for `githubConnected` then unconditionally adds 4 for `githubUsername`. Every connected user starts at 16/20. Fix: move the `+4` username bonus inside the `if (profile.githubConnected)` block, or remove the unconditional line and rely solely on the if/else branches.

3. **`invokeSkillScoreAnalysis` passes no userId** — The Edge Function receives only `github_public_repos`; caller identity comes only from the JWT. If the Edge Function does not call `auth.getUser()`, scores are unsaved or attributed to the wrong profile. Fix: pass `userId` explicitly in the body, or add a comment confirming the JWT extraction contract with a reference to the Edge Function implementation.

4. **Load error path in `useSkillScore` is dead code** — Both DB helpers eat errors and return null/[]. The hook's outer catch in `loadPersistedScore` is never reached by DB errors, so `setStatus("error")` in the load path is unreachable. The failure mode (missing table) silently becomes "idle" UX, which is acceptable — but the dead branch should be documented or removed to avoid misleading future readers.

</details>

---

<details>
<summary>Details</summary>

### `BREAKDOWN_LABELS` key mismatch against `SkillScoreBreakdown`

`SkillScoreBreakdown` in `types/index.ts` defines seven keys:
```
skillEvidence, projectEvidence, githubEvidence, experienceEvidence,
certificationEvidence, consistencyScore, publicationBonus
```

`BREAKDOWN_LABELS` in `SkillScorePanel.tsx` defines seven keys, but the last one is wrong:
```
skillEvidence, projectEvidence, githubEvidence, experienceEvidence,
certificationEvidence, consistencyScore, resumeUrl   ← does not exist on the type
```

`publicationBonus` is absent. The `resumeUrl` row always evaluates `(currentScore.breakdown as any)["resumeUrl"] ?? 0` → `0`, rendering a permanently-zero progress bar labeled whatever label was assigned to that key. The `as any` cast is what suppresses the TypeScript error. **confirmed**

### GitHub evidence double-count

```ts
if (profile.githubConnected) {
  pts += 12;
} else if (profile.githubUsername) {
  pts += 6;
}
if (profile.githubUsername) pts += 4;  // ← runs even when githubConnected is true
```

The unconditional `+4` for `githubUsername` fires in every branch where `githubUsername` is set. Since `saveProfile` enforces `githubConnected: !!githubUsername.trim()`, a user with a username always has both fields set, giving them 16 pts before any other signal. The intent was apparently to distinguish "fully connected via OAuth" (12 pts) from "username entered without OAuth" (6 pts), but the current structure collapses that distinction: connected = 16, username-only = 10 — only a 6-pt gap rather than the 6-pt vs 12-pt separation the if/else implies. **confirmed**

### Edge Function identity gap

```ts
const body: Record<string, unknown> = {};
if (typeof githubPublicRepos === "number") {
  body.github_public_repos = githubPublicRepos;
}
await supabase!.functions.invoke("analyze-skill-score", { body });
```

No `userId` or `profileId` is in the body. The Edge Function must extract the caller's identity from the JWT that Supabase automatically forwards. Supabase does forward it, but the Edge Function must call `supabase.auth.getUser()` (using the anon key + the request's `Authorization` header) to verify it. If the Edge Function skips that step or uses a server-side service-role client that doesn't check the JWT, it has no way to know which profile to write to. The client has no way to detect this failure — `invokeSkillScoreAnalysis` checks `data?.success` and `data?.analysis`, but if the Edge Function writes to the wrong row or writes nothing, `data.success` can still be true. **likely**

### Not tested

`skillScoreEngine.ts` is entirely deterministic and pure — it takes a `Profile` and returns a `SkillScoreAnalysis` with no side effects. It has no tests. The three-path fallback in `useSkillScore` (Edge Function → local DB save → in-memory) has no test harness. Boundary cases that warrant coverage: a profile with 0 skills, advanced proficiency with no corroborating evidence, `githubConnected: true` with no username (currently unreachable but not guarded), and the `describeScoreChange` delta < 2 threshold.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|------|-------------|
| `src/components/ai/SkillScorePanel.tsx` | New component — score ring, per-skill evidence cards, breakdown bars, history |
| `src/hooks/useSkillScore.ts` | New hook — load/analyze lifecycle, Edge Function + local fallback |
| `src/lib/skillScoreEngine.ts` | New module — deterministic score computation from Profile data |
| `src/lib/supabase-db.ts` | Added `fetchLatestSkillScore`, `fetchSkillScoreHistory`, `invokeSkillScoreAnalysis`, `saveSkillScoreLocally`, `rowToSkillScoreRecord` |
| `src/lib/github.ts` | New `fetchGithubPublic` function + OAuth helpers |
| `src/types/index.ts` | Added `SkillEvidenceStatus`, `SkillEvidenceItem`, `SkillScoreBreakdown`, `SkillScoreAnalysis`, `SkillScoreRecord`, `SKILL_SCORE_DISCLAIMER` |
| `src/pages/Profile.tsx` | Added `SkillScorePanel` import and conditional render in left column |

Full diff: `git diff main -- src/components/ai/SkillScorePanel.tsx src/hooks/useSkillScore.ts src/lib/skillScoreEngine.ts src/lib/supabase-db.ts src/lib/github.ts src/types/index.ts src/pages/Profile.tsx`

</details>
