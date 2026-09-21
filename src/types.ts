export type ApplicationStatus = 
  | "Saved"
  | "Tailoring"
  | "Applied"
  | "Interviewing"
  | "Offered"
  | "Rejected";

export interface ContactInfo {
  fullName: string;
  title: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
}

export interface SkillsCategory {
  category: string;
  skills: string[];
}

export interface ExperienceItem {
  id?: string;
  company: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
  skillsUsed?: string[];
}

export interface EducationItem {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  location?: string;
  graduationYear?: string;
  honorsOrDetails?: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  technologies?: string[];
  link?: string;
}

export interface VolunteerItem {
  id: string;
  organization: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  bullets?: string[];
}

export interface CertificationOrAwardItem {
  id: string;
  title: string;
  issuer: string;
  date?: string;
  type: "certification" | "award" | "honor" | "license";
  credentialId?: string;
  url?: string;
  description?: string;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface CustomSection {
  id: string;
  title: string;
  content: string; // multi-line text or bullet points
}

/**
 * Items owned by the master profile always carry a stable local id so the
 * editor can address a single row. Items parsed out of an AI response do not,
 * which is why ExperienceItem.id / EducationItem.id stay optional.
 */
export type ProfileExperienceItem = ExperienceItem & { id: string };
export type ProfileEducationItem = EducationItem & { id: string };

export interface MasterProfile {
  id: string;
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github?: string;
  avatarUrl?: string; // photo base64 data URL or avatar URL
  summary: string;
  skills: string[]; // array of skills or tags
  experience: ProfileExperienceItem[];
  education: ProfileEducationItem[];
  volunteerExperience: VolunteerItem[];
  certificationsAndAwards: CertificationOrAwardItem[];
  otherInfo?: string;
  notes?: string;
  customFields: CustomField[];
  customSections: CustomSection[];
  rawResumeText?: string;
  uploadedFileName?: string;
  lastUpdated: string;
}

export interface TailoredResume {
  contactInfo: ContactInfo;
  summary: string;
  skillsCategories: SkillsCategory[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects?: ProjectItem[];
  certifications?: string[];
  fontFamily?: string;
}

export interface ScannerTip {
  category: string;
  tip: string;
  impact: "high" | "medium" | "low";
  isSatisfied: boolean;
}

export interface AtsAnalysis {
  overallScore: number;
  matchRate: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  criticalSkills: {
    hardSkills: string[];
    softSkills: string[];
  };
  scannerTips: ScannerTip[];
  strengths: string[];
  recommendations: string[];
}

export interface TailoringChange {
  section: string;
  change: string;
  reason: string;
}

export interface CoverLetterRecipient {
  hiringManagerTitle?: string;
  company: string;
  department?: string;
}

export interface CoverLetterApplicant {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
}

export interface KeyMatchHighlight {
  jobRequirement: string;
  addressedHow: string;
}

export interface CoverLetterData {
  applicant?: CoverLetterApplicant;
  recipient: CoverLetterRecipient;
  date: string;
  salutation: string;
  openingParagraph: string;
  bodyParagraphs: string[];
  closingParagraph: string;
  signOff: string;
  fullLetterText: string;
  keyMatchesHighlighted: KeyMatchHighlight[];
  fontFamily?: string;
}

export interface JobApplication {
  id: string;
  company: string;
  roleTitle: string;
  jobUrl?: string;
  location?: string;
  salary?: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  appliedDate?: string;
  
  jobDescription: string;
  originalResume: string;
  
  tailoredResume?: TailoredResume;
  atsAnalysis?: AtsAnalysis;
  tailoringChanges?: TailoringChange[];
  coverLetter?: CoverLetterData;
  templateUsed?: string;
  
  notes?: string;
  tags?: string[];
}

export interface ApiKeyConfig {
  encryptedKey: string;
  maskedKey: string;
  isCustom: boolean;
  lastTested?: string;
  isValid?: boolean;
}
