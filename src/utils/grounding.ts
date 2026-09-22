/**
 * Grounding checks for AI-tailored resumes.
 *
 * The model is told never to invent facts, but prompts alone don't guarantee
 * it. These checks compare the generated resume against the candidate's own
 * resume text and flag anything that can't be traced back to it: numbers,
 * skills, employers, schools, certifications, projects, and terms that only
 * appear in the job description. Used server-side after generation.
 */
import type { TailoredResume } from "../types";

export interface GroundingIssue {
  section: string;
  text: string;
  reason: string;
}

export interface GroundingContext {
  sourceText: string;
  jobDescription: string;
  /** JD keywords the model itself reported the candidate lacks. */
  missingKeywords?: string[];
  companyName?: string;
}

// ---------------------------------------------------------------------------
// Text matching
// ---------------------------------------------------------------------------

const normalize = (text: string) =>
  ` ${text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()} `;

/** Crude suffix stripping so "volunteers"/"volunteering" match "volunteer". */
const stem = (word: string) => word.replace(/(ing|ed|es|s|ly)$/, "");

/** Answers "does the candidate's resume mention this term?" tolerantly. */
class SourceIndex {
  private readonly norm: string;
  private readonly tokens: Set<string>;
  private readonly joined: Set<string>;
  private readonly numbers: Set<string>;
  private readonly stems: Set<string>;

  constructor(source: string) {
    this.norm = normalize(source);
    const words = this.norm.trim().split(" ").filter(Boolean);
    this.tokens = new Set(words);
    // "node js" in the source should also match "nodejs" in the output.
    this.joined = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      this.joined.add(words[i] + words[i + 1]);
      if (i < words.length - 2) this.joined.add(words[i] + words[i + 1] + words[i + 2]);
    }
    this.numbers = new Set(extractNumbers(source));
    this.stems = new Set(words.map(stem));
  }

  /** Same word up to its ending: "organized" matches "organizing". */
  hasWordStem(word: string): boolean {
    return this.stems.has(stem(word));
  }

  has(term: string): boolean {
    const n = normalize(term).trim();
    if (!n) return true;
    const variants = new Set([n, n.replace(/s$/, ""), `${n}s`]);
    for (const v of variants) {
      if (this.norm.includes(` ${v} `)) return true;
      const squashed = v.replace(/ /g, "");
      if (squashed.length >= 3 && (this.tokens.has(squashed) || this.joined.has(squashed))) return true;
    }
    return false;
  }

  hasNumber(num: string): boolean {
    return this.numbers.has(num);
  }
}

