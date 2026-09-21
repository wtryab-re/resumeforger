import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { TailoredResume, CoverLetterData } from "../types";
import { sanitizeSignOff, getFormattedCoverLetterDate } from "./coverLetterUtils";

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
 */
export async function exportResumeToDocx(
  resume: TailoredResume,
  filename: string = "Tailored_Resume.docx"
): Promise<void> {
  const { contactInfo, summary, skillsCategories, experience, education, projects, certifications } = resume;

  // Contact line elements
  const contactParts: string[] = [];
  if (contactInfo.email) contactParts.push(contactInfo.email);
  if (contactInfo.phone) contactParts.push(contactInfo.phone);
  if (contactInfo.location) contactParts.push(contactInfo.location);
  if (contactInfo.linkedin) contactParts.push(contactInfo.linkedin);
  if (contactInfo.portfolio) contactParts.push(contactInfo.portfolio);

  const children: Paragraph[] = [];

  // Header: Full Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: contactInfo.fullName,
          bold: true,
          size: 36, // 18pt
          font: "Times New Roman",
        }),
      ],
    })
  );

  // Subtitle / Target Title
  if (contactInfo.title) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: contactInfo.title.toUpperCase(),
            bold: true,
            size: 22, // 11pt
            color: "333333",
            font: "Times New Roman",
          }),
        ],
      })
    );
  }

  // Contact Info Line
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: contactParts.join("  |  "),
            size: 19, // 9.5pt
            color: "555555",
            font: "Times New Roman",
          }),
        ],
      })
    );
  }

  // Helper for Section Heading
  const createSectionHeading = (title: string): Paragraph => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
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
          text: title.toUpperCase(),
          bold: true,
          size: 24, // 12pt
          color: "111111",
          font: "Times New Roman",
        }),
      ],
    });
  };

  // 1. Professional Summary
  if (summary) {
    children.push(createSectionHeading("Professional Summary"));
    children.push(
      new Paragraph({
        spacing: { after: 200, line: 300 },
        children: [
          new TextRun({
            text: summary,
            size: 21, // 10.5pt
            font: "Times New Roman",
          }),
        ],
      })
    );
  }

  // 2. Core Competencies / Technical Skills
  if (skillsCategories && skillsCategories.length > 0) {
    children.push(createSectionHeading("Core Competencies & Technical Skills"));
    skillsCategories.forEach((cat) => {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `${cat.category}: `,
              bold: true,
              size: 21,
              font: "Times New Roman",
            }),
            new TextRun({
              text: cat.skills.join(", "),
              size: 21,
              font: "Times New Roman",
            }),
          ],
        })
      );
    });
  }

  // 3. Professional Experience
  if (experience && experience.length > 0) {
    children.push(createSectionHeading("Professional Experience"));
    experience.forEach((exp) => {
      // Role & Company line
      const dateLoc = [exp.startDate, exp.endDate].filter(Boolean).join(" – ") + 
        (exp.location ? ` | ${exp.location}` : "");

      children.push(
        new Paragraph({
          spacing: { before: 140, after: 40 },
          children: [
            new TextRun({
              text: exp.role,
              bold: true,
              size: 22,
              font: "Times New Roman",
            }),
            new TextRun({
              text: ` – ${exp.company}`,
              size: 22,
              font: "Times New Roman",
            }),
          ],
        })
      );

      if (dateLoc) {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: dateLoc,
                italics: true,
                size: 19,
                color: "666666",
                font: "Times New Roman",
              }),
            ],
          })
        );
      }

      // Bullets
      exp.bullets.forEach((bullet) => {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60, line: 280 },
            children: [
              new TextRun({
                text: bullet,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          })
        );
      });
    });
  }

  // 4. Education
  if (education && education.length > 0) {
    children.push(createSectionHeading("Education"));
    education.forEach((edu) => {
      const field = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : "";
      const year = edu.graduationYear ? ` | ${edu.graduationYear}` : "";
      const loc = edu.location ? ` | ${edu.location}` : "";

      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: `${edu.degree}${field}`,
              bold: true,
              size: 21,
              font: "Times New Roman",
            }),
            new TextRun({
              text: ` – ${edu.institution}${loc}${year}`,
              size: 21,
              font: "Times New Roman",
            }),
          ],
        })
      );

      if (edu.honorsOrDetails) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: edu.honorsOrDetails,
                italics: true,
                size: 19,
                color: "666666",
                font: "Times New Roman",
              }),
            ],
          })
        );
      }
    });
  }

  // 5. Projects
  if (projects && projects.length > 0) {
    children.push(createSectionHeading("Key Projects"));
    projects.forEach((proj) => {
      const techStr = proj.technologies && proj.technologies.length > 0 ? ` [${proj.technologies.join(", ")}]` : "";
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: proj.name,
              bold: true,
              size: 21,
              font: "Times New Roman",
            }),
            new TextRun({
              text: techStr,
              italics: true,
              size: 19,
              color: "555555",
              font: "Times New Roman",
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: proj.description,
              size: 20,
              font: "Times New Roman",
            }),
          ],
        })
      );
    });
  }

  // 6. Certifications
  if (certifications && certifications.length > 0) {
    children.push(createSectionHeading("Certifications"));
    certifications.forEach((cert) => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: cert,
              size: 20,
              font: "Times New Roman",
            }),
          ],
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: children,
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
