import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { DEFAULT_MODEL, FALLBACK_MODEL, resolveModel } from "./src/data/models";
import { groundResume, type GroundingContext, type GroundingIssue } from "./src/utils/grounding";

// The production build is a bundled CJS file, where __filename/__dirname exist
// natively. Under tsx (ESM) they do not, but that path only ever runs the Vite
// dev server, which needs neither.
const currentFilename = typeof __filename !== "undefined" ? __filename : "";
const currentDirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();

dotenv.config();

const app = express();
// Hosts like Render, Railway and Cloud Run sit behind one proxy; trust it so
// req.ip is the real client and the rate limit below is per user, not global.
app.set("trust proxy", 1);
// Cloud Run and most hosts inject the port; 3000 is the local default.
const PORT = Number(process.env.PORT) || 3000;

// Prompts are plain text and capped below; 2mb is well past any real resume.
app.use(express.json({ limit: "2mb" }));

// The /api/gemini/* routes forward a caller-supplied key to Google, so they
// cost this server nothing - but they are still unauthenticated and public.
// A small fixed-window limit keeps one client from tying up the process.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

app.use("/api/", (req, res, next) => {
  const now = Date.now();
  const ip = req.ip || "unknown";
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too many requests. Please wait a moment and try again.",
    });
  } else {
    entry.count += 1;
  }

  // Evict stale buckets so the map cannot grow without bound.
  if (requestCounts.size > 5000) {
    for (const [key, value] of requestCounts) {
      if (now > value.resetAt) requestCounts.delete(key);
    }
  }

  next();
});

// Longest plain-text inputs accepted into a prompt. A pasted careers page can
// run to tens of thousands of tokens of navigation chrome, which the user pays
// for on their own key without improving the result.
const MAX_RESUME_CHARS = 20000;
const MAX_JOB_DESCRIPTION_CHARS = 20000;

function clampText(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

// Helper to convert model/network/quota errors into friendly messages for simple toasts
function simplifyModelError(err: any): string {
  if (!err) return "An error occurred with the AI service. Please try again.";
  const msg = typeof err === "string" ? err : (err?.message || JSON.stringify(err || ""));

  if (
    msg.includes("503") || 
    msg.includes("high demand") || 
    msg.includes("UNAVAILABLE") || 
    msg.includes("temporarily unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("Spikes in demand")
  ) {
    return "The AI model is currently experiencing high demand. Please try again in a moment.";
  }
  if (
    msg.includes("429") || 
    msg.includes("RESOURCE_EXHAUSTED") || 
    msg.includes("quota") ||
    msg.includes("rate limit")
  ) {
    return "You exceeded your current quota, please check your plan and billing details.";
  }
  if (
    msg.includes("API_KEY_INVALID") || 
    msg.includes("API key not valid") || 
    msg.includes("invalid api key")
  ) {
    return "Invalid Gemini API key. Please check your API key in Settings.";
  }
  if (
    msg.includes("ENOTFOUND") || 
    msg.includes("ETIMEDOUT") || 
    msg.includes("fetch failed") || 
    msg.includes("network") ||
    msg.includes("ECONNRESET")
  ) {
    return "Network error connecting to AI service. Please check your internet connection.";
  }

  // Extract clean message if embedded inside JSON
  try {
    const jsonMatch = msg.match(/"message"\s*:\s*"([^"]+)"/);
    if (jsonMatch && jsonMatch[1]) {
      const inner = jsonMatch[1];
      if (inner.includes("high demand") || inner.includes("Spikes in demand")) {
        return "The AI model is currently experiencing high demand. Please try again in a moment.";
      }
      return inner;
    }
  } catch {}

  const cleaned = msg
    .replace(/\[Primary Model [^\]]+ Error\]:\s*/gi, "")
    .replace(/\[Fallback Lite [^\]]+ Retry Error\]:\s*/gi, "")
    .trim();

  return cleaned.length > 140 ? cleaned.slice(0, 140) + "..." : (cleaned || "AI request encountered an error.");
}

