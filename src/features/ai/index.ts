// AI extension points (NOT used in the MVP). Every AI capability must stay a
// recommendation tool: it may rank, suggest or flag, but never makes the final
// hiring decision. Implementations plug in behind these interfaces.

export type CvAnalysis = { skills: string[]; professionSlugs: string[]; summary: string; suggestions: string[] };

export interface AiProvider {
  /** 1–2. CV analysis & skills extraction */
  analyzeCv(text: string): Promise<CvAnalysis>;
  /** 3. Job description analysis (required skills, experience, red flags) */
  analyzeVacancy(text: string): Promise<{ skills: string[]; experienceYears?: number; warnings: string[] }>;
  /** 7. Professional category suggestion */
  suggestProfessions(text: string): Promise<string[]>;
  /** 8. Uzbek / Russian / English translation */
  translate(text: string, to: "uz" | "ru" | "en"): Promise<string>;
  /** 9–10. Duplicate vacancy, spam and fraud likelihood (0..1) */
  riskScore(text: string): Promise<{ spam: number; fraud: number; duplicateOf?: string }>;
}

/** Null provider: the platform works fully without AI. */
export const noAiProvider: AiProvider = {
  async analyzeCv() {
    return { skills: [], professionSlugs: [], summary: "", suggestions: [] };
  },
  async analyzeVacancy() {
    return { skills: [], warnings: [] };
  },
  async suggestProfessions() {
    return [];
  },
  async translate(text) {
    return text;
  },
  async riskScore() {
    return { spam: 0, fraud: 0 };
  },
};

export function getAiProvider(): AiProvider {
  return noAiProvider;
}
