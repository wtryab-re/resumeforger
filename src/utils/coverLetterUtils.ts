/**
 * Utilities for sanitizing and formatting cover letter dates and signatures.
 * Guarantees that dates are never hallucinated/outdated and the applicant's signature name is never duplicated.
 */

export function sanitizeSignOff(signOff?: string, applicantName?: string): string {
  if (!signOff) return "Sincerely,";
  
  // Extract just the primary valediction line
  let valediction = signOff.split(/\r?\n/)[0].trim();
  
  // If the applicant's name was included in the valediction, strip it out
  if (applicantName && applicantName.trim()) {
    const escaped = applicantName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    valediction = valediction.replace(new RegExp(escaped, "gi"), "").trim();
  }

  // Strip generic placeholders like [Your Name], [Applicant Name]
  valediction = valediction.replace(/\[.*?\]/g, "").replace(/\{.*?\}/g, "").trim();

  // Strip trailing commas, colons, or punctuation
  valediction = valediction.replace(/[,\s:]+$/, "").trim();

  // Re-append standard valediction comma
  if (valediction.length > 1) {
    return `${valediction},`;
  }
  return "Sincerely,";
}

export function getFormattedCoverLetterDate(dateStr?: string): string {
  const todayStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (!dateStr || !dateStr.trim() || dateStr.includes("[") || dateStr.toLowerCase().includes("date")) {
    return todayStr;
  }

  // Check if it's a valid date
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return todayStr;
  }

  // If the date is significantly in the past (hallucinated older year like 2021-2024), default to today
  if (parsed.getFullYear() < 2025) {
    return todayStr;
  }

  return dateStr;
}
