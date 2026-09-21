/**
 * Lazy facade over the PDF and DOCX exporters.
 *
 * jspdf and docx together are the largest dependencies in the app, and they are
 * only needed the moment someone clicks Export. Importing them through dynamic
 * import() keeps both out of the initial bundle — including for visitors who
 * never get past the landing page — at the cost of one short load on first use.
 *
 * Components should import from here rather than from ./exportPdf or
 * ./exportDocx directly; a static import anywhere pulls the library back into
 * the main chunk and undoes the split.
 */

import type { CoverLetterData, TailoredResume } from "../types";

const loadPdf = () => import("./exportPdf");
const loadDocx = () => import("./exportDocx");

export async function exportResumeToPdf(
  resume: TailoredResume,
  filename?: string,
  templateIdOrName?: string
): Promise<void> {
  const { exportResumeToPdf: run } = await loadPdf();
  run(resume, filename, templateIdOrName);
}

export async function exportResumeToDocx(
  resume: TailoredResume,
  filename?: string
): Promise<void> {
  const { exportResumeToDocx: run } = await loadDocx();
  await run(resume, filename);
}

export async function exportCoverLetterToPdf(
  letter: CoverLetterData,
  filename?: string
): Promise<void> {
  const { exportCoverLetterToPdf: run } = await loadPdf();
  run(letter, filename);
}

export async function exportCoverLetterToDocx(
  letter: CoverLetterData,
  filename?: string
): Promise<void> {
  const { exportCoverLetterToDocx: run } = await loadDocx();
  await run(letter, filename);
}
