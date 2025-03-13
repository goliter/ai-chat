import { auth } from "@/app/(auth)/auth";
import { createOpenAI } from "@ai-sdk/openai";
import { LanguageModelV1Middleware, embed, generateObject, generateText } from "ai";
import { z } from "zod";
import {
  getKnowledgeBasesByChatId,
  searchRelevantChunks,
} from "@/lib/db";
interface KnowledgeChunk {
  id: string;
  content: string;
  knowledgeBaseId: string;
  similarity: number;
}

const openai = createOpenAI({
  baseURL: "https://oneapi.isea.site/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

const idSchema = z.object({
  files: z.object({
    id: z.string(),
  }),
});

const embeddingModel = openai.embedding("text-embedding-3-small");

export const ragMiddleware: LanguageModelV1Middleware = {
  transformParams: async (options) => {
    const { params } = options;
    const session = await auth();
    if (!session) return params;

    const { prompt: messages, providerMetadata } = params;

    const { success, data } = idSchema.safeParse(providerMetadata);
    if (!success) return params;

    const chatId = data.files.id;

    try {
      // 1. 获取最后一条用户消息
      if (messages.length === 0) return params;
      const recentMessage = messages.pop();

      if (!recentMessage || recentMessage.role !== "user") {
        if (recentMessage) {
          messages.push(recentMessage);
        }
        return params;
      }
      const lastUserMessageContent = recentMessage.content
        .filter((content) => content.type === "text")
        .map((content) => content.text)
        .join("\n");

      const { object: classification } = await generateObject({
        model: openai("gpt-4o-mini", { structuredOutputs: true }),
        output: "enum",
        enum: ["question", "statement", "other"],
        system: "classify the user message as a question, statement, or other",
        prompt: lastUserMessageContent,
      });
      // 只有当用户的消息被分类为“question”时，才会对消息列表进行修改，否则将保持原始的消息列表不变。
      if (classification !== "question") {
        messages.push(recentMessage);
        return params;
      }

      // 2. 获取关联知识库
      const knowledgeBases = await getKnowledgeBasesByChatId(chatId);
      const kbIds = knowledgeBases.map((kb) => kb.knowledgeBase.id);
      if (kbIds.length === 0) return params;

      // 3.  先生成假设性答案，用其生成查询嵌入
      const { text: hypotheticalAnswer } = await generateText({
        model: openai("gpt-4o-mini", { structuredOutputs: true }),
        system: "Answer the users question:",
        prompt: lastUserMessageContent,
      });

      const { embedding: hypotheticalAnswerEmbedding } = await embed({
        model: embeddingModel,
        value: hypotheticalAnswer,
      });

      // 4. 检索相关chunk（取前5个）
      const chunks = (await searchRelevantChunks(
        kbIds,
        hypotheticalAnswerEmbedding,
        5
      )) as KnowledgeChunk[];

        messages.push({
          role: "user",
          content: [
            ...recentMessage.content,
            {
              type: "text",
              text: "Here is some relevant information that you can use to answer the question:",
            },
            ...chunks.map((chunk) => ({
              type: "text" as const,
              text: chunk.content,
            })),
          ],
        });

      return { ...params, prompt: messages };
    } catch (error) {
      console.error("RAG中间件错误:", error);
      return params;
    }
  },
};
