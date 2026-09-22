import { MasterProfile, ExperienceItem, EducationItem, VolunteerItem, CertificationOrAwardItem, CustomField, CustomSection } from "../types";

export function createEmptyMasterProfile(): MasterProfile {
  return {
    id: `master_profile_${Date.now()}`,
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
    github: "",
    summary: "",
    skills: [],
    experience: [],
    education: [],
    projects: [],
    volunteerExperience: [],
    certificationsAndAwards: [],
    customFields: [],
    customSections: [],
    notes: "",
    otherInfo: "",
    rawResumeText: "",
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Master profile cache in localStorage, scoped per Firebase user id so that two
 * accounts sharing a browser never see each other's resume data. Firestore
 * remains the source of truth; this is only a fast-paint cache.
 */
const BASE_STORAGE_KEY = "ats_master_profile";
const BASE_HAS_SET_KEY = "ats_master_profile_configured";

function getProfileKeys(userId: string) {
  return {
    storageKey: `${BASE_STORAGE_KEY}_${userId}`,
    hasSetKey: `${BASE_HAS_SET_KEY}_${userId}`,
  };
}

/**
 * Remove the pre-scoping global profile cache. Earlier versions stored the
 * profile under an unscoped key, which leaked one user's resume to the next
 * account signed in on the same browser. Firestore re-populates the cache.
 */
export function clearLegacyUnscopedProfile(): void {
  try {
    localStorage.removeItem(BASE_STORAGE_KEY);
    localStorage.removeItem(BASE_HAS_SET_KEY);
  } catch (e) {
    console.error("Failed to clear legacy master profile:", e);
  }
}

export function hasConfiguredMasterProfile(userId?: string): boolean {
  if (!userId) return false;
  try {
    const { storageKey, hasSetKey } = getProfileKeys(userId);
    if (localStorage.getItem(hasSetKey) === "true") return true;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    return !!(parsed && typeof parsed.fullName === "string" && parsed.fullName.trim());
  } catch {
    return false;
  }
}

export function loadMasterProfile(userId?: string): MasterProfile {
  if (!userId) return createEmptyMasterProfile();

  try {
    const { storageKey } = getProfileKeys(userId);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        const empty = createEmptyMasterProfile();
        return {
          ...empty,
          ...parsed,
          id: parsed.id || empty.id,
          skills: Array.isArray(parsed.skills) ? parsed.skills : [],
          experience: Array.isArray(parsed.experience) ? parsed.experience : [],
          education: Array.isArray(parsed.education) ? parsed.education : [],
          projects: Array.isArray(parsed.projects) ? parsed.projects : [],
          volunteerExperience: Array.isArray(parsed.volunteerExperience) ? parsed.volunteerExperience : [],
          certificationsAndAwards: Array.isArray(parsed.certificationsAndAwards) ? parsed.certificationsAndAwards : [],
          customFields: Array.isArray(parsed.customFields) ? parsed.customFields : [],
          customSections: Array.isArray(parsed.customSections) ? parsed.customSections : [],
          lastUpdated: parsed.lastUpdated || empty.lastUpdated,
        };
      }
    }
  } catch (e) {
    console.error("Failed to load master profile from localStorage:", e);
  }
  return createEmptyMasterProfile();
}

export function saveMasterProfile(profile: MasterProfile, userId?: string): void {
  if (!userId) return;
  try {
    const { storageKey, hasSetKey } = getProfileKeys(userId);
    const updated: MasterProfile = {
      ...profile,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(updated));
    localStorage.setItem(hasSetKey, "true");
  } catch (e) {
    console.error("Failed to save master profile to localStorage:", e);
  }
}

export function wipeMasterProfileToCleanSlate(userId?: string): MasterProfile {
  const empty = createEmptyMasterProfile();
  if (!userId) return empty;
  try {
    const { storageKey, hasSetKey } = getProfileKeys(userId);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(hasSetKey);
  } catch (e) {
    console.error("Failed to wipe master profile:", e);
  }
  return empty;
}

