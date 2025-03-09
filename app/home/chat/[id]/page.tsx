import { Chat as PreviewChat } from "@/components/chat";
import { getChatById } from "@/lib/db";
import { auth } from "@/app/(auth)/auth";
import { notFound, redirect } from "next/navigation";
import { Chat, Message } from "@prisma/client";

type ChatWithMessages = Chat & {
  messages: Message[];
};

export default async function Page({
  params: rawParams,
}: {
  params: { id: string };
}) {
  const params = await rawParams; // 先解析 params
  // 执行身份验证
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  if (!params || !params.id) {
    notFound();
  }

  const { id: chatId } = params;

  // 从数据库中获取chat
  const chatFromDb = await getChatById(chatId);
  const knowledges = (chatFromDb?.knowledgeBases || []).map(
    (kb) => kb.knowledgeBase
  );
  if (!chatFromDb) {
    notFound();
  }

  const chat: ChatWithMessages = {
    ...chatFromDb,
    messages: chatFromDb.messages as Message[],
  };

  return (
    <PreviewChat
      id={chat.id}
      title={chat.title}
      initialMessages={chat.messages}
      knowledges={knowledges}
    />
  );
}
