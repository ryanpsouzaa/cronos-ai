import { GoogleGenAI } from "@google/genai";
import { env } from "../env/index.js";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export async function embedText(text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: "models/gemini-embedding-001",
    contents: text,
    config: { outputDimensionality: 768 },
  });
  return result.embeddings![0]!.values!;
}

export async function generateText(prompt: string): Promise<string> {
  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
  });
  return result.text ?? "";
}