/**
 * GPA and awards/honors for an education entry as one line, e.g.
 * "GPA: 3.8 · Dean's List". Shared by the prompt text, preview and exports.
 */
export function formatEducationDetails(edu: Pick<EducationItem, "gpa" | "honorsOrDetails">): string {
  return [edu.gpa?.trim() ? `GPA: ${edu.gpa.trim()}` : "", edu.honorsOrDetails?.trim() || ""]
    .filter(Boolean)
    .join(" · ");
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  winter: 0, spring: 3, summer: 6, fall: 8, autumn: 8,
};

/**
 * Turns a free-text resume date ("Mar 2022", "03/2022", "2022", "Present")
 * into a sortable month index. "Present"/"Current" sort after every real date;
 * text with no recognisable year returns null.
 */
function dateRank(value?: string): number | null {
  const text = (value || "").trim().toLowerCase();
  if (!text) return null;
  if (/\b(present|current|now|ongoing|today)\b/.test(text)) return Number.MAX_SAFE_INTEGER;

  const years = text.match(/\b(?:19|20)\d{2}\b/g);
  if (!years) return null;
  const year = Number(years[years.length - 1]);

  let month = 0;
  const named = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|winter|spring|summer|fall|autumn)/);
  const numeric = text.match(/\b(\d{1,2})[/.-](?:19|20)\d{2}\b/) || text.match(/\b(?:19|20)\d{2}[/.-](\d{1,2})\b/);
  if (named) month = MONTHS[named[1]];
  else if (numeric && Number(numeric[1]) >= 1 && Number(numeric[1]) <= 12) month = Number(numeric[1]) - 1;

  return year * 12 + month;
}

/** Most recent first; entries with no parseable date keep their order at the end. */
function sortByRanksDesc<T>(items: T[], ranks: (item: T) => (number | null)[]): T[] {
  const compare = (a: (number | null)[], b: (number | null)[]) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i] ?? null;
      const y = b[i] ?? null;
      if (x === y) continue;
      if (x === null) return 1;
      if (y === null) return -1;
      return y - x;
    }
    return 0;
  };
  return [...items].sort((a, b) => compare(ranks(a), ranks(b)));
}

export function sortExperienceDesc<T extends ExperienceItem>(items: T[]): T[] {
  // Order by when the role ended (ongoing roles first), then by when it started.
  return sortByRanksDesc(items, (exp) => {
    const start = dateRank(exp.startDate);
    return [dateRank(exp.endDate) ?? start, start];
  });
}

export function sortEducationDesc<T extends EducationItem>(items: T[]): T[] {
  return sortByRanksDesc(items, (edu) => [dateRank(edu.graduationYear)]);
}

/**
 * Converts a structured MasterProfile into a comprehensive, ATS-ready plain text resume
 * for feeding into Gemini AI tailoring prompts.
 */
