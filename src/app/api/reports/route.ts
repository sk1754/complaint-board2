import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { REPORT_STATUS_MAP, ReportStatusType } from "@/lib/constants";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "DEPT_ADMIN")) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const [
      reports,
      auditLogs,
      recentPostsCount,
      waitingQuestionsCount,
      pendingReportsCount,
      suspendedUsersCount,
      recentPosts,
      waitingQuestions,
    ] = await Promise.all([
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.post.count(),
      prisma.post.count({
        where: { isNotice: false, questionStatus: "WAITING" },
      }),
      prisma.report.count({
        where: { status: { in: ["PENDING", "REVIEWING"] } },
      }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.post.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.post.findMany({
        where: { isNotice: false, questionStatus: "WAITING" },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      reports,
      auditLogs,
      overview: {
        recentPostsCount,
        waitingQuestionsCount,
        pendingReportsCount,
        suspendedUsersCount,
        recentPosts,
        waitingQuestions,
      },
    });
  } catch (error) {
    console.error("Reports fetch error:", error);
    return NextResponse.json(
      { error: "신고 및 운영 현황 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "신고하려면 로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const targetType = body.targetType === "COMMENT" ? "COMMENT" : "POST";
    const targetId = Number(body.targetId || body.postId || 0);
    const postId = body.postId ? Number(body.postId) : targetId;
    const commentId =
      targetType === "COMMENT" ? Number(body.targetId || body.commentId) : null;
    const reason = (body.reason || "").trim();

    if (!reason) {
      return NextResponse.json(
        { error: "신고 사유를 입력해 주세요." },
        { status: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reporterName: user.name,
        targetType,
        targetId,
        postId,
        commentId,
        reason,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        report,
        message: "신고가 접수되었습니다. 관리자가 검토 후 조치합니다.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Report submit error:", error);
    return NextResponse.json(
      { error: "신고 접수 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "DEPT_ADMIN")) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const reportId = Number(body.reportId);
    const nextStatus = body.status as ReportStatusType;
    const adminNote = (
      body.adminNote ||
      body.reason ||
      `신고 상태 변경: ${REPORT_STATUS_MAP[nextStatus]?.label || nextStatus}`
    ).trim();

    if (!["PENDING", "REVIEWING", "RESOLVED", "REJECTED"].includes(nextStatus)) {
      return NextResponse.json(
        { error: "유효하지 않은 상태입니다." },
        { status: 400 }
      );
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: nextStatus,
        adminNote,
        handledBy: user.name,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminName: user.name,
        adminRole: user.role,
        action: `신고 상태 변경 (${
          REPORT_STATUS_MAP[nextStatus]?.label || nextStatus
        })`,
        targetType: "REPORT",
        targetId: reportId,
        detail: `신고 #${reportId} (${updated.targetType} #${updated.targetId}) 상태: ${nextStatus} / 메모: ${adminNote}`,
      },
    });

    return NextResponse.json({
      report: updated,
      message: "신고 처리 상태가 업데이트되고 처리 이력에 기록되었습니다.",
    });
  } catch (error) {
    console.error("Report update error:", error);
    return NextResponse.json(
      { error: "신고 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
