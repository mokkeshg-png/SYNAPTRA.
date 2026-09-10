import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL =
  Deno.env.get("GEMINI_MODEL") ?? "gemini-3.7-flash";

const MAX_STRING_LENGTH = 3000;
const MAX_ARRAY_ITEMS = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Remove identifiers, credentials, timestamps and obvious PII
 * before sending database records to Gemini.
 */
function sanitizeForAI(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…`
      : value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeForAI(item));
  }

  if (typeof value === "object") {
    const result: JsonRecord = {};

    const blockedKeys = new Set([
      "id",
      "profile_id",
      "user_id",
      "project_id",
      "owner_id",
      "email",
      "phone",
      "mobile",
      "address",
      "street",
      "password",
      "password_hash",
      "token",
      "access_token",
      "refresh_token",
      "api_key",
      "secret",
      "created_at",
      "updated_at",
    ]);

    for (const [key, childValue] of Object.entries(
      value as JsonRecord,
    )) {
      if (blockedKeys.has(key.toLowerCase())) {
        continue;
      }

      result[key] = sanitizeForAI(childValue);
    }

    return result;
  }

  return null;
}

function isValidUUID(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isObject(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validateAIResult(value: unknown): JsonRecord {
  if (!isObject(value)) {
    throw new Error("Gemini returned an invalid object.");
  }

  const result = value as JsonRecord;

  const matchScore = result.match_score;

  if (
    typeof matchScore !== "number" ||
    !Number.isInteger(matchScore) ||
    matchScore < 0 ||
    matchScore > 100
  ) {
    throw new Error(
      "Gemini returned an invalid match_score.",
    );
  }

  if (typeof result.summary !== "string") {
    throw new Error(
      "Gemini returned an invalid summary.",
    );
  }

  if (!Array.isArray(result.strengths)) {
    throw new Error(
      "Gemini returned invalid strengths.",
    );
  }

  if (!Array.isArray(result.gaps)) {
    throw new Error(
      "Gemini returned invalid gaps.",
    );
  }

  if (!Array.isArray(result.recommendations)) {
    throw new Error(
      "Gemini returned invalid recommendations.",
    );
  }

  const confidence = result.confidence;

  if (
    confidence !== "high" &&
    confidence !== "medium" &&
    confidence !== "low"
  ) {
    throw new Error(
      "Gemini returned an invalid confidence value.",
    );
  }

  return result;
}

async function callGemini(
  inputContext: JsonRecord,
): Promise<JsonRecord> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured.",
    );
  }

  const prompt = `
You are an expert research-project matching assistant.

Your task is to evaluate how well a student fits a research project.

IMPORTANT RULES:

1. Use ONLY the information provided in the input.
2. Never invent skills, experience, publications, internships,
   certifications, education, or achievements.
3. Do not assume that a missing skill means the student can never
   learn it.
4. Clearly distinguish between:
   - direct evidence
   - partial evidence
   - missing evidence
5. Give a match score from 0 to 100.
6. Explain the score using concrete evidence from the supplied data.
7. Identify genuine gaps.
8. Give practical recommendations that could improve the student's
   fit.
9. Do not expose database IDs or private information.
10. Return ONLY JSON matching the supplied schema.

STUDENT AND PROJECT DATA:

${JSON.stringify(inputContext)}
`;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL,
      )}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              additionalProperties: false,
              properties: {
                match_score: {
                  type: "integer",
                  minimum: 0,
                  maximum: 100,
                  description:
                    "Overall student-project compatibility score.",
                },

                summary: {
                  type: "string",
                  description:
                    "Short explanation of the overall fit.",
                },

                confidence: {
                  type: "string",
                  enum: [
                    "high",
                    "medium",
                    "low",
                  ],
                  description:
                    "Confidence in the analysis based on the amount and quality of evidence.",
                },

                strengths: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      category: {
                        type: "string",
                      },
                      evidence: {
                        type: "string",
                      },
                      impact: {
                        type: "string",
                      },
                    },
                    required: [
                      "category",
                      "evidence",
                      "impact",
                    ],
                  },
                },

                gaps: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      category: {
                        type: "string",
                      },
                      gap: {
                        type: "string",
                      },
                      severity: {
                        type: "string",
                        enum: [
                          "low",
                          "medium",
                          "high",
                        ],
                      },
                      evidence: {
                        type: "string",
                      },
                    },
                    required: [
                      "category",
                      "gap",
                      "severity",
                      "evidence",
                    ],
                  },
                },

                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      priority: {
                        type: "string",
                        enum: [
                          "low",
                          "medium",
                          "high",
                        ],
                      },
                      action: {
                        type: "string",
                      },
                      reason: {
                        type: "string",
                      },
                    },
                    required: [
                      "priority",
                      "action",
                      "reason",
                    ],
                  },
                },
              },
              required: [
                "match_score",
                "summary",
                "confidence",
                "strengths",
                "gaps",
                "recommendations",
              ],
            },
          },
        }),
        signal: controller.signal,
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status,
        responseText.slice(0, 2000),
      );

      throw new Error(
        `Gemini API request failed with status ${response.status}.`,
      );
    }

    let geminiData: JsonRecord;

    try {
      geminiData = JSON.parse(responseText);
    } catch {
      throw new Error(
        "Gemini API returned invalid JSON.",
      );
    }

    const text =
      (
        geminiData.candidates as Array<JsonRecord> | undefined
      )?.[0]?.content &&
      (
        (
          (
            geminiData.candidates as Array<JsonRecord>
          )[0].content as JsonRecord
        ).parts as Array<JsonRecord> | undefined
      )?.[0]?.text;

    if (typeof text !== "string") {
      console.error(
        "Unexpected Gemini response:",
        JSON.stringify(geminiData).slice(0, 4000),
      );

      throw new Error(
        "Gemini response did not contain generated text.",
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(
        "Gemini generated text was not valid JSON.",
      );
    }

    return validateAIResult(parsed);
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      // Handle browser preflight.
      if (req.method === "OPTIONS") {
        return new Response("ok", {
          headers: corsHeaders,
        });
      }

      if (req.method !== "POST") {
        return jsonResponse(
          {
            error: "Only POST requests are supported.",
          },
          405,
        );
      }

      try {
        const userId =
          ctx.userClaims?.sub ??
          ctx.userClaims?.id;

        if (!userId) {
          return jsonResponse(
            {
              error: "Authenticated user not found.",
            },
            401,
          );
        }

        let body: unknown;

        try {
          body = await req.json();
        } catch {
          return jsonResponse(
            {
              error: "Request body must be valid JSON.",
            },
            400,
          );
        }

        if (!isObject(body)) {
          return jsonResponse(
            {
              error: "Request body must be an object.",
            },
            400,
          );
        }

        const projectId = body.project_id;

        if (!isValidUUID(projectId)) {
          return jsonResponse(
            {
              error:
                "project_id must be a valid UUID.",
            },
            400,
          );
        }

        /*
         * Use the admin client only after authenticating the caller.
         * This allows the function to read the student's complete
         * profile data without depending on every table's RLS policy.
         */
        const supabase = ctx.supabaseAdmin;

        // ---------------------------------------------------------
        // 1. Verify that the authenticated user has a profile.
        // ---------------------------------------------------------

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

        if (profileError) {
          console.error(
            "Profile lookup failed:",
            profileError.message,
          );

          return jsonResponse(
            {
              error: "Unable to load student profile.",
            },
            500,
          );
        }

        if (!profile) {
          return jsonResponse(
            {
              error:
                "No profile exists for the authenticated user.",
            },
            403,
          );
        }

        // ---------------------------------------------------------
        // 2. Verify student profile.
        // ---------------------------------------------------------

        const {
          data: studentProfile,
          error: studentProfileError,
        } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("profile_id", userId)
          .maybeSingle();

        if (studentProfileError) {
          console.error(
            "Student profile lookup failed:",
            studentProfileError.message,
          );

          return jsonResponse(
            {
              error:
                "Unable to load student profile information.",
            },
            500,
          );
        }

        if (!studentProfile) {
          return jsonResponse(
            {
              error:
                "The authenticated user does not have a student profile.",
            },
            403,
          );
        }

        // ---------------------------------------------------------
        // 3. Load all student evidence and project information.
        // ---------------------------------------------------------

        const [
          skillsResult,
          interestsResult,
          internshipsResult,
          pastProjectsResult,
          publicationsResult,
          certificationsResult,
          projectResult,
          projectRolesResult,
        ] = await Promise.all([
          supabase
            .from("user_skills")
            .select("*, skills(*)")
            .eq("profile_id", userId),

          supabase
            .from("user_interests")
            .select("*, research_interests(*)")
            .eq("profile_id", userId),

          supabase
            .from("user_internships")
            .select("*")
            .eq("profile_id", userId)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("user_past_projects")
            .select("*")
            .eq("profile_id", userId)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("user_publications")
            .select("*")
            .eq("profile_id", userId)
            .order("year", {
              ascending: false,
            }),

          supabase
            .from("user_certifications")
            .select("*")
            .eq("profile_id", userId)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .maybeSingle(),

          supabase
            .from("project_roles")
            .select("*")
            .eq("project_id", projectId),
        ]);

        const queryErrors = [
          skillsResult.error,
          interestsResult.error,
          internshipsResult.error,
          pastProjectsResult.error,
          publicationsResult.error,
          certificationsResult.error,
          projectResult.error,
          projectRolesResult.error,
        ].filter(Boolean);

        if (queryErrors.length > 0) {
          console.error(
            "Database query error:",
            queryErrors.map((error) =>
              error?.message
            ),
          );

          return jsonResponse(
            {
              error:
                "Unable to load the required matching data.",
            },
            500,
          );
        }

        const project = projectResult.data;

        if (!project) {
          return jsonResponse(
            {
              error: "Project not found.",
            },
            404,
          );
        }

        // ---------------------------------------------------------
        // 4. Build sanitized AI input.
        // ---------------------------------------------------------

        const inputContext = {
          student: {
            profile: sanitizeForAI(profile),
            student_profile:
              sanitizeForAI(studentProfile),

            skills: sanitizeForAI(
              skillsResult.data ?? [],
            ),

            research_interests: sanitizeForAI(
              interestsResult.data ?? [],
            ),

            internships: sanitizeForAI(
              internshipsResult.data ?? [],
            ),

            past_projects: sanitizeForAI(
              pastProjectsResult.data ?? [],
            ),

            publications: sanitizeForAI(
              publicationsResult.data ?? [],
            ),

            certifications: sanitizeForAI(
              certificationsResult.data ?? [],
            ),
          },

          project: sanitizeForAI(project),

          project_roles: sanitizeForAI(
            projectRolesResult.data ?? [],
          ),
        };

        // ---------------------------------------------------------
        // 5. Ask Gemini for compatibility analysis.
        // ---------------------------------------------------------

        const outputResult =
          await callGemini(inputContext);

        // ---------------------------------------------------------
        // 6. Save analysis to ai_analyses.
        // ---------------------------------------------------------

        const expiresAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();

        const { data: savedAnalysis, error: insertError } =
          await supabase
            .from("ai_analyses")
            .insert({
              type: "compatibility",
              project_id: projectId,
              user_id: userId,
              input_context: inputContext,
              output_result: outputResult,
              model_used: GEMINI_MODEL,
              confidence: outputResult.confidence,
              expires_at: expiresAt,
            })
            .select(
              "id, type, project_id, user_id, output_result, model_used, confidence, created_at, expires_at",
            )
            .single();

        if (insertError) {
          console.error(
            "AI analysis insert failed:",
            insertError.message,
          );

          return jsonResponse(
            {
              error:
                "AI analysis was generated but could not be saved.",
            },
            500,
          );
        }

        // ---------------------------------------------------------
        // 7. Return the saved analysis.
        // ---------------------------------------------------------

        return jsonResponse({
          success: true,
          analysis: savedAnalysis,
        });
      } catch (error) {
        console.error(
          "analyze-project-fit error:",
          error instanceof Error
            ? error.message
            : String(error),
        );

        return jsonResponse(
          {
            error:
              error instanceof Error
                ? error.message
                : "Unexpected server error.",
          },
          500,
        );
      }
    },
  ),
};