export function masterProfileToPlainText(profile: MasterProfile): string {
  // If the user uploaded raw resume text and kept it, we combine or format cleanly
  const sections: string[] = [];

  // Contact Info Header
  const contactParts = [
    profile.location,
    profile.phone,
    profile.email,
    profile.linkedin,
    profile.portfolio,
    profile.github
  ].filter(Boolean);

  sections.push(`${profile.fullName}\n${profile.title}\n${contactParts.join(" | ")}`);

  // Summary
  if (profile.summary && profile.summary.trim()) {
    sections.push(`PROFESSIONAL SUMMARY\n${profile.summary.trim()}`);
  }

  // Skills
  if (profile.skills && profile.skills.length > 0) {
    sections.push(`CORE SKILLS & TECHNOLOGIES\n${profile.skills.join(", ")}`);
  }

  // Work Experience
  if (profile.experience && profile.experience.length > 0) {
    const expText = profile.experience.map((exp) => {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      const header = `${exp.role} | ${exp.company}${exp.location ? ` | ${exp.location}` : ""}${dates ? ` | ${dates}` : ""}`;
      const bullets = (exp.bullets || []).map((b) => `• ${b}`).join("\n");
      const skills = exp.skillsUsed && exp.skillsUsed.length > 0 ? `Skills Used: ${exp.skillsUsed.join(", ")}` : "";
      return [header, bullets, skills].filter(Boolean).join("\n");
    }).join("\n\n");
    sections.push(`PROFESSIONAL EXPERIENCE\n\n${expText}`);
  }

  // Education
  if (profile.education && profile.education.length > 0) {
    const eduText = profile.education.map((edu) => {
      const degree = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(" in ");
      const header = `${degree} | ${edu.institution}${edu.location ? ` | ${edu.location}` : ""}${edu.graduationYear ? ` | ${edu.graduationYear}` : ""}`;
      const details = formatEducationDetails(edu);
      return details ? `${header}\n${details}` : header;
    }).join("\n\n");
    sections.push(`EDUCATION\n\n${eduText}`);
  }

  // Projects
  const projects = (profile.projects || []).filter((p) => p.name?.trim());
  if (projects.length > 0) {
    const projText = projects.map((proj) => {
      const header = `${proj.name}${proj.link ? ` | ${proj.link}` : ""}`;
      const tech = proj.technologies && proj.technologies.length > 0 ? `Technologies: ${proj.technologies.join(", ")}` : "";
      return [header, tech, proj.description?.trim()].filter(Boolean).join("\n");
    }).join("\n\n");
    sections.push(`PROJECTS\n\n${projText}`);
  }

  // Volunteer Experience
  if (profile.volunteerExperience && profile.volunteerExperience.length > 0) {
    const volText = profile.volunteerExperience.map((vol) => {
      const dates = [vol.startDate, vol.endDate || (vol.current ? "Present" : "")].filter(Boolean).join(" – ");
      const header = `${vol.role} | ${vol.organization}${vol.location ? ` | ${vol.location}` : ""}${dates ? ` | ${dates}` : ""}`;
      const desc = vol.description ? vol.description : "";
      const bullets = (vol.bullets || []).map((b) => `• ${b}`).join("\n");
      return [header, desc, bullets].filter(Boolean).join("\n");
    }).join("\n\n");
    sections.push(`VOLUNTEER & COMMUNITY EXPERIENCE\n\n${volText}`);
  }

  // Certifications & Awards
  if (profile.certificationsAndAwards && profile.certificationsAndAwards.length > 0) {
    const certsText = profile.certificationsAndAwards.map((item) => {
      const parts = [
        item.title,
        item.issuer,
        item.date,
        item.credentialId ? `ID: ${item.credentialId}` : ""
      ].filter(Boolean).join(" | ");
      return item.description ? `• ${parts}\n  ${item.description}` : `• ${parts}`;
    }).join("\n");
    sections.push(`CERTIFICATIONS & AWARDS\n${certsText}`);
  }

  // Custom Fields (e.g. Languages, Clearance, etc.)
  if (profile.customFields && profile.customFields.length > 0) {
    const fieldsText = profile.customFields
      .filter((f) => f.label && f.value)
      .map((f) => `• ${f.label}: ${f.value}`)
      .join("\n");
    if (fieldsText) {
      sections.push(`ADDITIONAL DETAILS\n${fieldsText}`);
    }
  }

  // Custom Sections
  if (profile.customSections && profile.customSections.length > 0) {
    profile.customSections.forEach((sec) => {
      if (sec.title && sec.content) {
        sections.push(`${sec.title.toUpperCase()}\n${sec.content}`);
      }
    });
  }

  // Other Info
  if (profile.otherInfo && profile.otherInfo.trim()) {
    sections.push(`ADDITIONAL INFORMATION\n${profile.otherInfo.trim()}`);
  }

  return sections.join("\n\n");
}

