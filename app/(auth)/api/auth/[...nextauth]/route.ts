import { handlers } from "@/app/(auth)/auth"; // Referring to the auth.ts we just created
export const { GET, POST } = handlers;
export const runtime = "edge"; // optional
