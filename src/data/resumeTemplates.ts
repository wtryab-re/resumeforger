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
      "Strict Google XYZ formula: 'Accomplished [X], as measured by [Y], by doing [Z]'",
      "Quantify every single bullet point with metrics (percentages, dollar amounts, hours saved, volume handled)",
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
  3. PROFESSIONAL EXPERIENCE (Company Name, Role Title, Location, Dates. 3 to 5 bullets per role strictly adhering to: Action Verb + Project Context + Quantified Business Impact)
  4. LEADERSHIP & NOTABLE PROJECTS (Title/Role, Organization, Scope of initiative, Quantifiable deliverables)
  5. SKILLS & INTERESTS (Technical proficiencies, certifications, spoken languages, authentic personal interests)
BULLET PHRASING DIRECTIVES:
- Every bullet must begin with a strong, active past-tense verb (e.g., 'Spearheaded', 'Engineered', 'Optimized', 'Negotiated', 'Directed').
- Every bullet must specify the metric or percentage improvement.
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
      "Bullets must emphasize scale (e.g., QPS, throughput, latency reduction, users served, infrastructure cost reduction)",
      "Highlight technical stack tags used in each role or project",
      "Include active links to GitHub, system architectures, or published documentation"
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
  6. CERTIFICATIONS (AWS, GCP, CKA, or relevant professional technical credentials)
BULLET PHRASING DIRECTIVES:
- Emphasize architectural decisions, system complexity, reliability (99.99% uptime), throughput (QPS), and modern best practices.
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
      "Include a 3x3 Core Competencies matrix (e.g., P&L Ownership, M&A Integration, Strategic Vision, Capital Allocation)",
      "Frame all achievements around top-line revenue growth, bottom-line EBITDA improvement, headcount scaling, and transformation",
      "Highlight executive governance, board interactions, and cross-functional organizational leadership"
    ],
    content: `
[TEMPLATE: EXECUTIVE & LEADERSHIP C-SUITE]
LAYOUT ARCHITECTURE:
- Sophisticated executive format designed for C-level, VP, and Director-tier evaluations.
- Standard order:
  1. EXECUTIVE HEADER (Name, Executive Title, Contact Info, LinkedIn)
  2. EXECUTIVE VALUE PROPOSITION (High-impact executive summary articulating strategic vision, scale of operations managed, and proven business transformation track record)
  3. CORE LEADERSHIP COMPETENCIES (Structured grid: P&L Management, Global Team Leadership, Corporate Strategy, Capital Allocation, Mergers & Acquisitions, Organizational Design)
  4. EXECUTIVE PROFESSIONAL EXPERIENCE (Company, Executive Title, Period, Scope of Role [Revenue/Budget, Global Headcount]. Bullets focused on business turnarounds, growth metrics, and shareholder value)
  5. BOARD APPOINTMENTS & ADVISORY ROLES (Organization, Title, Advisory Focus)
  6. EDUCATION & EXECUTIVE PROGRAM CREDENTIALS
BULLET PHRASING DIRECTIVES:
- Speak in the language of executive stewardship: EBITDA, ARR, margin expansion, market penetration, operational excellence, and enterprise risk.
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
