import { Prisma, PrismaClient } from "@prisma/client";
import { Role } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
const prisma = new PrismaClient();

export default prisma;
// 创建用户
export async function createUser(email: string, password: string) {
  try {
    const newUser = await prisma.user.create({
      data: {
        email,
        password,
      },
    });
    console.log("User created:", newUser);
    return newUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}


// 查找用户（通过 email）
export async function getUserFromDb(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
  });
}


// ----- 聊天相关操作 -----
// 根据用户ID获取用户的聊天记录（同时包含消息和关联的知识库信息）
export async function getUserChats(userId: string) {
  return await prisma.chat.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      messages: {
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
      knowledgeBases: {
        select: {
          knowledgeBase: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// 创建聊天对话，可以同时关联多个知识库（传入知识库ID数组）
export async function createChat(
  userId: string,
  title: string,
  knowledgeBaseIds: string[] = []
) {
  // 检查用户是否存在
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`User with id ${userId} does not exist.`);
  }

  // 构造 data 对象，仅在 knowledgeBaseIds 不为空时包含关联操作
  const data = {
    userId,
    title,
    ...(knowledgeBaseIds.length > 0 && {
      knowledgeBases: {
        create: knowledgeBaseIds.map((id) => ({
          knowledgeBase: { connect: { id } },
        })),
      },
    }),
  };

  return await prisma.chat.create({
    data,
    include: {
      knowledgeBases: {
        include: { knowledgeBase: true },
      },
    },
  });
}


// 删除聊天对话（级联删除关联的 Message 和 ChatKnowledgeBase）
export async function deleteChat(chatId: string, userId: string) {
  // 验证所有权
  const kb = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!kb || kb.userId !== userId) {
    throw new Error("chat不存在或无权操作");
  }
  return await prisma.chat.delete({
    where: { id: chatId },
  });
}

// 通过 chatId 查找关联的知识库
export async function getKnowledgeBasesByChatId(chatId: string) {
  return await prisma.chatKnowledgeBase.findMany({
    where: { chatId },
    include: {
      knowledgeBase: true,
    },
  });
}

// 通过 chatId 查找聊天，并为其创建消息
export async function createMessage(chatId: string, role: Role, content: string) {
  // 首先查找聊天是否存在
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat) {
    throw new Error(`Chat with id ${chatId} not found`);
  }

  // 创建消息记录
  return await prisma.message.create({
    data: {
      chatId,
      role, // 'user' 或 'ai'
      content,
    },
  });
}

// 通过 chatId 查找chat
export async function getChatById(chatId: string) {
  return await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      messages: true,
      knowledgeBases: {
        include: { knowledgeBase: true },
      },
    },
  });
}

// 获取用户所有知识库（含文件列表）
export const getUserKnowledgeBases = async (userId: string) => {
  return await prisma.knowledgeBase.findMany({
    where: { userId },
    include: {
      files: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};

// 创建知识库
export const createKnowledgeBase = async (userId: string, name: string) => {
  return await prisma.knowledgeBase.create({
    data: {
      name,
      title: name, // 将 title 设置为与 name 相同
      user: { connect: { id: userId } },
    },
  });
};

// 删除知识库（级联删除关联文件）
export const deleteKnowledgeBase = async (
  knowledgeBaseId: string,
  userId: string
) => {
  // 验证所有权
  const kb = await prisma.knowledgeBase.findUnique({
    where: { id: knowledgeBaseId }
  });

  if (!kb || kb.userId !== userId) {
    throw new Error("知识库不存在或无权操作");
  }

  return await prisma.knowledgeBase.delete({
    where: { id: knowledgeBaseId }
  });
};

// 上传文件记录到数据库
export const createFileRecord = async (fileData: {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  knowledgeBaseId: string; // 保留这个参数用于逻辑处理
}) => {
  return await prisma.knowledgeFile.create({
    data: {
      fileName: fileData.fileName,
      filePath: fileData.filePath,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType,
      knowledgeBase: {
        connect: { id: fileData.knowledgeBaseId }, // 通过 connect 建立关联
      },
    },
  });
};

// 删除文件记录
export const deleteFileRecord = async (
  fileId: string,
  userId: string
) => {
  // 验证所有权
  const file = await prisma.knowledgeFile.findUnique({
    where: { id: fileId },
    include: { knowledgeBase: true }
  });

  if (!file || file.knowledgeBase.userId !== userId) {
    throw new Error("文件不存在或无权操作");
  }

  return await prisma.knowledgeFile.delete({
    where: { id: fileId }
  });
};

export async function getKnowledgeBaseById(id: string) {
  return prisma.knowledgeBase.findUnique({
    where: { id },
  });
}

export async function getFilesByKnowledgeBaseId(knowledgeBaseId: string) {
  return prisma.knowledgeFile.findMany({
    where: { knowledgeBaseId },
  });
}

export async function createChunkRecordRaw(data: {
  knowledgeBaseId: string;
  content: string;
  embedding: number[];
}) {
  try {
    const id = uuidv4();
    await prisma.$executeRaw`
      INSERT INTO "KnowledgeChunk" 
      ("id", "knowledgeBaseId", "content", "embedding", "createdAt")
      VALUES (${id}, ${data.knowledgeBaseId}, ${data.content}, ${data.embedding}::vector(1536), NOW())
    `;
    return { id, ...data };
  } catch (error) {
    console.error("创建知识块记录失败:", error);
    throw new Error("无法创建知识块记录");
  }
}

export async function searchRelevantChunks(
  knowledgeBaseIds: string[],
  queryEmbedding: number[],
  limit: number
) {
  return prisma.$queryRaw`
    SELECT 
      kc.id,
      kc.content,
      kc."knowledgeBaseId",
      kc.embedding <=> ${queryEmbedding}::vector as similarity
    FROM "KnowledgeChunk" kc
    WHERE kc."knowledgeBaseId" IN (${Prisma.join(knowledgeBaseIds)})
    ORDER BY similarity ASC
    LIMIT ${limit}
  `;
}