// Helper to get Gemini client with strictly user-provided API key
function getGeminiClient(userKey?: string): GoogleGenAI {
  const apiKey = userKey ? userKey.trim() : "";
    
  if (!apiKey) {
    throw new Error("Gemini API key is required. Please add your free Gemini API key in the 'Set API Key' settings.");
  }

  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Whether retrying on a different model could plausibly succeed. An exhausted
// quota or an invalid API key fails identically on the fallback model, so
// retrying those only doubles the latency (and burns a second quota unit).
function isTransientModelError(err: any): boolean {
  const msg = typeof err === "string" ? err : (err?.message || "");
  return (
    msg.includes("503") ||
    msg.includes("500") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("INTERNAL") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("Spikes in demand") ||
    msg.includes("temporarily unavailable")
  );
}

// Call Gemini, retrying once on the lite model if the primary one is briefly unavailable.
async function callGeminiWithFallback(client: GoogleGenAI, params: any) {
  const chosenModel = params.model || DEFAULT_MODEL;

  try {
    return await client.models.generateContent(params);
  } catch (primaryError: any) {
    const primaryMsg = primaryError?.message || String(primaryError);

    if (!isTransientModelError(primaryError) || chosenModel === FALLBACK_MODEL) {
      console.error(`[Gemini Failed] Model "${chosenModel}": ${primaryMsg}`);
      throw new Error(simplifyModelError(primaryError));
    }

    console.warn(`[Gemini Primary Unavailable] Model "${chosenModel}": ${primaryMsg}. Retrying once on "${FALLBACK_MODEL}"...`);
    try {
      const fallbackResult = await client.models.generateContent({ ...params, model: FALLBACK_MODEL });
      console.log(`[Gemini Fallback Succeeded] Model "${FALLBACK_MODEL}" completed request.`);
      return fallbackResult;
    } catch (fallbackError: any) {
      console.error(`[Gemini Fallback Failed] Model "${FALLBACK_MODEL}" also failed.`);
      throw new Error(simplifyModelError(fallbackError || primaryError));
    }
  }
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok"
  });
});

// Test API Key
app.post("/api/gemini/test-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return res.status(400).json({
        success: false,
        error: "No API key entered. Please enter your Gemini API key."
      });
    }

    const client = getGeminiClient(apiKey);
    
    const response = await client.models.generateContent({
      model: DEFAULT_MODEL,
      contents: "Reply with the exact word 'READY' if you can read this.",
      config: {
        temperature: 0.1,
      }
    });

    const reply = response.text?.trim() || "";
    res.json({
      success: true,
      message: "API key is valid and connected to Google AI Studio!",
      model: DEFAULT_MODEL,
      reply
    });
  } catch (error: any) {
    console.error("API Key test failed:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to validate API key with Gemini."
    });
  }
});

// Tailor Resume endpoint
// Asks the model to rewrite a tailored resume without the listed ungrounded
// claims. Returns the corrected tailoredResume object.
async function repairUngroundedResume(
  client: GoogleGenAI,
  model: string,
  resumeText: string,
  tailored: unknown,
  issues: GroundingIssue[]
) {
  const problems = issues.map((i) => `- [${i.section}] "${i.text}": ${i.reason}`).join("\n");
  const response = await callGeminiWithFallback(client, {
    model,
    contents: `
The tailored resume below contains claims that are NOT supported by the candidate's own resume:
${problems}

Rewrite the tailored resume so every statement is supported by the candidate's resume:
- Remove invented numbers, skills, employers, schools, certifications, projects and honors.
- Restore job titles, degrees and dates exactly as the candidate's resume states them.
- Where a bullet or sentence mixes true and invented content, keep the true part.
- Keep the length close to the original by drawing on OTHER real content from the candidate's resume, never by inventing.

--- CANDIDATE'S RESUME (the only source of facts) ---
${resumeText}

--- TAILORED RESUME TO CORRECT (JSON) ---
${JSON.stringify(tailored)}
`,
    config: {
      systemInstruction: "You correct resumes so they contain only facts from the candidate's own resume. Never invent anything.",
      responseMimeType: "application/json",
      temperature: 0,
      responseSchema: TAILORED_RESUME_SCHEMA,
    },
  });
  return JSON.parse(response.text || "{}");
}

