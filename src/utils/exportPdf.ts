import { jsPDF } from "jspdf";
import { TailoredResume, CoverLetterData, ExperienceItem } from "../types";
import { sanitizeSignOff, getFormattedCoverLetterDate } from "./coverLetterUtils";
import { formatEducationDetails } from "./masterProfile";

const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;

export interface ResumeScale {
  /** Multiplier on every font size. */
  fontScale: number;
  /** Multiplier on every line advance and gap. */
  spacingScale: number;
}

/**
 * Lays out a resume on a single page and reports where the content ends.
 * With measureOnly the page is made very tall so nothing is cut off, which
 * lets the fitter compare the content height against a real Letter page.
 * Formats according to selected template (Harvard Classic, Modern Tech, Executive, Skills-Forward)
 */
function layoutResumePdf(
  resume: TailoredResume,
  templateIdOrName: string | undefined,
  { fontScale: f, spacingScale: sp }: ResumeScale,
  measureOnly = false
): { doc: jsPDF; endY: number; limitY: number } {
  const doc = new jsPDF({
    unit: "pt",
    format: measureOnly ? [LETTER_WIDTH, 14400] : "letter", // 14400pt is jsPDF's maximum page size
  });

  const tpl = (templateIdOrName || "").toLowerCase();
  const isHarvard = tpl.includes("harvard") || tpl.includes("ivy") || tpl.includes("classic");
  const isTech = tpl.includes("tech") || tpl.includes("engineering") || tpl.includes("modern");
  const isExecutive = tpl.includes("executive") || tpl.includes("leadership") || tpl.includes("c-suite");

  // All resumes are strictly in Times New Roman font
  const fontBody = "times";
  const fontBold = "times";

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = isHarvard ? 40 : 45;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // Track the lowest baseline drawn: the page is full when that line's
  // descenders reach the bottom margin (the trailing gap after it doesn't count).
  let lowestBaseline = 0;
  const drawText = doc.text.bind(doc);
  doc.text = ((text: any, x: any, y: any, ...rest: any[]) => {
    if (typeof y === "number") lowestBaseline = Math.max(lowestBaseline, y);
    return drawText(text, x, y, ...rest);
  }) as typeof doc.text;

  // The resume is always fitted to exactly one page before it is drawn (see
  // fitResumeToOnePage), so there is never a page to break onto.
  const checkPageBreak = (_neededHeight: number = 20) => {};

  // 1. Header
  if (isHarvard) {
    // Centered all-caps Harvard Classic style
    doc.setFont(fontBold, "bold");
    doc.setFontSize(22 * f);
    doc.setTextColor(15, 20, 25);
    doc.text(resume.contactInfo.fullName.toUpperCase(), pageWidth / 2, cursorY, { align: "center" });
    cursorY += 18 * sp;

    if (resume.contactInfo.title) {
      doc.setFont(fontBody, "normal");
      doc.setFontSize(10.5 * f);
      doc.setTextColor(60, 65, 75);
      doc.text(resume.contactInfo.title, pageWidth / 2, cursorY, { align: "center" });
      cursorY += 14 * sp;
    }

    const contactParts = [
      resume.contactInfo.email,
      resume.contactInfo.phone,
      resume.contactInfo.location,
      resume.contactInfo.linkedin,
      resume.contactInfo.portfolio,
    ].filter(Boolean);

    if (contactParts.length > 0) {
      doc.setFont(fontBody, "normal");
      doc.setFontSize(9 * f);
      doc.setTextColor(70, 75, 85);
      doc.text(contactParts.join("   •   "), pageWidth / 2, cursorY, { align: "center" });
      cursorY += 18 * sp;
    }
  } else if (isTech) {
    // Left-aligned Modern Tech style with GitHub/Portfolio callout
    doc.setFont(fontBold, "bold");
    doc.setFontSize(22 * f);
    doc.setTextColor(15, 23, 42);
    doc.text(resume.contactInfo.fullName, margin, cursorY);
    cursorY += 18 * sp;

    if (resume.contactInfo.title) {
      doc.setFont(fontBold, "bold");
      doc.setFontSize(10.5 * f);
      doc.setTextColor(51, 65, 85);
      doc.text(resume.contactInfo.title.toUpperCase(), margin, cursorY);
      cursorY += 14 * sp;
    }

    const contactParts = [
      resume.contactInfo.email,
      resume.contactInfo.phone,
      resume.contactInfo.location,
      resume.contactInfo.linkedin,
      resume.contactInfo.portfolio,
    ].filter(Boolean);

    if (contactParts.length > 0) {
      doc.setFont(fontBody, "normal");
      doc.setFontSize(9 * f);
      doc.setTextColor(100, 116, 139);
      doc.text(contactParts.join("  |  "), margin, cursorY);
      cursorY += 18 * sp;
    }
  } else if (isExecutive) {
    // Executive Leadership Left Banner
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(3);
    doc.line(margin, cursorY - 2 * sp, margin, cursorY + 36 * sp);

    doc.setFont(fontBold, "bold");
    doc.setFontSize(23 * f);
    doc.setTextColor(15, 23, 42);
    doc.text(resume.contactInfo.fullName, margin + 12, cursorY + 12 * sp);

    if (resume.contactInfo.title) {
      doc.setFont(fontBody, "bold");
      doc.setFontSize(10.5 * f);
      doc.setTextColor(71, 85, 105);
      doc.text(resume.contactInfo.title.toUpperCase(), margin + 12, cursorY + 28 * sp);
    }
    cursorY += 46 * sp;

    const contactParts = [
      resume.contactInfo.email,
      resume.contactInfo.phone,
      resume.contactInfo.location,
      resume.contactInfo.linkedin,
    ].filter(Boolean);

    if (contactParts.length > 0) {
      doc.setFont(fontBody, "normal");
      doc.setFontSize(9 * f);
      doc.setTextColor(100, 116, 139);
      doc.text(contactParts.join("   •   "), margin, cursorY);
      cursorY += 18 * sp;
    }
  } else {
    // Standard ATS format
    doc.setFont(fontBold, "bold");
    doc.setFontSize(20 * f);
    doc.setTextColor(20, 24, 33);
    doc.text(resume.contactInfo.fullName, pageWidth / 2, cursorY, { align: "center" });
    cursorY += 18 * sp;

    if (resume.contactInfo.title) {
      doc.setFont(fontBold, "bold");
      doc.setFontSize(10.5 * f);
      doc.setTextColor(60, 65, 80);
      doc.text(resume.contactInfo.title.toUpperCase(), pageWidth / 2, cursorY, { align: "center" });
      cursorY += 14 * sp;
    }

    const contactParts = [
      resume.contactInfo.email,
      resume.contactInfo.phone,
      resume.contactInfo.location,
      resume.contactInfo.linkedin,
      resume.contactInfo.portfolio,
    ].filter(Boolean);

    if (contactParts.length > 0) {
      doc.setFont(fontBody, "normal");
      doc.setFontSize(9 * f);
      doc.setTextColor(90, 95, 110);
      doc.text(contactParts.join("   •   "), pageWidth / 2, cursorY, { align: "center" });
      cursorY += 20 * sp;
    }
  }

  // Section Heading Helper
  const drawSectionHeader = (title: string) => {
    checkPageBreak(35);
    cursorY += 8 * sp;
    doc.setFont(fontBold, "bold");
    doc.setFontSize(10.5 * f);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), margin, cursorY);
    cursorY += 4 * sp;
    doc.setDrawColor(isHarvard ? 40 : 200, isHarvard ? 40 : 205, isHarvard ? 40 : 215);
    doc.setLineWidth(isHarvard ? 1 : 0.75);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 13 * sp;
  };

  // Render Functions for Sections
  const renderSummary = () => {
    if (!resume.summary) return;
    drawSectionHeader(isExecutive ? "Executive Value Proposition" : "Professional Summary");
    doc.setFont(fontBody, "normal");
    doc.setFontSize(9.5 * f);
    doc.setTextColor(40, 45, 55);
    const split = doc.splitTextToSize(resume.summary, contentWidth);
    for (const line of split) {
      checkPageBreak(14);
      doc.text(line, margin, cursorY);
      cursorY += 13 * sp;
    }
  };

  const renderSkills = () => {
    if (!resume.skillsCategories || resume.skillsCategories.length === 0) return;
    drawSectionHeader(isTech ? "Technical Stack & Core Skills" : "Core Competencies & Skills");
    for (const cat of resume.skillsCategories) {
      checkPageBreak(16);
      doc.setFont(fontBold, "bold");
      doc.setFontSize(9.5 * f);
      doc.setTextColor(30, 35, 45);
      const prefix = `${cat.category}: `;
      const pWidth = doc.getTextWidth(prefix);
      doc.text(prefix, margin, cursorY);

      doc.setFont(fontBody, "normal");
      doc.setTextColor(50, 55, 65);
      const split = doc.splitTextToSize(cat.skills.join(", "), contentWidth - pWidth);
      if (split.length > 0) {
        doc.text(split[0], margin + pWidth, cursorY);
        cursorY += 13 * sp;
        for (let i = 1; i < split.length; i++) {
          checkPageBreak(14);
          doc.text(split[i], margin + 10, cursorY);
          cursorY += 13 * sp;
        }
      } else {
        cursorY += 13 * sp;
      }
    }
  };

  // Jobs and community roles share one layout: role + dates, organization + location, bullets.
  const renderRoleList = (title: string, roles: ExperienceItem[]) => {
    if (roles.length === 0) return;
    drawSectionHeader(title);
    for (const exp of roles) {
      checkPageBreak(30);
      doc.setFont(fontBold, "bold");
      doc.setFontSize(10 * f);
      doc.setTextColor(15, 23, 42);
      doc.text(exp.role, margin, cursorY);

      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      if (dates) {
        doc.setFont(fontBody, "normal");
        doc.setFontSize(9 * f);
        doc.setTextColor(100, 116, 139);
        doc.text(dates, pageWidth - margin, cursorY, { align: "right" });
      }
      cursorY += 13 * sp;

      doc.setFont(fontBold, isHarvard ? "italic" : "bold");
      doc.setFontSize(9.5 * f);
      doc.setTextColor(51, 65, 85);
      doc.text(exp.company, margin, cursorY);

      if (exp.location) {
        doc.setFont(fontBody, "italic");
        doc.setFontSize(9 * f);
        doc.setTextColor(100, 116, 139);
        doc.text(exp.location, pageWidth - margin, cursorY, { align: "right" });
      }
      cursorY += 13 * sp;

      doc.setFont(fontBody, "normal");
      doc.setFontSize(9.5 * f);
      doc.setTextColor(45, 50, 60);

      for (const bullet of exp.bullets) {
        checkPageBreak(18);
        const bIndent = 12;
        const split = doc.splitTextToSize(bullet, contentWidth - bIndent);
        doc.text("•", margin + 2, cursorY);
        for (let i = 0; i < split.length; i++) {
          if (i > 0) checkPageBreak(13);
          doc.text(split[i], margin + bIndent, cursorY);
          cursorY += 12.5 * sp;
        }
        cursorY += 2.5 * sp;
      }
      cursorY += 4 * sp;
    }
  };

  const renderExperience = () =>
    renderRoleList(isExecutive ? "Executive Leadership Experience" : "Professional Experience", resume.experience || []);

  const renderCommunity = () =>
    renderRoleList(
      "Community & Volunteer Experience",
      (resume.community || []).map((c) => ({ ...c, company: c.organization }))
    );

  const renderEducation = () => {
    if (!resume.education || resume.education.length === 0) return;
    drawSectionHeader("Education");
    for (const edu of resume.education) {
      checkPageBreak(25);
      doc.setFont(fontBold, "bold");
      doc.setFontSize(10 * f);
      doc.setTextColor(15, 23, 42);
      const deg = edu.degree + (edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : "");
      doc.text(deg, margin, cursorY);

      if (edu.graduationYear) {
        doc.setFont(fontBody, "normal");
        doc.setFontSize(9 * f);
        doc.setTextColor(100, 116, 139);
        doc.text(edu.graduationYear, pageWidth - margin, cursorY, { align: "right" });
      }
      cursorY += 13 * sp;

      doc.setFont(fontBody, "normal");
      doc.setFontSize(9.5 * f);
      doc.setTextColor(60, 65, 75);
      let inst = edu.institution;
      const details = formatEducationDetails(edu);
      if (details) inst += ` (${details})`;
      // GPA plus honors can outrun one line, so wrap instead of clipping.
      const instLines = doc.splitTextToSize(inst, contentWidth);
      instLines.forEach((line: string, i: number) => {
        if (i > 0) checkPageBreak(12);
        doc.text(line, margin, cursorY);
        cursorY += (i === instLines.length - 1 ? 14 : 12) * sp;
      });
    }
  };

  const renderProjects = () => {
    if (!resume.projects || resume.projects.length === 0) return;
    drawSectionHeader(isTech ? "Key Engineering Projects" : "Notable Projects");
    for (const proj of resume.projects) {
      checkPageBreak(24);
      doc.setFont(fontBold, "bold");
      doc.setFontSize(10 * f);
      doc.setTextColor(15, 23, 42);
      doc.text(proj.name, margin, cursorY);

      if (proj.technologies && proj.technologies.length > 0) {
        doc.setFont(fontBody, "italic");
        doc.setFontSize(8.5 * f);
        doc.setTextColor(80, 90, 110);
        doc.text(`[${proj.technologies.join(", ")}]`, pageWidth - margin, cursorY, { align: "right" });
      }
      cursorY += 12 * sp;

      doc.setFont(fontBody, "normal");
      doc.setFontSize(9 * f);
      doc.setTextColor(50, 55, 65);
      const split = doc.splitTextToSize(proj.description, contentWidth);
      for (const line of split) {
        checkPageBreak(13);
        doc.text(line, margin, cursorY);
        cursorY += 12 * sp;
      }
      cursorY += 4 * sp;
    }
  };

  const renderCertifications = () => {
    if (!resume.certifications || resume.certifications.length === 0) return;
    drawSectionHeader("Certifications");
    doc.setFont(fontBody, "normal");
    doc.setFontSize(9 * f);
    doc.setTextColor(50, 55, 65);
    for (const cert of resume.certifications) {
      checkPageBreak(14);
      doc.text(`•  ${cert}`, margin + 2, cursorY);
      cursorY += 13 * sp;
    }
  };

  // Order of Sections according to template
  if (isHarvard) {
    // Harvard Classic: Education prominent upfront!
    renderEducation();
    renderExperience();
    renderProjects();
    renderCommunity();
    renderSkills();
    renderCertifications();
  } else if (isTech) {
    // Modern Tech: Skills matrix first upfront!
    renderSkills();
    renderExperience();
    renderProjects();
    renderCommunity();
    renderEducation();
    renderCertifications();
  } else {
    // Executive / Skills-forward / Standard
    renderSummary();
    renderSkills();
    renderExperience();
    renderProjects();
    renderCommunity();
    renderEducation();
    renderCertifications();
  }

  // Times descenders reach about a quarter of the body size below the baseline.
  return { doc, endY: lowestBaseline + 2.5 * f, limitY: LETTER_HEIGHT - margin };
}

