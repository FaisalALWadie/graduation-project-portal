import { GoogleGenerativeAI } from "@google/generative-ai";

// gemini-2.0-flash is deprecated on newer API keys; this account's key
// only has access starting from the 3.x line, confirmed by a direct
// test call. Kept as a named export so it's a one-line change if a
// newer stable model needs to replace it.
const MODEL = "gemini-3.6-flash";

export async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}
