import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const USER_COOKIE_NAME = "eng2_board_session";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "eng2-multi-board-secret-key-2026";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export function createSessionToken(userId: number): string {
  const payload = `uid:${userId}`;
  const hmac = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${hmac}`;
}

export function verifySessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload.startsWith("uid:")) return null;
  const userId = Number(payload.slice(4));
  if (Number.isNaN(userId)) return null;

  const expectedHmac = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedHmac);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return userId;
  } catch {
    return null;
  }
}

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  department: string;
  role: string;
  isSuspended: boolean;
  suspendedUntil: Date | null;
  suspendReason: string | null;
}

export function checkUserSuspension(user: SessionUser): {
  suspended: boolean;
  message: string;
} {
  if (!user.isSuspended) {
    return { suspended: false, message: "" };
  }
  if (user.suspendedUntil && new Date(user.suspendedUntil) < new Date()) {
    return { suspended: false, message: "" };
  }
  const untilStr = user.suspendedUntil
    ? new Date(user.suspendedUntil).toLocaleDateString("ko-KR")
    : "별도 해제 시";
  return {
    suspended: true,
    message: `이용 제한 안내: 현재 계정은 [${
      user.suspendReason || "운영원칙 위반"
    }] 사유로 ${untilStr}까지 게시글 및 답변 작성이 제한되었습니다.`,
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_COOKIE_NAME)?.value;
    const userId = verifySessionToken(token);
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        department: true,
        role: true,
        isSuspended: true,
        suspendedUntil: true,
        suspendReason: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}