// Readable bounds: body text stays between ~9pt and ~11.4pt.
const MIN_FONT_SCALE = 0.95;
const MAX_FONT_SCALE = 1.2;
const MAX_SPACING_SCALE = 1.6;

export interface FittedResume {
  /** The resume as it will appear on the page (lowest-priority bullets removed if needed). */
  resume: TailoredResume;
  scale: ResumeScale;
  /** How much of the page the content fills, 0-1. Below ~0.97 means there wasn't enough real content. */
  fill: number;
  /** Content removed to fit the page, least relevant first. */
  removed: string[];
}

/**
 * Drops the single least important piece of content, or returns null if
 * nothing sensible is left to drop. Bullets are assumed to be ordered most
 * relevant first within each role, and roles most recent first. Transferable
 * content (community roles, transferable projects) goes before anything
 * directly relevant to the job.
 */
function dropLeastImportant(resume: TailoredResume): { resume: TailoredResume; removed: string } | null {
  const r: TailoredResume = JSON.parse(JSON.stringify(resume));
  r.experience = r.experience || [];

  // The role with the most bullets gives one up; ties go to the older role.
  const trimBullet = (floor: number) => {
    let target = -1;
    r.experience.forEach((exp, i) => {
      if (exp.bullets.length > floor && (target < 0 || exp.bullets.length >= r.experience[target].bullets.length)) {
        target = i;
      }
    });
    if (target < 0) return null;
    const removed = r.experience[target].bullets.pop()!;
    return { resume: r, removed };
  };

  // Least relevant community role first: its bullets, then the role itself.
  const trimCommunity = () => {
    const last = r.community?.[r.community.length - 1];
    if (!last) return null;
    if (last.bullets.length > 1) return { resume: r, removed: last.bullets.pop()! };
    r.community!.pop();
    return { resume: r, removed: `Community: ${last.role}, ${last.organization}` };
  };

  const dropProject = (transferableOnly: boolean) => {
    const projects = r.projects || [];
    for (let i = projects.length - 1; i >= 0; i--) {
      if (!transferableOnly || projects[i].transferable) {
        const [proj] = projects.splice(i, 1);
        return { resume: r, removed: `Project: ${proj.name}` };
      }
    }
    return null;
  };

  const step =
    trimCommunity() ??
    dropProject(true) ??
    trimBullet(2) ??
    dropProject(false) ??
    trimBullet(1) ??
    (r.certifications && r.certifications.length > 0 ? { resume: r, removed: r.certifications.pop()! } : null) ??
    (r.experience.length > 1 ? { resume: r, removed: `Role: ${r.experience.pop()!.role}` } : null);
  return step;
}

