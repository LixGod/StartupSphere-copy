let groqClient: any = null

export function getGroqClient() {
  if (!process.env.GROQ_API_KEY) return null
  if (!groqClient) {
    const Groq = require("groq-sdk")
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groqClient
}

export const groq = getGroqClient()

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
