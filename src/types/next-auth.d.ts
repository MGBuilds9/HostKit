import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "owner" | "manager";
    } & DefaultSession["user"];
  }
}
