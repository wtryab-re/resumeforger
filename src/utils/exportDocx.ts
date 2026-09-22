import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  LineRuleType,
  TabStopType,
} from "docx";
import { TailoredResume, CoverLetterData, ExperienceItem } from "../types";
import { sanitizeSignOff, getFormattedCoverLetterDate } from "./coverLetterUtils";
import { formatEducationDetails } from "./masterProfile";
import type { ResumeScale } from "./exportPdf";

/**
 * Trigger browser file download from Blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Tailored Resume to ATS-Compliant Microsoft Word (.docx)
 * ATS Rules: Standard clean headings, no multi-column tables, standard bullet points.
 *
 * The document mirrors the one-page PDF layout point for point: the same
 * fitted content, section order, font sizes and US Letter margins, with exact
 * line heights equal to the PDF's line advances. Word's Times New Roman has
 * the same character widths as the PDF's Times, so lines wrap the same way
 * and the document fills one page like the PDF does.
 */
export async function exportResumeToDocx(
  resume: TailoredResume,
  filename: string = "Tailored_Resume.docx",
  templateIdOrName?: string,
  scale: ResumeScale = { fontScale: 1, spacingScale: 1 }
): Promise<void> {
  const { contactInfo, summary, skillsCategories, experience, education, projects, community, certifications } = resume;
  const { fontScale: f, spacingScale: sp } = scale;

  const tpl = (templateIdOrName || "").toLowerCase();
  const isHarvard = tpl.includes("harvard") || tpl.includes("ivy") || tpl.includes("classic");
  const isTech = tpl.includes("tech") || tpl.includes("engineering") || tpl.includes("modern");
  const isExecutive = tpl.includes("executive") || tpl.includes("leadership") || tpl.includes("c-suite");

  // Units: TextRun sizes are half-points, spacing and indents are twips (1/20 pt).
  const PAGE_WIDTH_PT = 612;
  const PAGE_HEIGHT_PT = 792;
  const marginPt = isHarvard ? 40 : 45;
  const contentWidthTw = (PAGE_WIDTH_PT - marginPt * 2) * 20;
  const tw = (pt: number) => Math.round(pt * 20);
  const run = (text: string, pt: number, opts: { bold?: boolean; italics?: boolean; color?: string } = {}) =>
    new TextRun({ text, size: Math.round(pt * f * 2), font: "Times New Roman", ...opts });

  type Align = (typeof AlignmentType)[keyof typeof AlignmentType];
  /** A paragraph whose every line is exactly `advancePt` tall, like a PDF line advance. */
  const para = (
    runs: TextRun[],
    advancePt: number,
    extra: { after?: number; align?: Align; indent?: { left: number; hanging: number }; rightTab?: boolean } = {}
  ) =>
    new Paragraph({
      alignment: extra.align,
      spacing: {
        line: tw(advancePt * sp),
        lineRule: LineRuleType.EXACT,
        after: tw((extra.after || 0) * sp),
      },
      indent: extra.indent,
      tabStops: extra.rightTab ? [{ type: TabStopType.RIGHT, position: contentWidthTw }] : undefined,
      children: runs,
    });

  const children: Paragraph[] = [];

  // Header
  const centered = isHarvard || (!isTech && !isExecutive);
  const align = centered ? AlignmentType.CENTER : undefined;
  const contactParts = [
    contactInfo.email,
    contactInfo.phone,
    contactInfo.location,
    contactInfo.linkedin,
    isExecutive ? "" : contactInfo.portfolio,
  ].filter(Boolean) as string[];

  if (isHarvard) {
    children.push(para([run(contactInfo.fullName.toUpperCase(), 22, { bold: true, color: "0F1419" })], 18, { align }));
    if (contactInfo.title) children.push(para([run(contactInfo.title, 10.5, { color: "3C414B" })], 14, { align }));
  } else if (isExecutive) {
    children.push(para([run(contactInfo.fullName, 23, { bold: true, color: "0F172A" })], 28));
    if (contactInfo.title) children.push(para([run(contactInfo.title.toUpperCase(), 10.5, { bold: true, color: "475569" })], 18));
  } else {
    children.push(para([run(contactInfo.fullName, isTech ? 22 : 20, { bold: true, color: "0F172A" })], 18, { align }));
    if (contactInfo.title) children.push(para([run(contactInfo.title.toUpperCase(), 10.5, { bold: true, color: "334155" })], 14, { align }));
  }
  if (contactParts.length > 0) {
    children.push(
      para([run(contactParts.join(isTech ? "  |  " : "   •   "), 9, { color: "5A5F6E" })], centered && !isHarvard ? 20 : 18, { align })
    );
  }

  // Section heading: 8pt gap, the title, a rule 4pt below it, then 13pt to the next line.
  const heading = (title: string) =>
    new Paragraph({
      spacing: { before: tw(8 * sp), after: tw(13 * sp), line: tw(4 * sp + 9 * f), lineRule: LineRuleType.EXACT },
      border: {
        bottom: { color: isHarvard ? "282828" : "C8CDD7", space: 1, style: BorderStyle.SINGLE, size: isHarvard ? 8 : 6 },
      },
      children: [run(title.toUpperCase(), 10.5, { bold: true, color: "0F172A" })],
    });

  const renderSummary = () => {
    if (!summary) return;
    children.push(heading(isExecutive ? "Executive Value Proposition" : "Professional Summary"));
    children.push(para([run(summary, 9.5, { color: "282D37" })], 13));
  };

  const renderSkills = () => {
    if (!skillsCategories || skillsCategories.length === 0) return;
    children.push(heading(isTech ? "Technical Stack & Core Skills" : "Core Competencies & Skills"));
    for (const cat of skillsCategories) {
      children.push(
        para([run(`${cat.category}: `, 9.5, { bold: true, color: "1E232D" }), run(cat.skills.join(", "), 9.5, { color: "323741" })], 13, {
          indent: { left: tw(10), hanging: tw(10) },
        })
      );
    }
  };

  // Jobs and community roles share one layout, as in the PDF.
  const renderRoleList = (title: string, roles: ExperienceItem[]) => {
    if (roles.length === 0) return;
    children.push(heading(title));
    for (const exp of roles) {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      children.push(
        para([run(exp.role, 10, { bold: true, color: "0F172A" }), ...(dates ? [run(`\t${dates}`, 9, { color: "64748B" })] : [])], 13, {
          rightTab: true,
        })
      );
      children.push(
        para(
          [
            run(exp.company, 9.5, { bold: !isHarvard, italics: isHarvard, color: "334155" }),
            ...(exp.location ? [run(`\t${exp.location}`, 9, { italics: true, color: "64748B" })] : []),
          ],
          13,
          { rightTab: true }
        )
      );
      exp.bullets.forEach((bullet, i) => {
        children.push(
          para([run(`•\t${bullet}`, 9.5, { color: "2D323C" })], 12.5, {
            indent: { left: tw(12), hanging: tw(10) },
            after: 2.5 + (i === exp.bullets.length - 1 ? 4 : 0),
          })
        );
      });
    }
  };

  const renderExperience = () =>
    renderRoleList(isExecutive ? "Executive Leadership Experience" : "Professional Experience", experience || []);

  const renderCommunity = () =>
    renderRoleList("Community & Volunteer Experience", (community || []).map((c) => ({ ...c, company: c.organization })));

  const renderEducation = () => {
    if (!education || education.length === 0) return;
    children.push(heading("Education"));
    for (const edu of education) {
      const degree = edu.degree + (edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : "");
      children.push(
        para([run(degree, 10, { bold: true, color: "0F172A" }), ...(edu.graduationYear ? [run(`\t${edu.graduationYear}`, 9, { color: "64748B" })] : [])], 13, {
          rightTab: true,
        })
      );
      const details = formatEducationDetails(edu);
      children.push(para([run(edu.institution + (details ? ` (${details})` : ""), 9.5, { color: "3C414B" })], 12, { after: 2 }));
    }
  };

  const renderProjects = () => {
    if (!projects || projects.length === 0) return;
    children.push(heading(isTech ? "Key Engineering Projects" : "Notable Projects"));
    for (const proj of projects) {
      const tech = proj.technologies && proj.technologies.length > 0 ? `\t[${proj.technologies.join(", ")}]` : "";
      children.push(
        para([run(proj.name, 10, { bold: true, color: "0F172A" }), ...(tech ? [run(tech, 8.5, { italics: true, color: "505A6E" })] : [])], 12, {
          rightTab: true,
        })
      );
      children.push(para([run(proj.description, 9, { color: "323741" })], 12, { after: 4 }));
    }
  };

  const renderCertifications = () => {
    if (!certifications || certifications.length === 0) return;
    children.push(heading("Certifications"));
    for (const cert of certifications) {
      children.push(para([run(`•  ${cert}`, 9, { color: "323741" })], 13));
    }
  };

  // Same section order as the PDF for each template.
  if (isHarvard) {
    renderEducation();
    renderExperience();
    renderProjects();
    renderCommunity();
    renderSkills();
    renderCertifications();
  } else if (isTech) {
    renderSkills();
    renderExperience();
    renderProjects();
    renderCommunity();
    renderEducation();
    renderCertifications();
  } else {
    renderSummary();
    renderSkills();
    renderExperience();
    renderProjects();
    renderCommunity();
    renderEducation();
    renderCertifications();
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: tw(PAGE_WIDTH_PT), height: tw(PAGE_HEIGHT_PT) }, // US Letter, like the PDF
            margin: { top: tw(marginPt), right: tw(marginPt), bottom: tw(marginPt), left: tw(marginPt) },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}

