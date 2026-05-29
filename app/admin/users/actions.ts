"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { USER_DEPARTMENTS, USER_ROLES } from "@/lib/status";

const DEFAULT_PASSWORD = "nobleplastics";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROLE_VALUES = USER_ROLES.map((r) => r.value);
const DEPT_VALUES = USER_DEPARTMENTS.map((d) => d.value);

function back(error: string): never {
  redirect(`/admin/users?error=${encodeURIComponent(error)}`);
}

function parseRate(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function createUserAction(formData: FormData) {
  const actor = await requireRole(["admin"]);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "viewer");
  const department = String(formData.get("department") ?? "engineering");
  const title = String(formData.get("title") ?? "").trim() || null;
  const hourlyRate = parseRate(String(formData.get("hourlyRate") ?? ""));

  if (!name) back("Name is required.");
  if (!EMAIL_RE.test(email)) back("A valid email is required.");
  if (!ROLE_VALUES.includes(role)) back("Invalid role.");
  if (!DEPT_VALUES.includes(department)) back("Invalid department.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) back(`A user with email ${email} already exists.`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const created = await prisma.user.create({
    data: { name, email, role, department, title, hourlyRate, passwordHash, active: true },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      entityType: "User",
      entityId: created.id,
      action: "create",
      after: JSON.stringify({ name, email, role, department, title }),
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=created");
}

export async function updateUserAction(formData: FormData) {
  const actor = await requireRole(["admin"]);

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "viewer");
  const department = String(formData.get("department") ?? "engineering");
  const title = String(formData.get("title") ?? "").trim() || null;
  const hourlyRate = parseRate(String(formData.get("hourlyRate") ?? ""));
  const active = formData.get("active") === "on";

  if (!id) back("Missing user id.");
  if (!name) back("Name is required.");
  if (!EMAIL_RE.test(email)) back("A valid email is required.");
  if (!ROLE_VALUES.includes(role)) back("Invalid role.");
  if (!DEPT_VALUES.includes(department)) back("Invalid department.");

  // Email must stay unique across other users.
  const clash = await prisma.user.findFirst({ where: { email, NOT: { id } } });
  if (clash) back(`Another user already uses ${email}.`);

  await prisma.user.update({
    where: { id },
    data: { name, email, role, department, title, hourlyRate, active },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      entityType: "User",
      entityId: id,
      action: "update",
      after: JSON.stringify({ name, email, role, department, title, active }),
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=updated");
}

export async function resetUserPasswordAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  if (!id) back("Missing user id.");

  // Reset to the standard default; the person changes it after signing in.
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  // Drop existing sessions so the old password can't ride along.
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      entityType: "User",
      entityId: id,
      action: "reset_password",
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?ok=password");
}
