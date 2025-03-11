"use server";

import { createUser, getUserFromDb } from "@/lib/db";
import { signIn } from "./auth";
import { saltAndHashPassword } from "@/app/utils/password";

export interface LoginActionState {
  status: "idle" | "in_progress" | "success" | "failed";
}

export const login = async (
  data: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });
    
    return { status: "success" } as LoginActionState;
  } catch {
    return { status: "failed" } as LoginActionState;
  }
};

export interface RegisterActionState {
  status: "idle" | "in_progress" | "success" | "failed" | "user_exists";
}

export const register = async (
  data: RegisterActionState,
  formData: FormData
) => {
  const email = formData.get("email") as string;
  const rawPassword = formData.get("password") as string; // 保留原始密码
  // 对密码进行哈希，以达到不存明文密码的目的
  const password = await saltAndHashPassword(
    formData.get("password") as string
  );

  const user = await getUserFromDb(email);

  // 检查从数据库中获取的用户信息，如果用户存在且邮箱有值，则表示用户已存在
  if (user?.email) {
    console.log("User already exists");
    return { status: "user_exists" } as RegisterActionState;
  } else {
    await createUser(email, password);
    await signIn("credentials", {
      email,
      password: rawPassword,
      redirect: false,
    });
    return { status: "success" } as RegisterActionState;
  }
};
