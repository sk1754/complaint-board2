import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { BOARDS, BOARD_MAP, BoardType } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (
      !currentUser ||
      (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "DEPT_ADMIN")
    ) {
      return NextResponse.json(
        { error: "권한 없음: 관리자만 회원 목록을 조회할 수 있습니다." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const dept = (searchParams.get("dept") || "ALL").trim();

    const andConditions: Record<string, unknown>[] = [];
    if (dept !== "ALL" && BOARDS.includes(dept as BoardType)) {
      andConditions.push({ department: dept });
    }
    if (q) {
      andConditions.push({
        OR: [
          { name: { contains: q } },
          { username: { contains: q } },
          { department: { contains: q } },
        ],
      });
    }

    const users = await prisma.user.findMany({
      where: andConditions.length > 0 ? { AND: andConditions } : {},
      orderBy: { id: "asc" },
      select: {
        id: true,
        username: true,
        name: true,
        department: true,
        role: true,
        isSuspended: true,
        suspendedUntil: true,
        suspendReason: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "회원 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (
      !currentUser ||
      (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "DEPT_ADMIN")
    ) {
      return NextResponse.json(
        { error: "권한 없음: 관리자만 회원 설정을 변경할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const targetUserId = Number(body.userId);
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "존재하지 않는 회원입니다." },
        { status: 404 }
      );
    }

    // 1. 회원 이용 제한 설정/해제
    if (body.action === "SUSPEND") {
      if (
        currentUser.role === "DEPT_ADMIN" &&
        targetUser.department !== currentUser.department
      ) {
        return NextResponse.json(
          {
            error: "권한 없음: 학과 관리자는 본인 담당 학과 회원만 이용 제한을 설정할 수 있습니다.",
          },
          { status: 403 }
        );
      }

      if (targetUser.role === "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "전체 관리자 계정은 이용 제한할 수 없습니다." },
          { status: 400 }
        );
      }

      const isSuspended = Boolean(body.isSuspended);
      const days = Number(body.days || 7);
      const suspendReason = isSuspended
        ? (body.suspendReason || "게시판 운영 정책 위반").trim()
        : null;
      const suspendedUntil = isSuspended
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        : null;

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          isSuspended,
          suspendedUntil,
          suspendReason,
        },
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

      await prisma.auditLog.create({
        data: {
          adminId: currentUser.id,
          adminName: currentUser.name,
          adminRole: currentUser.role,
          action: isSuspended ? "회원 이용 제한 설정" : "회원 이용 제한 해제",
          targetType: "USER",
          targetId: targetUser.id,
          detail: isSuspended
            ? `${targetUser.name}(${targetUser.username}) ${days}일간 작성 제한 - 사유: ${suspendReason}`
            : `${targetUser.name}(${targetUser.username}) 이용 제한 해제`,
        },
      });

      return NextResponse.json({
        user: updated,
        message: isSuspended
          ? `${updated.name} 회원의 이용 제한(${days}일)이 설정되었습니다.`
          : `${updated.name} 회원의 이용 제한이 해제되었습니다.`,
      });
    }

    // 2. 역할 및 담당 학과 변경 (전체 관리자 전용)
    if (currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "권한 없음: 전체 관리자만 학과 관리자 권한을 변경할 수 있습니다." },
        { status: 403 }
      );
    }

    const nextRole = body.role;
    const nextDept = body.department;

    if (!["USER", "DEPT_ADMIN", "SUPER_ADMIN"].includes(nextRole)) {
      return NextResponse.json(
        { error: "유효하지 않은 역할입니다." },
        { status: 400 }
      );
    }

    const dataToUpdate: { role: string; department?: string } = {
      role: nextRole,
    };

    if (nextDept && BOARDS.includes(nextDept)) {
      dataToUpdate.department = nextDept;
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: dataToUpdate,
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

    await prisma.auditLog.create({
      data: {
        adminId: currentUser.id,
        adminName: currentUser.name,
        adminRole: currentUser.role,
        action: "회원 권한·소속 변경",
        targetType: "USER",
        targetId: updated.id,
        detail: `${updated.name}(${updated.username}) 역할: ${updated.role}, 소속: ${
          BOARD_MAP[updated.department as BoardType]?.shortName || updated.department
        }`,
      },
    });

    return NextResponse.json({
      user: updated,
      message: `${updated.name} 회원의 권한 설정이 변경되었습니다.`,
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "회원 정보 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