/**
 * Fits a resume to exactly one Letter page: fonts and spacing scale up to
 * fill the page, down to fit it, and if the content still overflows at the
 * smallest readable size the least relevant bullets are removed. Nothing is
 * ever added, so a short profile can end up filling less than a page.
 */
export function fitResumeToOnePage(resume: TailoredResume, templateIdOrName?: string): FittedResume {
  const endOf = (r: TailoredResume, fontScale: number, spacingScale: number) => {
    const { endY, limitY } = layoutResumePdf(r, templateIdOrName, { fontScale, spacingScale }, true);
    return { endY, limitY };
  };
  const fits = (r: TailoredResume, f: number, s: number) => {
    const { endY, limitY } = endOf(r, f, s);
    return endY <= limitY;
  };

  // 1. Trim until the content fits at the smallest readable size.
  let current = resume;
  const removed: string[] = [];
  while (!fits(current, MIN_FONT_SCALE, MIN_FONT_SCALE)) {
    const next = dropLeastImportant(current);
    if (!next) break;
    current = next.resume;
    removed.push(next.removed);
  }

  // 2. Grow fonts and spacing together as far as the page allows.
  const largest = (lo: number, hi: number, ok: (x: number) => boolean) => {
    if (ok(hi)) return hi;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      if (ok(mid)) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const fontScale = largest(MIN_FONT_SCALE, MAX_FONT_SCALE, (x) => fits(current, x, x));

  // 3. Font growth stops where the next step would wrap another line, so
  //    stretch the spacing (which is continuous) to take up what's left.
  const spacingScale = largest(fontScale, MAX_SPACING_SCALE, (x) => fits(current, fontScale, x));

  const { endY, limitY } = endOf(current, fontScale, spacingScale);
  return {
    resume: current,
    scale: { fontScale, spacingScale },
    // Share of the space between the top and bottom margins that is used.
    fill: Math.min(1, (endY - (LETTER_HEIGHT - limitY)) / (limitY - (LETTER_HEIGHT - limitY))),
    removed,
  };
}

/**
 * Export Tailored Resume to an ATS-optimized PDF of exactly one page.
 */
export function exportResumeToPdf(
  resume: TailoredResume,
  filename: string = "Tailored_Resume.pdf",
  templateIdOrName?: string
): void {
  buildResumePdf(resume, templateIdOrName).doc.save(filename);
}

/** The fitted one-page resume PDF, without saving it. */
export function buildResumePdf(resume: TailoredResume, templateIdOrName?: string) {
  const fitted = fitResumeToOnePage(resume, templateIdOrName);
  const { doc, endY, limitY } = layoutResumePdf(fitted.resume, templateIdOrName, fitted.scale);
  return { doc, fitted, endY, limitY };
}

/**
 * Export Cover Letter to Professional PDF
 */
export function exportCoverLetterToPdf(
  letter: CoverLetterData,
  filename: string = "Cover_Letter.pdf"
): void {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const checkPageBreak = (neededHeight: number = 20) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  // Applicant Name
  if (letter.applicant) {
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(20, 25, 35);
    doc.text(letter.applicant.name, margin, cursorY);
    cursorY += 18;

    const contactParts = [
      letter.applicant.email,
      letter.applicant.phone,
      letter.applicant.location,
    ].filter(Boolean);

    if (contactParts.length > 0) {
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90, 95, 105);
      doc.text(contactParts.join("  |  "), margin, cursorY);
      cursorY += 12;
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.75);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 20;
    }
  }

  // Date
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 65, 75);
  doc.text(getFormattedCoverLetterDate(letter.date), margin, cursorY);
  cursorY += 22;

  // Recipient info
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 35, 45);
  doc.text(letter.recipient.hiringManagerTitle || "Hiring Team", margin, cursorY);
  cursorY += 14;

  doc.setFont("times", "normal");
  doc.text(letter.recipient.company, margin, cursorY);
  cursorY += 22;

  // Salutation
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text(letter.salutation, margin, cursorY);
  cursorY += 18;

  // Paragraph printer helper
  const printParagraph = (text: string) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 45, 55);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      checkPageBreak(15);
      doc.text(line, margin, cursorY);
      cursorY += 15;
    }
    cursorY += 10;
  };

  printParagraph(letter.openingParagraph);
  for (const para of letter.bodyParagraphs) {
    printParagraph(para);
  }
  printParagraph(letter.closingParagraph);

  // Sign off
  checkPageBreak(40);
  cursorY += 8;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40, 45, 55);
  doc.text(sanitizeSignOff(letter.signOff, letter.applicant?.name), margin, cursorY);
  cursorY += 20;

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 25, 35);
  doc.text(letter.applicant?.name || "Applicant", margin, cursorY);

  doc.save(filename);
}