// Shape of a tailored resume; shared by generation and the accuracy-repair pass.
const TAILORED_RESUME_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    contactInfo: {
      type: Type.OBJECT,
      properties: {
        fullName: { type: Type.STRING },
        title: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        location: { type: Type.STRING },
        linkedin: { type: Type.STRING },
        portfolio: { type: Type.STRING },
      },
      required: ["fullName", "title"],
    },
    summary: {
      type: Type.STRING,
      description: "A 2-4 sentence summary aimed at the job description, stating only experience, skills and results found in the candidate's resume.",
    },
    skillsCategories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "e.g., Languages & Frameworks, Cloud & DevOps, Management" },
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Only skills named in the candidate's resume, never ones taken from the job description alone.",
          },
        },
        required: ["category", "skills"],
      },
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          role: { type: Type.STRING },
          location: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          bullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Bullets from this role in the candidate's resume, reworded with strong action verbs and ordered most relevant to the job first. Keep numbers the resume states; never add new ones.",
          },
          skillsUsed: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["company", "role", "bullets"],
      },
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          fieldOfStudy: { type: Type.STRING },
          location: { type: Type.STRING },
          graduationYear: { type: Type.STRING },
          gpa: { type: Type.STRING, description: "Only if the candidate's resume states a GPA." },
          honorsOrDetails: { type: Type.STRING, description: "Awards and honors listed for this degree in the candidate's resume." },
        },
        required: ["institution", "degree"],
      },
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          technologies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          link: { type: Type.STRING },
          transferable: {
            type: Type.BOOLEAN,
            description: "true if this project is included mainly for transferable qualities (leadership, communication, teamwork...) rather than direct relevance to the job.",
          },
        },
        required: ["name", "description"],
      },
      description: "Projects from the candidate's resume, most relevant first; transferable-only projects last.",
    },
    community: {
      type: Type.ARRAY,
      description: "Volunteer, community, club, mentoring or other leadership roles from the candidate's resume, ordered by how well they show qualities the job values. Empty if the resume has none.",
      items: {
        type: Type.OBJECT,
        properties: {
          organization: { type: Type.STRING },
          role: { type: Type.STRING },
          location: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          bullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "What the candidate actually did in this role per their resume, phrased to show the relevant quality; most relevant first.",
          },
        },
        required: ["organization", "role", "bullets"],
      },
    },
    certifications: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    fontFamily: {
      type: Type.STRING,
      description: "Must be 'Times New Roman'",
    },
  },
  required: ["contactInfo", "summary", "skillsCategories", "experience", "education"],
};