/** Numeric values in text, e.g. "$2.5M" -> "2.5", "1,200+" -> "1200". Digits inside words (S3, EC2) are ignored. */
function extractNumbers(text: string): string[] {
  const matches = text.match(/(?<![A-Za-z0-9.])\$?\d[\d,]*(?:\.\d+)?/g) || [];
  return matches
    .map((m) => m.replace(/[$,]/g, "").replace(/\.0+$/, ""))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Activity overlap
// ---------------------------------------------------------------------------

/** Share of a bullet's meaningful words that must appear in the source. */
const MIN_WORD_OVERLAP = 0.34;

/** Generic resume verbs and connectives that rewording swaps freely; they prove nothing either way. */
const FILLER_WORDS = new Set(
  (
    "with from their they them this that these those into through across over within while including various " +
    "multiple several ensure ensuring enable enabled enabling drive drove driving maintain maintained maintaining " +
    "provide provided providing contribute contributed contributing responsible successfully effectively " +
    "built build building developed develop developing created create creating designed design designing " +
    "implemented implement implementing delivered deliver delivering improved improve improving supported support " +
    "supporting collaborated collaborate collaborating coordinated coordinate coordinating worked work working " +
    "helped help helping used using utilized leveraged spearheaded managed manage managing handled owned " +
    "partnered streamlined established launched executed performed achieved resulting result results based related " +
    "strong high quality efficient effective clear regular ongoing daily weekly monthly also more other"
  ).split(" ")
);

// ---------------------------------------------------------------------------
// Job-description-only terms
// ---------------------------------------------------------------------------

const COMMON_CAPITALIZED = new Set(
  (
    "i we you our your the a an and or in on for with to of at by as is are be this that these those it if all any " +
    "other new strong excellent experience ability knowledge skills requirements responsibilities qualifications " +
    "preferred required bonus benefits team teams role job company work must will can may equal opportunity employer " +
    "salary remote hybrid onsite full time part about who what why how where when please apply us usa inc llc ltd " +
    "january february march april may june july august september october november december " +
    "monday tuesday wednesday thursday friday saturday sunday"
  ).split(" ")
);

/**
 * Terms that look like specific skills or tools in the JD but that the
 * candidate's resume never mentions. If one of these shows up in the tailored
 * resume, the model copied it from the JD.
 */
function jobOnlyTerms(ctx: GroundingContext, source: SourceIndex): string[] {
  const jd = ctx.jobDescription;
  const terms = new Set<string>();

  for (const kw of ctx.missingKeywords || []) {
    if (kw && kw.trim().length > 1) terms.add(kw.trim());
  }

  const lowerJd = ` ${jd.toLowerCase()} `;
  const tokenRe = /[A-Za-z][A-Za-z0-9+#./-]*[A-Za-z0-9+#]|[A-Z]{2,}/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(jd))) {
    const word = match[0].replace(/[./-]+$/, "");
    if (word.length < 2 || COMMON_CAPITALIZED.has(word.toLowerCase())) continue;

    const technical =
      /\d|[+#]|\w[./]\w/.test(word) || // C++, C#, Node.js, CI/CD, ES6
      /^[A-Z]{2,6}s?$/.test(word) || // AWS, SQL, APIs
      /^[A-Z][a-z]+[A-Z]/.test(word); // TypeScript, PostgreSQL

    // A capitalised word mid-sentence that the JD never writes in lower case
    // is almost always a product or tool name (Kubernetes, Salesforce, Tableau).
    const before = jd.slice(Math.max(0, match.index - 2), match.index);
    const midSentence = /^[A-Z][a-z]/.test(word) && !/[.!?:\n•\-*]\s*$/.test(before) && match.index > 0;
    const properNoun = midSentence && !lowerJd.includes(` ${word.toLowerCase()} `);

    if (technical || properNoun) terms.add(word);
  }

  const companyTokens = new Set(normalize(ctx.companyName || "").trim().split(" ").filter(Boolean));
  return [...terms].filter((t) => {
    const n = normalize(t).trim();
    return n && !companyTokens.has(n) && !source.has(t);
  });
}

// ---------------------------------------------------------------------------
// Checking and enforcing
// ---------------------------------------------------------------------------

class Checker {
  readonly issues: GroundingIssue[] = [];
  private readonly source: SourceIndex;
  private readonly forbidden: { term: string; norm: string }[];

  constructor(private readonly ctx: GroundingContext) {
    this.source = new SourceIndex(ctx.sourceText);
    this.forbidden = jobOnlyTerms(ctx, this.source).map((term) => ({ term, norm: normalize(term).trim() }));
  }

  /** Why a piece of free text isn't grounded, or null if it is. */
  problemWith(text: string): string | null {
    if (!text) return null;
    const invented = extractNumbers(text).filter((n) => !this.source.hasNumber(n));
    if (invented.length) return `number(s) not in your profile: ${invented.join(", ")}`;
    const norm = normalize(text);
    const copied = this.forbidden.filter((f) => norm.includes(` ${f.norm} `)).map((f) => f.term);
    if (copied.length) return `mentions ${copied.join(", ")}, which is in the job description but not your profile`;
    return null;
  }

  /**
   * A bullet describing an activity that isn't in the source: most of its
   * meaningful words appear nowhere in the candidate's resume. Rewording a
   * real bullet keeps most of its words; an invented one shares almost none.
   */
  unsupportedActivity(text: string): string | null {
    const words = normalize(text).trim().split(" ").filter((w) => w.length > 3 && !FILLER_WORDS.has(w));
    if (words.length < 4) return null;
    const found = words.filter((w) => this.source.has(w) || this.source.hasWordStem(w));
    return found.length / words.length < MIN_WORD_OVERLAP ? "describes activity not found in your profile" : null;
  }

  /** Any reason a bullet can't be backed up by the source. */
  bulletProblem(text: string): string | null {
    return this.problemWith(text) ?? this.unsupportedActivity(text);
  }

  termMissing(term: string | undefined): boolean {
    return !!term && !!term.trim() && !this.source.has(term);
  }

  flag(section: string, text: string, reason: string) {
    this.issues.push({ section, text, reason });
  }

  /** Keep only the sentences of a paragraph that are grounded. `strict` also requires word overlap with the source. */
  filterSentences(section: string, text: string, enforce: boolean, strict = false): string {
    // Split only at sentence-ending punctuation followed by whitespace, so
    // "Node.js" or "3.5" stay intact.
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
    const kept = sentences.filter((s) => {
      const problem = strict ? this.bulletProblem(s) : this.problemWith(s);
      if (problem) this.flag(section, s.trim(), problem);
      return !problem;
    });
    return enforce ? kept.join(" ").trim() : text;
  }

  /** The "Title | Company | ..." line of the source that mentions this entity. */
  sourceHeaderFor(entity: string): string[] | null {
    const target = normalize(entity).trim();
    if (!target) return null;
    for (const line of this.ctx.sourceText.split("\n")) {
      if (line.includes(" | ") && normalize(line).includes(` ${target} `)) {
        return line.split(" | ").map((p) => p.trim());
      }
    }
    return null;
  }
}

/**
 * Checks a tailored resume against the candidate's own resume text.
 * With enforce=false it only reports problems; with enforce=true it also
 * returns a copy with every ungrounded item removed or restored from source.
 */
export function groundResume(
  resume: TailoredResume,
  ctx: GroundingContext,
  enforce: boolean
): { resume: TailoredResume; issues: GroundingIssue[] } {
  const c = new Checker(ctx);
  const r: TailoredResume = JSON.parse(JSON.stringify(resume));

  // Contact details the model can't have made up legitimately.
  const contact = r.contactInfo || ({} as TailoredResume["contactInfo"]);
  for (const key of ["email", "phone", "linkedin", "portfolio"] as const) {
    if (c.termMissing(contact[key])) {
      c.flag("Contact", contact[key]!, "not in your profile");
      if (enforce) contact[key] = "";
    }
  }

  // Experience: employer must exist; title must match the source; bullets must be grounded.
  r.experience = (r.experience || []).filter((exp) => {
    if (c.termMissing(exp.company)) {
      c.flag("Experience", `${exp.role} at ${exp.company}`, "employer not in your profile");
      return !enforce;
    }
    for (const date of [exp.startDate, exp.endDate]) {
      const problem = c.problemWith(date || "");
      if (problem) c.flag("Experience", `${exp.company}: ${date}`, problem);
    }
    if (c.termMissing(exp.role)) {
      const header = c.sourceHeaderFor(exp.company);
      c.flag("Experience", `${exp.role} at ${exp.company}`, "job title differs from your profile");
      if (enforce && header) exp.role = header[0];
    }
    exp.bullets = (exp.bullets || []).filter((b) => {
      const problem = c.bulletProblem(b);
      if (problem) c.flag("Experience", b, problem);
      return !enforce || !problem;
    });
    if (exp.skillsUsed) {
      exp.skillsUsed = exp.skillsUsed.filter((s) => !c.termMissing(s) || !enforce);
    }
    return true;
  });

  // Community / volunteer roles: same rules as experience.
  r.community = (r.community || []).filter((item) => {
    if (c.termMissing(item.organization)) {
      c.flag("Community", `${item.role} at ${item.organization}`, "organization not in your profile");
      return !enforce;
    }
    if (c.termMissing(item.role)) {
      const header = c.sourceHeaderFor(item.organization);
      c.flag("Community", `${item.role} at ${item.organization}`, "role differs from your profile");
      if (enforce && header) item.role = header[0];
    }
    item.bullets = (item.bullets || []).filter((b) => {
      const problem = c.bulletProblem(b);
      if (problem) c.flag("Community", b, problem);
      return !enforce || !problem;
    });
    return true;
  });

  // Education: school must exist; degree, GPA and honors must match the source.
  r.education = (r.education || []).filter((edu) => {
    if (c.termMissing(edu.institution)) {
      c.flag("Education", edu.institution, "school not in your profile");
      return !enforce;
    }
    const degree = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(" ");
    if (c.termMissing(edu.degree) || c.termMissing(edu.fieldOfStudy)) {
      const header = c.sourceHeaderFor(edu.institution);
      c.flag("Education", degree, "degree differs from your profile");
      if (enforce && header) {
        edu.degree = header[0];
        edu.fieldOfStudy = "";
      }
    }
    for (const field of ["graduationYear", "gpa"] as const) {
      const problem = c.problemWith(edu[field] || "");
      if (problem) {
        c.flag("Education", `${edu.institution}: ${edu[field]}`, problem);
        if (enforce) edu[field] = "";
      }
    }
    if (edu.honorsOrDetails) {
      const honors = edu.honorsOrDetails.split(/[,;·]/).map((h) => h.trim()).filter(Boolean);
      const kept = honors.filter((h) => {
        const bad = c.termMissing(h) || c.problemWith(h);
        if (bad) c.flag("Education", h, "honor not in your profile");
        return !bad;
      });
      if (enforce) edu.honorsOrDetails = kept.join(", ");
    }
    return true;
  });

  // Skills: every skill must be named in the source.
  r.skillsCategories = (r.skillsCategories || [])
    .map((cat) => ({
      ...cat,
      skills: (cat.skills || []).filter((skill) => {
        if (c.termMissing(skill)) {
          c.flag("Skills", skill, "skill not in your profile");
          return !enforce;
        }
        return true;
      }),
    }))
    .filter((cat) => cat.skills.length > 0);

  // Projects: the project must exist; its description must be grounded.
  r.projects = (r.projects || []).filter((proj) => {
    if (c.termMissing(proj.name)) {
      c.flag("Projects", proj.name, "project not in your profile");
      return !enforce;
    }
    proj.description = c.filterSentences("Projects", proj.description || "", enforce, true);
    if (proj.technologies) {
      proj.technologies = proj.technologies.filter((t) => {
        if (c.termMissing(t)) {
          c.flag("Projects", `${proj.name}: ${t}`, "technology not in your profile");
          return !enforce;
        }
        return true;
      });
    }
    return true;
  });

  // Certifications: every meaningful word must appear in the source.
  r.certifications = (r.certifications || []).filter((cert) => {
    const words = normalize(cert).trim().split(" ").filter((w) => w.length > 2 && !/^\d+$/.test(w));
    const missing = words.filter((w) => c.termMissing(w));
    if (missing.length > 0 || c.problemWith(cert)) {
      c.flag("Certifications", cert, "certification not in your profile");
      return !enforce;
    }
    return true;
  });

  r.summary = c.filterSentences("Summary", r.summary || "", enforce);

  // Title: must be the candidate's own title, never the target job's.
  if (contact.title && (c.termMissing(contact.title) || c.problemWith(contact.title))) {
    c.flag("Header", contact.title, "title not in your profile");
    if (enforce) contact.title = r.experience[0]?.role || "";
  }

  return { resume: r, issues: c.issues };
}
