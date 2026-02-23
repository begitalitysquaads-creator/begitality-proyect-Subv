import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("Missing GEMINI_API_KEY environment variable. AI features will not work.");
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Modelo solicitado por el usuario: gemini-3-flash-preview
 * API Version: v1beta
 */
export const chatModel = genAI.getGenerativeModel(
  { model: "gemini-3-flash-preview" },
  { apiVersion: "v1beta" }
);

export const embeddingModel = genAI.getGenerativeModel(
  { model: "text-embedding-004" },
  { apiVersion: "v1beta" }
);