/**
 * Intelligent local fallback heuristic resume parser.
 * Accurately extracts contact info, summary, skills, experience, education,
 * certifications, and projects even when Gemini API is offline or quota-limited.
 */
export function parseResumeTextLocally(text: string): Partial<MasterProfile> {
  if (!text || !text.trim()) return {};

  const cleanText = text.replace(/\r\n/g, "\n");
  const rawLines = cleanText.split("\n").map((l) => l.trim());
  const lines = rawLines.filter((l) => l.length > 0);
  if (lines.length === 0) return {};

  const result: Partial<MasterProfile> = {
    rawResumeText: text,
    skills: [],
    experience: [],
    education: [],
    volunteerExperience: [],
    certificationsAndAwards: [],
    customFields: [],
    customSections: []
  };

  // 1. Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (emailMatch) {
    result.email = emailMatch[0].toLowerCase();
  }

  // 2. Phone
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0].trim();
  }

  // 3. LinkedIn
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (linkedinMatch) {
    result.linkedin = `linkedin.com/in/${linkedinMatch[1]}`;
  }

  // 4. GitHub
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  if (githubMatch) {
    result.github = `github.com/${githubMatch[1]}`;
  }

  // 5. Portfolio / Website
  const portfolioMatch = text.match(/(?:https?:\/\/)?([a-zA-Z0-9-]+\.(?:dev|me|io|design|tech|app|com|org))(?:\/[^\s]*)?/i);
  if (portfolioMatch && !portfolioMatch[0].includes("linkedin.com") && !portfolioMatch[0].includes("github.com")) {
    result.portfolio = portfolioMatch[1];
  }

  // 6. Name and Title Heuristics
  // Ignore noise lines at the top like "Curriculum Vitae", "Resume", emails, phones, links
  const headerIgnoreRegex = /^(curriculum vitae|resume|cv|contact|portfolio|page \d|references)/i;
  const nameCandidates: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const l = lines[i];
    if (headerIgnoreRegex.test(l)) continue;
    if (l.includes("@") || l.match(/\d{3}[-.]\d{3}/) || l.includes("linkedin.com")) continue;
    if (l.length >= 2 && l.length <= 60 && !/[;{}[\]\\]/.test(l)) {
      nameCandidates.push(l);
    }
  }

  if (nameCandidates.length > 0) {
    result.fullName = nameCandidates[0].replace(/[|•,].*$/, "").trim();
    if (nameCandidates.length > 1 && !result.title) {
      const candidateTitle = nameCandidates[1].replace(/[|•].*$/, "").trim();
      if (candidateTitle.length < 50 && !candidateTitle.includes(",")) {
        result.title = candidateTitle;
      }
    }
  }

  // 7. Location
  const locationMatch = text.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?|[A-Z][a-zA-Z\s]+,\s*(?:United States|USA|Canada|UK|United Kingdom|Germany|France|India|Australia))/);
  if (locationMatch) {
    result.location = locationMatch[0].trim();
  }

  // 8. Section Segmenter
  // Resume standard section titles
  const sectionKeywords: { key: string; regex: RegExp }[] = [
    { key: "summary", regex: /^(?:professional\s+|executive\s+)?(?:summary|profile|about\s+me|objective)/i },
    { key: "skills", regex: /^(?:core\s+|technical\s+)?(?:skills|technologies|competencies|areas of expertise|tools\s*&\s*tech)/i },
    { key: "experience", regex: /^(?:work|professional|relevant|employment)?\s*(?:experience|history|employment)/i },
    { key: "education", regex: /^(?:education|academic\s+background|degrees|academic\s+history)/i },
    { key: "volunteer", regex: /^(?:volunteer|community|leadership)/i },
    { key: "certifications", regex: /^(?:certifications|licenses|awards|honors|credentials)/i },
    { key: "projects", regex: /^(?:projects|personal\s+projects|key\s+projects|open\s+source)/i },
  ];

  type SectionBlock = { key: string; lines: string[] };
  const sections: SectionBlock[] = [];
  let currentSection: SectionBlock = { key: "header", lines: [] };

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      currentSection.lines.push("");
      continue;
    }

    const matchedSection = sectionKeywords.find((s) => {
      // Header check: Short line, optional colons or dashes
      const testLine = trimmed.replace(/^[\W_]+|[\W_]+$/g, "");
      return testLine.length <= 40 && s.regex.test(testLine);
    });

    if (matchedSection) {
      sections.push(currentSection);
      currentSection = { key: matchedSection.key, lines: [] };
    } else {
      currentSection.lines.push(line);
    }
  }
  sections.push(currentSection);

  // 9. Process Each Section
  for (const sec of sections) {
    const contentLines = sec.lines.map((l) => l.trim()).filter(Boolean);
    if (contentLines.length === 0) continue;

    // --- SUMMARY ---
    if (sec.key === "summary") {
      result.summary = contentLines.join(" ");
    }

    // --- SKILLS ---
    else if (sec.key === "skills") {
      const skillsSet = new Set<string>();
      for (const line of contentLines) {
        // Strip common prefix like "Languages:", "Frontend:", "Technologies:"
        const cleanedLine = line.replace(/^[A-Za-z\s/&]+:\s*/, "");
        const splitItems = cleanedLine.split(/[,•|·;/\t\n]+/).map((s) => s.trim());
        for (const item of splitItems) {
          if (item && item.length > 1 && item.length < 40 && !item.toLowerCase().includes("proficient in")) {
            skillsSet.add(item);
          }
        }
      }
      result.skills = Array.from(skillsSet);
    }

    // --- WORK EXPERIENCE ---
    else if (sec.key === "experience") {
      const experiences: (ExperienceItem & { id: string })[] = [];
      let currentExp: Partial<ExperienceItem> | null = null;

      const datePattern = /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}\s*(?:–|-|to)\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}|Present|Current)/i;

      for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i];
        const isBullet = /^[•\-*–—]\s+/.test(line);
        const hasDates = datePattern.test(line);

        // A new role entry typically has a date range or is a header line without bullet
        if (hasDates && !isBullet) {
          if (currentExp && (currentExp.company || currentExp.role)) {
            experiences.push({
              id: `exp_${experiences.length + 1}_${Date.now()}`,
              company: currentExp.company || "Company",
              role: currentExp.role || "Role",
              startDate: currentExp.startDate || "",
              endDate: currentExp.endDate || "Present",
              location: currentExp.location || "",
              bullets: currentExp.bullets && currentExp.bullets.length > 0 ? currentExp.bullets : ["Executed key initiatives and drove high-impact deliverables."],
              skillsUsed: currentExp.skillsUsed || []
            });
          }

          // Extract date string
          const dateMatch = line.match(datePattern);
          const dateStr = dateMatch ? dateMatch[0] : "";
          const [startD, endD] = dateStr.split(/(?:–|-|\bto\b)/i).map((d) => d.trim());

          // Remainder of the line before/after dates
          const textWithoutDates = line.replace(dateStr, "").replace(/[|•·,–-]/g, " ").trim();
          const parts = textWithoutDates.split(/\s{2,}|\s+[|·]\s+/).filter(Boolean);

          currentExp = {
            startDate: startD || "",
            endDate: endD || "Present",
            role: parts[0] || "",
            company: parts[1] || "",
            bullets: [],
            skillsUsed: []
          };
        } else if (isBullet && currentExp) {
          const cleanBullet = line.replace(/^[•\-*–—]\s+/, "").trim();
          if (cleanBullet) {
            currentExp.bullets = currentExp.bullets || [];
            currentExp.bullets.push(cleanBullet);
          }
        } else if (currentExp) {
          // Additional info line (could be company name if previous was role)
          if (!currentExp.company && line.length < 60) {
            currentExp.company = line;
          } else if (!currentExp.role && line.length < 60) {
            currentExp.role = line;
          } else {
            // Treat as bullet description
            currentExp.bullets = currentExp.bullets || [];
            currentExp.bullets.push(line);
          }
        } else {
          // If no currentExp initialized yet, start one with this title
          currentExp = {
            role: line,
            company: "Company",
            startDate: "",
            endDate: "",
            bullets: [],
            skillsUsed: []
          };
        }
      }

      if (currentExp && (currentExp.company || currentExp.role)) {
        experiences.push({
          id: `exp_${experiences.length + 1}_${Date.now()}`,
          company: currentExp.company || "Company",
          role: currentExp.role || "Role",
          startDate: currentExp.startDate || "",
          endDate: currentExp.endDate || "Present",
          location: currentExp.location || "",
          bullets: currentExp.bullets && currentExp.bullets.length > 0 ? currentExp.bullets : ["Delivered core project milestones and collaborated with cross-functional stakeholders."],
          skillsUsed: currentExp.skillsUsed || []
        });
      }

      if (experiences.length > 0) {
        result.experience = experiences;
      }
    }

    // --- EDUCATION ---
    else if (sec.key === "education") {
      const educations: (EducationItem & { id: string })[] = [];
      const eduLines = contentLines;
      const yearPattern = /\b(19\d{2}|20\d{2})\b/;

      for (let i = 0; i < eduLines.length; i++) {
        const line = eduLines[i];
        if (line.match(/(university|college|institute|school|academy|bachelor|master|phd|b\.s\.|b\.a\.|m\.s\.|m\.b\.a\.)/i)) {
          const yearMatch = line.match(yearPattern);
          const year = yearMatch ? yearMatch[0] : "";
          const degreeMatch = line.match(/(Bachelor|Master|Doctor|Associate|B\.S\.|B\.A\.|M\.S\.|Ph\.D\.|MBA)[^,|•]*/i);

          educations.push({
            id: `edu_${educations.length + 1}_${Date.now()}`,
            institution: line.replace(degreeMatch ? degreeMatch[0] : "", "").replace(year, "").replace(/[|•·,–-]/g, " ").trim() || "University",
            degree: degreeMatch ? degreeMatch[0].trim() : "Degree",
            fieldOfStudy: "",
            graduationYear: year,
            honorsOrDetails: ""
          });
        }
      }
      if (educations.length > 0) {
        result.education = educations;
      }
    }

    // --- CERTIFICATIONS & AWARDS ---
    else if (sec.key === "certifications") {
      const certs: CertificationOrAwardItem[] = [];
      for (const line of contentLines) {
        const clean = line.replace(/^[•\-*–—]\s+/, "").trim();
        if (clean.length > 3) {
          const yearMatch = clean.match(/\b(20\d{2})\b/);
          certs.push({
            id: `cert_${certs.length + 1}_${Date.now()}`,
            title: clean.replace(/\b20\d{2}\b/, "").replace(/[|–-]/g, " ").trim(),
            issuer: "",
            date: yearMatch ? yearMatch[0] : "",
            type: /award|honor|scholarship|fellowship/i.test(clean) ? "award" : "certification"
          });
        }
      }
      if (certs.length > 0) {
        result.certificationsAndAwards = certs;
      }
    }

    // --- PROJECTS / CUSTOM SECTIONS ---
    else if (sec.key === "projects") {
      result.customSections = [
        {
          id: `cs_${Date.now()}`,
          title: "Key Projects",
          content: contentLines.join("\n")
        }
      ];
    }
  }

  // Fallback: If title wasn't found at top, look at the first experience role
  if (!result.title && result.experience && result.experience.length > 0) {
    result.title = result.experience[0].role;
  }

  return result;
}
