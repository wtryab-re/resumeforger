import { jsPDF } from "jspdf";
import { TailoredResume, CoverLetterData } from "../types";
import { sanitizeSignOff, getFormattedCoverLetterDate } from "./coverLetterUtils";
import { formatEducationDetails } from "./masterProfile";

/**
 * Export Tailored Resume to ATS-Optimized PDF
 * Formats according to selected template (Harvard Classic, Modern Tech, Executive, Skills-Forward)
 */
export function exportResumeToPdf(
  resume: TailoredResume,
  filename: string = "Tailored_Resume.pdf",
  templateIdOrName?: string
): void {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
  });

  const tpl = (templateIdOrName || "").toLowerCase();
  const isHarvard = tpl.includes("harvard") || tpl.includes("ivy") || tpl.includes("classic");
  const isTech = tpl.includes("tech") || tpl.includes("engineering") || tpl.includes("modern");
  const isExecutive = tpl.includes("executive") || tpl.includes("leadership") || tpl.includes("c-suite");

  // All resumes are strictly in Times New Roman font
  const fontBody = "times";
  const fontBold = "times";

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = isHarvard ? 40 : 45;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const checkPageBreak = (neededHeight: number = 20) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  // 1. Header
  if (isHarvard) {
    // Centered all-caps Harvard Classic style
    doc.setFont(fontBold, "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 20, 25);
    doc.text(resume.contactInfo.fullName.toUpperCase(), pageWidth / 2, cursorY, { align: "center" });
    cursorY += 18;

    if (resume.contactInfo.title) {
      doc.setFont(fontBody, "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(60, 65, 75);
      doc.text(resume.contactInfo.title, pageWidth / 2, cursorY, { align: "center" });
      cursorY += 14;
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
      doc.setFontSize(9);
      doc.setTextColor(70, 75, 85);
      doc.text(contactParts.join("   •   "), pageWidth / 2, cursorY, { align: "center" });
      cursorY += 18;
    }
  } else if (isTech) {
    // Left-aligned Modern Tech style with GitHub/Portfolio callout
    doc.setFont(fontBold, "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text(resume.contactInfo.fullName, margin, cursorY);
    cursorY += 18;

    if (resume.contactInfo.title) {
      doc.setFont(fontBold, "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
      doc.text(resume.contactInfo.title.toUpperCase(), margin, cursorY);
      cursorY += 14;
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
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(contactParts.join("  |  "), margin, cursorY);
      cursorY += 18;
    }
  } else if (isExecutive) {
    // Executive Leadership Left Banner
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(3);
    doc.line(margin, cursorY - 2, margin, cursorY + 36);

    doc.setFont(fontBold, "bold");
    doc.setFontSize(23);
    doc.setTextColor(15, 23, 42);
    doc.text(resume.contactInfo.fullName, margin + 12, cursorY + 12);

    if (resume.contactInfo.title) {
      doc.setFont(fontBody, "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(71, 85, 105);
      doc.text(resume.contactInfo.title.toUpperCase(), margin + 12, cursorY + 28);
    }
    cursorY += 46;

    const contactParts = [
      resume.contactInfo.email,
      resume.contactInfo.phone,
      resume.contactInfo.location,
      resume.contactInfo.linkedin,
    ].filter(Boolean);

    if (contactParts.length > 0) {
      doc.setFont(fontBody, "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(contactParts.join("   •   "), margin, cursorY);
      cursorY += 18;
    }
  } else {
    // Standard ATS format
    doc.setFont(fontBold, "bold");
    doc.setFontSize(20);
    doc.setTextColor(20, 24, 33);
    doc.text(resume.contactInfo.fullName, pageWidth / 2, cursorY, { align: "center" });
    cursorY += 18;

    if (resume.contactInfo.title) {
      doc.setFont(fontBold, "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(60, 65, 80);
      doc.text(resume.contactInfo.title.toUpperCase(), pageWidth / 2, cursorY, { align: "center" });
      cursorY += 14;
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
      doc.setFontSize(9);
      doc.setTextColor(90, 95, 110);
      doc.text(contactParts.join("   •   "), pageWidth / 2, cursorY, { align: "center" });
      cursorY += 20;
    }
  }

  // Section Heading Helper
  const drawSectionHeader = (title: string) => {
    checkPageBreak(35);
    cursorY += 8;
    doc.setFont(fontBold, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), margin, cursorY);
    cursorY += 4;
    doc.setDrawColor(isHarvard ? 40 : 200, isHarvard ? 40 : 205, isHarvard ? 40 : 215);
    doc.setLineWidth(isHarvard ? 1 : 0.75);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 13;
  };

  // Render Functions for Sections
  const renderSummary = () => {
    if (!resume.summary) return;
    drawSectionHeader(isExecutive ? "Executive Value Proposition" : "Professional Summary");
    doc.setFont(fontBody, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(40, 45, 55);
    const split = doc.splitTextToSize(resume.summary, contentWidth);
    for (const line of split) {
      checkPageBreak(14);
      doc.text(line, margin, cursorY);
      cursorY += 13;
    }
  };

  const renderSkills = () => {
    if (!resume.skillsCategories || resume.skillsCategories.length === 0) return;
    drawSectionHeader(isTech ? "Technical Stack & Core Skills" : "Core Competencies & Skills");
    for (const cat of resume.skillsCategories) {
      checkPageBreak(16);
      doc.setFont(fontBold, "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 35, 45);
      const prefix = `${cat.category}: `;
      const pWidth = doc.getTextWidth(prefix);
      doc.text(prefix, margin, cursorY);

      doc.setFont(fontBody, "normal");
      doc.setTextColor(50, 55, 65);
      const split = doc.splitTextToSize(cat.skills.join(", "), contentWidth - pWidth);
      if (split.length > 0) {
        doc.text(split[0], margin + pWidth, cursorY);
        cursorY += 13;
        for (let i = 1; i < split.length; i++) {
          checkPageBreak(14);
          doc.text(split[i], margin + 10, cursorY);
          cursorY += 13;
        }
      } else {
        cursorY += 13;
      }
    }
  };

  const renderExperience = () => {
    if (!resume.experience || resume.experience.length === 0) return;
    drawSectionHeader(isExecutive ? "Executive Leadership Experience" : "Professional Experience");
    for (const exp of resume.experience) {
      checkPageBreak(30);
      doc.setFont(fontBold, "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(exp.role, margin, cursorY);

      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      if (dates) {
        doc.setFont(fontBody, "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(dates, pageWidth - margin, cursorY, { align: "right" });
      }
      cursorY += 13;

      doc.setFont(fontBold, isHarvard ? "italic" : "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(exp.company, margin, cursorY);

      if (exp.location) {
        doc.setFont(fontBody, "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(exp.location, pageWidth - margin, cursorY, { align: "right" });
      }
      cursorY += 13;

      doc.setFont(fontBody, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(45, 50, 60);

      for (const bullet of exp.bullets) {
        checkPageBreak(18);
        const bIndent = 12;
        const split = doc.splitTextToSize(bullet, contentWidth - bIndent);
        doc.text("•", margin + 2, cursorY);
        for (let i = 0; i < split.length; i++) {
          if (i > 0) checkPageBreak(13);
          doc.text(split[i], margin + bIndent, cursorY);
          cursorY += 12.5;
        }
        cursorY += 2.5;
      }
      cursorY += 4;
    }
  };

  const renderEducation = () => {
    if (!resume.education || resume.education.length === 0) return;
    drawSectionHeader("Education");
    for (const edu of resume.education) {
      checkPageBreak(25);
      doc.setFont(fontBold, "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const deg = edu.degree + (edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : "");
      doc.text(deg, margin, cursorY);

      if (edu.graduationYear) {
        doc.setFont(fontBody, "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(edu.graduationYear, pageWidth - margin, cursorY, { align: "right" });
      }
      cursorY += 13;

      doc.setFont(fontBody, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 65, 75);
      let inst = edu.institution;
      const details = formatEducationDetails(edu);
      if (details) inst += ` (${details})`;
      // GPA plus honors can outrun one line, so wrap instead of clipping.
      const instLines = doc.splitTextToSize(inst, contentWidth);
      instLines.forEach((line: string, i: number) => {
        if (i > 0) checkPageBreak(12);
        doc.text(line, margin, cursorY);
        cursorY += i === instLines.length - 1 ? 14 : 12;
      });
    }
  };

  const renderProjects = () => {
    if (!resume.projects || resume.projects.length === 0) return;
    drawSectionHeader(isTech ? "Key Engineering Projects" : "Notable Projects");
    for (const proj of resume.projects) {
      checkPageBreak(24);
      doc.setFont(fontBold, "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(proj.name, margin, cursorY);

      if (proj.technologies && proj.technologies.length > 0) {
        doc.setFont(fontBody, "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(80, 90, 110);
        doc.text(`[${proj.technologies.join(", ")}]`, pageWidth - margin, cursorY, { align: "right" });
      }
      cursorY += 12;

      doc.setFont(fontBody, "normal");
      doc.setFontSize(9);
      doc.setTextColor(50, 55, 65);
      const split = doc.splitTextToSize(proj.description, contentWidth);
      for (const line of split) {
        checkPageBreak(13);
        doc.text(line, margin, cursorY);
        cursorY += 12;
      }
      cursorY += 4;
    }
  };

  const renderCertifications = () => {
    if (!resume.certifications || resume.certifications.length === 0) return;
    drawSectionHeader("Certifications");
    doc.setFont(fontBody, "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 55, 65);
    for (const cert of resume.certifications) {
      checkPageBreak(14);
      doc.text(`•  ${cert}`, margin + 2, cursorY);
      cursorY += 13;
    }
  };

  // Order of Sections according to template
  if (isHarvard) {
    // Harvard Classic: Education prominent upfront!
    renderEducation();
    renderExperience();
    renderProjects();
    renderSkills();
    renderCertifications();
  } else if (isTech) {
    // Modern Tech: Skills matrix first upfront!
    renderSkills();
    renderExperience();
    renderProjects();
    renderEducation();
    renderCertifications();
  } else {
    // Executive / Skills-forward / Standard
    renderSummary();
    renderSkills();
    renderExperience();
    renderProjects();
    renderEducation();
    renderCertifications();
  }

  doc.save(filename);
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
