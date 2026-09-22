export interface ResumeTemplate {
  id: string;
  name: string;
  tag: string;
  badgeColor: string;
  description: string;
  structureSummary: string;
  sectionOrder: string[];
  rules: string[];
  content: string; // Detailed blueprint instructions for the LLM
}

export const BUILTIN_RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: "harvard-classic",
    name: "Harvard / Ivy League Classic",
    tag: "Finance & Consulting Standard",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    description: "Reverse-chronological single column with clean dividers.",
    structureSummary: "Contact Header → Education → Professional Experience → Leadership & Activities → Skills & Interests",
    sectionOrder: [
      "Contact Header",
      "Education (Top Placement)",
      "Professional Experience",
      "Leadership & Key Projects",
      "Technical Skills & Personal Interests"
    ],
    rules: [
      "Google XYZ formula ('Accomplished [X], as measured by [Y], by doing [Z]') wherever the candidate's resume supplies the measure; otherwise state the real work and outcome without numbers",
      "Keep every metric the candidate's resume states (percentages, dollar amounts, hours saved, volume handled); never add a number that isn't there",
      "Education is placed prominently above experience or immediately under summary with GPA/honors if notable",
      "Clean, conservative typography and uppercase section headers with divider rules",
      "No jargon without business context; highlight leadership, cross-functional initiative, and measurable bottom-line value"
    ],
    content: `
[TEMPLATE: HARVARD / IVY LEAGUE CLASSIC]
LAYOUT ARCHITECTURE:
- Single-column, strictly chronological, conservative high-impact typography.
- Standard order:
  1. CONTACT HEADER (Full Name centered in bold uppercase, followed by: City, State | Phone | Email | LinkedIn | Portfolio)
  2. EDUCATION (University, Degree, Major, Graduation Date, Honors/Awards, Relevant Coursework)
  3. PROFESSIONAL EXPERIENCE (Company Name, Role Title, Location, Dates. 3 to 5 bullets per role: Action Verb + Project Context + Business Impact, quantified only with numbers from the candidate's resume)
  4. LEADERSHIP & NOTABLE PROJECTS (Title/Role, Organization, Scope of initiative, Quantifiable deliverables)
  5. SKILLS & INTERESTS (Technical proficiencies, certifications, spoken languages, authentic personal interests)
BULLET PHRASING DIRECTIVES:
- Every bullet must begin with a strong, active past-tense verb (e.g., 'Spearheaded', 'Engineered', 'Optimized', 'Negotiated', 'Directed').
- Include the metric or percentage improvement whenever the candidate's resume states one; never invent one.
`.trim(),
  },
  {
    id: "modern-tech",
    name: "Modern Tech & Engineering",
    tag: "Software, Data & Cloud",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    description: "Highlights technical stack and metrics upfront.",
    structureSummary: "Contact Header → Technical Skills Matrix → Professional Experience → Key Projects → Education → Certifications",
    sectionOrder: [
      "Contact Header with GitHub & Portfolio",
      "Technical Skills Matrix (Languages, Cloud, DevOps, DBs)",
      "Professional Engineering Experience",
      "Key Engineering Projects & Open Source",
      "Education",
      "Certifications & Cloud Badges"
    ],
    rules: [
      "Technical Skills matrix is placed at the top immediately below the contact header for instant ATS keyword indexing",
      "Categorize skills clearly: Languages, Frameworks, Cloud & Infrastructure, Databases, Developer Tools",
      "Emphasize scale (QPS, throughput, latency, users served, infrastructure cost) wherever the candidate's resume states it",
      "Highlight technical stack tags used in each role or project",
      "Include the GitHub, portfolio or documentation links the candidate provided"
    ],
    content: `
[TEMPLATE: MODERN TECH & ENGINEERING]
LAYOUT ARCHITECTURE:
- High-density technical layout engineered for automated ATS parsers and technical hiring managers.
- Standard order:
  1. CONTACT HEADER (Name, Title, Email, Phone, Location, GitHub profile, LinkedIn, Technical Portfolio)
  2. TECHNICAL SKILLS MATRIX (Grouped cleanly into: Programming Languages, Frameworks/Libraries, Cloud & DevOps Platforms, Databases & Storage, Developer Tooling)
  3. PROFESSIONAL EXPERIENCE (Company, Role, Dates, Location. Bullets focused on architecture, throughput, reliability, test coverage, and latency/cost metrics. Explicitly note Technologies Used)
  4. TECHNICAL PROJECTS (Project Name, GitHub/Live link, Core Architecture, 2-3 bullets on engineering challenges and user scale)
  5. EDUCATION (Degree, Field, Institution, Graduation Year)
  6. CERTIFICATIONS (only credentials the candidate's resume lists; omit the section if there are none)
BULLET PHRASING DIRECTIVES:
- Emphasize architectural decisions, system complexity, reliability, throughput and modern best practices, using only figures the candidate provided.
`.trim(),
  },
  {
    id: "executive-leadership",
    name: "Executive & Leadership C-Suite",
    tag: "Director, VP & C-Suite",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Executive value proposition, P&L stewardship, and growth.",
    structureSummary: "Executive Profile → Strategic Competencies (3x3 Grid) → Executive Experience (P&L & Scale) → Board & Advisory → Education",
    sectionOrder: [
      "Executive Contact Header",
      "Executive Value Proposition & Summary",
      "Core Leadership Competencies Grid",
      "Executive Career History (P&L & Organizational Scale)",
      "Board & Advisory Appointments",
      "Education & Executive Credentials"
    ],
    rules: [
      "Include a compelling 3-4 sentence Executive Value Proposition establishing industry authority and strategic scope",
      "Include a Core Competencies matrix built only from competencies the candidate's resume demonstrates",
      "Where the candidate's resume supports it, frame achievements around revenue growth, EBITDA improvement, headcount scaling and transformation",
      "Highlight the governance, board interaction and cross-functional leadership the candidate's resume describes"
    ],
    content: `
[TEMPLATE: EXECUTIVE & LEADERSHIP C-SUITE]
LAYOUT ARCHITECTURE:
- Sophisticated executive format designed for C-level, VP, and Director-tier evaluations.
- Standard order:
  1. EXECUTIVE HEADER (Name, Executive Title, Contact Info, LinkedIn)
  2. EXECUTIVE VALUE PROPOSITION (High-impact executive summary articulating strategic vision, scale of operations managed, and proven business transformation track record)
  3. CORE LEADERSHIP COMPETENCIES (Structured grid of competencies the candidate's resume demonstrates)
  4. EXECUTIVE PROFESSIONAL EXPERIENCE (Company, Executive Title, Period, Scope of Role [Revenue/Budget, Headcount] only where stated. Bullets focused on the turnarounds, growth and value the candidate's resume reports)
  5. BOARD APPOINTMENTS & ADVISORY ROLES (Organization, Title, Advisory Focus; omit entirely if the candidate has none)
  6. EDUCATION & EXECUTIVE PROGRAM CREDENTIALS
BULLET PHRASING DIRECTIVES:
- Use executive vocabulary (EBITDA, ARR, margin expansion, market penetration, operational excellence, enterprise risk) only to describe results the candidate's resume actually reports.
`.trim(),
  },
];

const LOCAL_STORAGE_TEMPLATE_KEY = "ats_selected_resume_template_id";
const LOCAL_STORAGE_CUSTOM_TEMPLATE_KEY = "ats_custom_resume_template_data";

export function getStoredTemplateId(): string {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_TEMPLATE_KEY);
    if (stored && BUILTIN_RESUME_TEMPLATES.some((t) => t.id === stored)) {
      return stored;
    }
    return "harvard-classic";
  } catch {
    return "harvard-classic";
  }
}

export function saveStoredTemplateId(id: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_TEMPLATE_KEY, id);
  } catch (err) {
    console.error("Failed to save template preference:", err);
  }
}

export function getCustomUploadedTemplate(): ResumeTemplate | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_TEMPLATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResumeTemplate;
  } catch {
    return null;
  }
}

export function saveCustomUploadedTemplate(template: ResumeTemplate): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_TEMPLATE_KEY, JSON.stringify(template));
  } catch (err) {
    console.error("Failed to save custom template:", err);
  }
}
