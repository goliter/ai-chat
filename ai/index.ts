import { createOpenAI } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";
import { ragMiddleware } from "./ragMiddleware";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const customModel = wrapLanguageModel({
  model: openai("gpt-4o-mini"),
  middleware: ragMiddleware,
});