/**
 * Export Cover Letter to Microsoft Word (.docx)
 */
export async function exportCoverLetterToDocx(
  letter: CoverLetterData,
  filename: string = "Cover_Letter.docx"
): Promise<void> {
  const children: Paragraph[] = [];

  // Applicant Info Header
  if (letter.applicant) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: letter.applicant.name,
            bold: true,
            size: 28, // 14pt
            font: "Times New Roman",
          }),
        ],
      })
    );

    const contactParts = [
      letter.applicant.email,
      letter.applicant.phone,
      letter.applicant.location,
    ].filter(Boolean);

    if (contactParts.length > 0) {
      children.push(
        new Paragraph({
          spacing: { after: 240 },
          border: {
            bottom: {
              color: "CCCCCC",
              space: 2,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          children: [
            new TextRun({
              text: contactParts.join("  |  "),
              size: 19,
              color: "666666",
              font: "Times New Roman",
            }),
          ],
        })
      );
    }
  }

  // Date
  children.push(
    new Paragraph({
      spacing: { before: 180, after: 180 },
      children: [
        new TextRun({
          text: getFormattedCoverLetterDate(letter.date),
          size: 21,
          font: "Times New Roman",
        }),
      ],
    })
  );

  // Recipient info
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: letter.recipient.hiringManagerTitle || "Hiring Team",
          bold: true,
          size: 21,
          font: "Times New Roman",
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: letter.recipient.company,
          size: 21,
          font: "Times New Roman",
        }),
      ],
    })
  );

  // Salutation
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: letter.salutation,
          size: 21,
          font: "Times New Roman",
        }),
      ],
    })
  );

  // Opening Paragraph
  children.push(
    new Paragraph({
      spacing: { after: 160, line: 320 },
      children: [
        new TextRun({
          text: letter.openingParagraph,
          size: 21,
          font: "Times New Roman",
        }),
      ],
    })
  );

  // Body Paragraphs
  letter.bodyParagraphs.forEach((para) => {
    children.push(
      new Paragraph({
        spacing: { after: 160, line: 320 },
        children: [
          new TextRun({
            text: para,
            size: 21,
            font: "Times New Roman",
          }),
        ],
      })
    );
  });

  // Closing Paragraph
  children.push(
    new Paragraph({
      spacing: { after: 240, line: 320 },
      children: [
        new TextRun({
          text: letter.closingParagraph,
          size: 21,
          font: "Times New Roman",
        }),
      ],
    })
  );

  // Sign off
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: sanitizeSignOff(letter.signOff, letter.applicant?.name),
          size: 21,
          font: "Times New Roman",
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: letter.applicant?.name || "Applicant",
          bold: true,
          size: 21,
          font: "Times New Roman",
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1200,
              right: 1200,
              bottom: 1200,
              left: 1200,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}
