import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Safely parses JSON by stripping out markdown blocks if present.
 */
export const parseCleanJson = <T>(content: string): T => {
  let cleaned = content.trim();
  if (cleaned.startsWith("\`\`\`json")) {
    cleaned = cleaned.replace(/^\`\`\`json\n?/, "");
  } else if (cleaned.startsWith("\`\`\`")) {
    cleaned = cleaned.replace(/^\`\`\`\n?/, "");
  }
  if (cleaned.endsWith("\`\`\`")) {
    cleaned = cleaned.replace(/\n?\`\`\`$/, "");
  }
  return JSON.parse(cleaned) as T;
};
