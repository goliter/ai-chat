import NextAuth from "next-auth";
import { ZodError } from "zod";
import Credentials from "next-auth/providers/credentials";
import { signInSchema } from "@/lib/zod";
import { getUserFromDb } from "@/lib/db";
import { compareSync } from "bcrypt-ts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        try {
          console.log("开始解析表单数据...");
          const { email, password } = await signInSchema.parseAsync(
            credentials
          );
          console.log(`解析得到的邮箱: ${email}, 密码: ${password}`);

          console.log("开始从数据库获取用户信息...");
          const user = await getUserFromDb(email);
          console.log("从数据库获取的用户信息:", user);

          if (!user) {
            console.log("用户未找到，抛出错误");
            throw new Error("user not found.");
          }

          if (!compareSync(password, user.password)) {
            console.log("密码哈希不匹配，抛出错误");
            throw new Error("password error.");
          }

          console.log("用户验证通过，返回用户信息");
          return user;
        } catch (error) {
          if (error instanceof ZodError) {
            console.log("表单数据验证失败，返回 null");
            return null;
          }
          console.log("发生其他错误，返回 null:", error);
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
