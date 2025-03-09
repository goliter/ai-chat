import { hash } from "bcrypt-ts";

// 盐值生成的成本，通常为10-12之间
const SALT_ROUNDS = 10;

/**
 * 哈希密码并添加盐值
 * @param password - 需要哈希的密码
 * @returns 哈希后的密码
 */

export async function saltAndHashPassword(password: string): Promise<string> {
  try {
    // 生成盐并哈希密码
    const hashedPassword = await hash(password, SALT_ROUNDS);
    return hashedPassword;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    throw new Error("密码哈希失败");
  }
}
