import { createOpenAI } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";
import { ragMiddleware } from "./ragMiddleware";

const openai = createOpenAI({
  baseURL: "https://oneapi.isea.site/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

export const customModel = wrapLanguageModel({
  model: openai("gpt-4o-mini"),
  middleware: ragMiddleware,
});