app.post("/api/gemini/tailor-resume", async (req, res) => {
  try {
    const {
      roleTitle,
      companyName,
      apiKey,
      tone = "balanced", // "concise" | "balanced" | "impactful"
      model,
      resumeTemplate,
    } = req.body;

    const resumeText = clampText(req.body.resumeText, MAX_RESUME_CHARS);
    const jobDescription = clampText(req.body.jobDescription, MAX_JOB_DESCRIPTION_CHARS);

    if (!resumeText.trim() || !jobDescription.trim()) {
      return res.status(400).json({ error: "Both resume text and job description are required." });
    }

    const client = getGeminiClient(apiKey);
    const chosenModel = resolveModel(model);

    let templateDirectives = "";
    if (resumeTemplate && (resumeTemplate.content || resumeTemplate.name)) {
      templateDirectives = `
================================================================================
RESUME TEMPLATE (LAYOUT AND STYLE ONLY): "${resumeTemplate.name || 'Custom Template'}"
Follow this template for section order, headings, bullet style and emphasis.
It NEVER overrides the truthfulness rules above: where it asks for metrics,
credentials, roles or sections the candidate's resume doesn't contain, leave
them out rather than inventing them.

${resumeTemplate.content || ""}
${Array.isArray(resumeTemplate.rules) ? resumeTemplate.rules.map((r: string) => `• ${r}`).join("\n") : ""}
================================================================================
`;
    }

    const systemInstruction = `
You are an expert resume writer and ATS (Applicant Tracking System) specialist.
Your job is to present the candidate's REAL background as relevantly as possible for a specific job description.

================================================================================
RULE 1 - TRUTHFULNESS (OVERRIDES EVERY OTHER INSTRUCTION, INCLUDING THE TEMPLATE):
The candidate's resume below is the ONLY source of facts. Everything in the output must be traceable to it.
- Never invent or alter an employer, job title, school, degree, GPA, date, certification, award, project or link.
- Never add a number, percentage, dollar amount, team size, user count or other metric that is not in the candidate's resume. A bullet without a number is fine; an invented number is not.
- Never list or imply a skill, tool, language, framework, methodology or domain the candidate's resume does not mention - even if the job description asks for it. Put those in atsAnalysis.missingKeywords instead.
- Never claim responsibilities or outcomes the resume doesn't describe (e.g. "led a team", "owned the roadmap") unless the resume says so.
- contactInfo.title must be the candidate's own current or most recent title (or an accurate description of it), not the target job title.
- You MAY: reorder, select, shorten, merge and reword the candidate's real content; use the job description's wording for things the candidate genuinely did; choose which real skills and bullets to emphasize.
- Mention the candidate's real adjacent experience when the JD asks for something they lack, without claiming the missing thing.
================================================================================
${templateDirectives}
LENGTH - EXACTLY ONE PAGE:
The resume is rendered on a single US Letter page. The layout fills the page from your output and trims the least relevant items when there is too much - it can never add content - so give it MORE real material than fits:
1. Core content first: the candidate's experience, skills, projects and education most relevant to the job.
2. Transferable content as well, always: EVERY volunteer, community, club, mentoring, leadership or other role from the candidate's resume (in "community"), plus their remaining projects (with transferable: true) and extra bullets from other jobs, chosen for qualities the job values - e.g. leadership, communication, teamwork, ownership, problem solving, customer focus. Phrase each around what the candidate actually did that shows the quality; you may name the quality only if what they did clearly demonstrates it.
This transferable content fills the page when the relevant content runs short and is removed first when space runs out. Never pad or invent to reach a length; if the candidate's resume genuinely has little content, return what is true.

ATS PRINCIPLES:
1. Parse-ability: clear, standard, reverse-chronological section headers.
2. Strong bullets: lead with an action verb; use the Google XYZ formula ("Accomplished [X] as measured by [Y], by doing [Z]") only when the resume provides the measure.
3. Keywords: where the candidate genuinely has a skill or did the work, phrase it with the job description's terminology so ATS matching picks it up.
4. Provide actionable ATS scanner tips explaining how an ATS will evaluate this resume.
5. Typography: the resume uses Times New Roman. Always set fontFamily to "Times New Roman".
`;

    const prompt = `
Target Role: ${roleTitle || "Target Position"}
Target Company: ${companyName || "Target Employer"}
Tone Preference: ${tone}
${templateDirectives ? `\nTemplate: ${resumeTemplate?.name || 'Provided Template'}\n` : ""}

--- CANDIDATE CURRENT RESUME ---
${resumeText}

--- TARGET JOB DESCRIPTION ---
${jobDescription}

Tailor the candidate's resume to this job using only facts from the candidate's resume, follow the template's layout, and return a structured JSON response matching the required schema.
`;

    const response = await callGeminiWithFallback(client, {
      model: chosenModel,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tailoredResume: TAILORED_RESUME_SCHEMA,
            atsAnalysis: {
              type: Type.OBJECT,
              properties: {
                overallScore: {
                  type: Type.INTEGER,
                  description: "ATS score out of 100 based on keyword density, formatting simplicity, and requirement alignment.",
                },
                matchRate: {
                  type: Type.INTEGER,
                  description: "Percentage matching candidate qualifications to job requirements.",
                },
                matchedKeywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Key skills and keywords from the job description that are present and well-emphasized in the tailored resume.",
                },
                missingKeywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Relevant keywords from the job description that were absent or weak in the original resume.",
                },
                criticalSkills: {
                  type: Type.OBJECT,
                  properties: {
                    hardSkills: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    softSkills: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ["hardSkills", "softSkills"],
                },
                scannerTips: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING, description: "e.g., Keyword Density, Section Header Standardization, Metrics & Quantifiers, Layout Simplicity" },
                      tip: { type: Type.STRING },
                      impact: { type: Type.STRING, description: "high, medium, or low" },
                      isSatisfied: { type: Type.BOOLEAN },
                    },
                    required: ["category", "tip", "impact", "isSatisfied"],
                  },
                },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["overallScore", "matchRate", "matchedKeywords", "missingKeywords", "criticalSkills", "scannerTips"],
            },
            tailoringChanges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  section: { type: Type.STRING },
                  change: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["section", "change", "reason"],
              },
            },
          },
          required: ["tailoredResume", "atsAnalysis", "tailoringChanges"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    if (parsed.tailoredResume) {
      const grounding: GroundingContext = {
        sourceText: resumeText,
        jobDescription,
        missingKeywords: parsed.atsAnalysis?.missingKeywords,
        companyName,
      };

      // 1. Anything not traceable to the candidate's resume goes back to the
      //    model once, with the specific problems listed, for a truthful rewrite.
      const firstPass = groundResume(parsed.tailoredResume, grounding, false);
      if (firstPass.issues.length > 0) {
        try {
          const repaired = await repairUngroundedResume(
            client, chosenModel, resumeText, parsed.tailoredResume, firstPass.issues
          );
          if (repaired?.contactInfo && Array.isArray(repaired.experience)) {
            parsed.tailoredResume = repaired;
          }
        } catch (repairError) {
          console.warn("Accuracy repair pass failed; falling back to removal:", repairError);
        }
      }

      // 2. Whatever still can't be backed up is removed outright.
      const final = groundResume(parsed.tailoredResume, grounding, true);
      parsed.tailoredResume = final.resume;
      parsed.tailoredResume.fontFamily = "Times New Roman";

      if (final.issues.length > 0) {
        const removed = [...new Set(final.issues.map((i) => i.text))];
        parsed.tailoringChanges = [
          {
            section: "Accuracy check",
            change: `Removed ${removed.length} item(s) not found in your profile: ${removed.slice(0, 8).join("; ")}${removed.length > 8 ? "; …" : ""}`,
            reason: "Everything on the resume must come from your own profile.",
          },
          ...(parsed.tailoringChanges || []),
        ];
      }

      // Keywords are only "matched" if the candidate really has them.
      if (parsed.atsAnalysis) {
        const source = resumeText.toLowerCase();
        const matched: string[] = parsed.atsAnalysis.matchedKeywords || [];
        const unsupported = matched.filter((k) => !source.includes(String(k).toLowerCase()));
        if (unsupported.length > 0) {
          parsed.atsAnalysis.matchedKeywords = matched.filter((k) => !unsupported.includes(k));
          parsed.atsAnalysis.missingKeywords = [
            ...new Set([...(parsed.atsAnalysis.missingKeywords || []), ...unsupported]),
          ];
        }
      }
    }
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Tailor resume failed:", error);
    res.status(500).json({
      error: simplifyModelError(error),
    });
  }
});

