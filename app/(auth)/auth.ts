import NextAuth from "next-auth";
import { ZodError } from "zod";
import Credentials from "next-auth/providers/credentials";
import { signInSchema } from "@/lib/zod";
import { getUserFromDb } from "@/lib/db";
import { compareSync } from "bcrypt-ts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 添加信任主机配置
  trustHost: true,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // 根据部署环境设置域名
        domain:
          process.env.NODE_ENV === "production"
            ? process.env.DOMAIN
            : "localhost",
      },
    },
  },

  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        try {
          const { email, password } = await signInSchema.parseAsync(
            credentials
          );
          const user = await getUserFromDb(email);

          if (!user || !compareSync(password, user.password)) {
            // 抛出明确错误信息
            throw new Error("邮箱或密码错误");
          }

          // 返回符合NextAuth要求的用户对象
          return {
            id: user.id,
            email: user.email,
          };
        } catch (error) {
          if (error instanceof ZodError) {
            throw new Error("无效的表单数据格式");
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 初次登录时 user 会存在，将 user.id 写入 token 中
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // 将 token 中的 id 写入 session 中，这样前端就可以通过 session.user.id 获取到
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
