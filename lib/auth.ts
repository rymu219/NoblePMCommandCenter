import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

/*
 * Lightweight session-cookie auth. Email + password sign-in, bcrypted
 * password hash, a server-side Session record looked up by an opaque
 * cookie token. v1 — production swap to NextAuth comes in a later
 * phase.
 */

const COOKIE_NAME = "noble_session";
const SESSION_DAYS = 30;

export type AuthRole = "admin" | "engineer" | "viewer";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  department: string;
}

function newToken(): string {
  return randomBytes(32).toString("hex");
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active) throw new Error("Invalid credentials.");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("Invalid credentials.");

  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  const c = await cookies();
  c.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as AuthRole,
    department: user.department,
  };
}

export async function signOut() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  c.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as AuthRole,
    department: session.user.department,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("Not signed in.");
  return u;
}

export async function requireRole(roles: AuthRole[]): Promise<AuthUser> {
  const u = await requireUser();
  if (!roles.includes(u.role)) throw new Error("Forbidden.");
  return u;
}