// Generate Cover Letter endpoint
app.post("/api/gemini/generate-cover-letter", async (req, res) => {
  try {
    const {
      roleTitle,
      companyName,
      tone = "balanced", // "concise" | "balanced" | "assertive" | "enthusiastic"
      applicantName,
      apiKey,
      model,
    } = req.body;

    const resumeText = clampText(req.body.resumeText, MAX_RESUME_CHARS);
    const jobDescription = clampText(req.body.jobDescription, MAX_JOB_DESCRIPTION_CHARS);

    if (!jobDescription.trim()) {
      return res.status(400).json({ error: "Job description is required to craft a cover letter." });
    }

    const client = getGeminiClient(apiKey);
    const chosenModel = resolveModel(model);
    const currentDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const systemInstruction = `
You are a top executive talent advisor and professional cover letter author.
Create a high-impact, personalized, and concise cover letter aligned directly with the company's job requirements and industry best practices.

================================================================================
CRITICAL TRUTHFULNESS & GROUNDING MANDATE (ABSOLUTELY NO LYING AT ALL):
1. THE KNOWLEDGE BASE IS ONLY AND STRICTLY THE USER'S PROVIDED RESUME AND WORK INFORMATION.
2. ABSOLUTELY NO LYING AT ALL:
   - YOU MUST NEVER INVENT, FABRICATE, OR HALLUCINATE ANY EMPLOYER, DEGREE, SKILL, OR METRIC.
   - Every single accomplishment, tool, project, or role referenced in the letter MUST come directly from the candidate's actual background.
3. YOUR MISSION IS ONLY TO USE AND REFRAME THE NARRATIVE FOR THE JD USING THE USER'S RESUME AND WORK:
   - Reframe their genuine past achievements and real responsibilities to show how their authentic strengths solve the company's challenges.
   - Connect their true capabilities directly to the job description without fabricating experiences they never had.
================================================================================

COVER LETTER CRITERIA:
1. Concise & Scannable: 3 to 4 tight, well-structured paragraphs (under 350 words total).
2. Direct Value Proposition: Hook the hiring team in the first sentence by stating enthusiasm for the specific role at ${companyName || "the company"} and introducing 2 key value points grounded purely in their real work.
3. Proof of Results: In the body paragraphs, bridge specific job requirements directly with candidate accomplishments and measurable results from their real background.
4. Cultural & Company Alignment: Reflect genuine understanding of the company's mission, industry domain, and role challenges.
5. Professional Call to Action: Courteous, confident sign-off expressing interest in discussing how the candidate can deliver immediate impact.
6. Typography Standard: The cover letter is formatted using Times New Roman font. Always set fontFamily to "Times New Roman".
7. Today's Date: Always use the exact date: "${currentDate}". Never output an incorrect or fictional date.
8. Sign-off Valediction: The 'signOff' field MUST contain ONLY the closing valediction phrase (e.g. "Sincerely," or "Best regards,"). DO NOT include the applicant's name inside 'signOff', because the applicant's name is rendered once separately as the signature line.
`;

    const prompt = `
Role: ${roleTitle || "Target Role"}
Company: ${companyName || "Target Company"}
Applicant Name: ${applicantName || "Applicant"}
Date: ${currentDate}
Tone: ${tone}

Job Description:
${jobDescription}

Candidate Profile / Resume Context:
${resumeText || "Candidate possesses strong background matching the job requirements."}

Craft the cover letter and return structured JSON.
`;

    const response = await callGeminiWithFallback(client, {
      model: chosenModel,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.3,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            applicant: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                location: { type: Type.STRING },
              },
              required: ["name"],
            },
            recipient: {
              type: Type.OBJECT,
              properties: {
                hiringManagerTitle: { type: Type.STRING },
                company: { type: Type.STRING },
                department: { type: Type.STRING },
              },
              required: ["company"],
            },
            date: { type: Type.STRING },
            salutation: { type: Type.STRING },
            openingParagraph: { type: Type.STRING },
            bodyParagraphs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            closingParagraph: { type: Type.STRING },
            signOff: { type: Type.STRING },
            fullLetterText: {
              type: Type.STRING,
              description: "Complete, continuous text formatted ready for copy/export.",
            },
            keyMatchesHighlighted: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  jobRequirement: { type: Type.STRING },
                  addressedHow: { type: Type.STRING },
                },
                required: ["jobRequirement", "addressedHow"],
              },
            },
            fontFamily: {
              type: Type.STRING,
              description: "Must be 'Times New Roman'",
            },
          },
          required: [
            "salutation",
            "openingParagraph",
            "bodyParagraphs",
            "closingParagraph",
            "signOff",
            "fullLetterText",
            "keyMatchesHighlighted",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    parsed.fontFamily = "Times New Roman";
    parsed.date = currentDate;

    // Sanitize signOff and applicant name to guarantee no duplicate signature
    const appName = (parsed.applicant?.name || applicantName || "").trim();
    if (parsed.signOff) {
      const raw = String(parsed.signOff).trim();
      let firstLine = raw.split(/\r?\n/)[0].trim();
      if (appName && firstLine.toLowerCase().includes(appName.toLowerCase())) {
        firstLine = "Sincerely,";
      }
      firstLine = firstLine.replace(/\[.*?\]/g, "").replace(/\{.*?\}/g, "").trim();
      if (!firstLine.endsWith(",")) firstLine += ",";
      parsed.signOff = firstLine || "Sincerely,";
    } else {
      parsed.signOff = "Sincerely,";
    }
    if (!parsed.applicant) {
      parsed.applicant = { name: appName || "Applicant" };
    } else if (appName && (!parsed.applicant.name || parsed.applicant.name.toLowerCase().includes("applicant"))) {
      parsed.applicant.name = appName;
    }

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Cover letter generation failed:", error);
    res.status(500).json({
      error: simplifyModelError(error),
    });
  }
});

// Vite Middleware for dev & static serve for production
// The bundled CJS artifact is only ever produced by `npm run build`, so its
// presence is a reliable production signal even when the host does not set
// NODE_ENV (Cloud Run, for one, does not set it automatically).
const isProduction =
  process.env.NODE_ENV === "production" || currentFilename.endsWith(".cjs");

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(currentDirname, "..", "dist");
    // The server bundle is built into dist/ alongside the frontend; keep it
    // (and its source map) from being served as a static file.
    app.use(/^\/server\.cjs/, (_req, res) => {
      res.status(404).end();
    });
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
