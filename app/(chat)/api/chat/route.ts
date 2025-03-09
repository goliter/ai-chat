import { auth } from "@/app/(auth)/auth";
import { streamText } from "ai";
import { customModel } from "@/ai";
import { createMessage } from "@/lib/db";


export async function POST(req: Request) {
  const { id, messages } = await req.json();

  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  await createMessage(id, "user", messages[messages.length - 1].content);

  try{
    const result = streamText({
    model: customModel,
    messages,
    experimental_providerMetadata: {
      files: {
        id: id
      },
    },
    onFinish: async ({ text }) => {
      await createMessage(id, "assistant", text);
    },
    });
    return result.toDataStreamResponse();
  } catch (error) {
     console.error("AI处理失败:", error);
     return new Response("AI服务暂时不可用", { status: 503 });
  }
}
