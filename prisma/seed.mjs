import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const defaultPw = hashPassword("1234");

  const superAdmin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: defaultPw,
      name: "전체관리자",
      department: "COMP",
      role: "SUPER_ADMIN",
    },
  });

  const compAdmin = await prisma.user.create({
    data: {
      username: "comp_admin",
      passwordHash: defaultPw,
      name: "컴전과관리자",
      department: "COMP",
      role: "DEPT_ADMIN",
    },
  });

  const aeroAdmin = await prisma.user.create({
    data: {
      username: "aero_admin",
      passwordHash: defaultPw,
      name: "항공과관리자",
      department: "AERO",
      role: "DEPT_ADMIN",
    },
  });

  const userAero = await prisma.user.create({
    data: {
      username: "user1",
      passwordHash: defaultPw,
      name: "김항공",
      department: "AERO",
      role: "USER",
    },
  });

  const userComp = await prisma.user.create({
    data: {
      username: "user2",
      passwordHash: defaultPw,
      name: "이컴전",
      department: "COMP",
      role: "USER",
    },
  });

  const userMecha = await prisma.user.create({
    data: {
      username: "user3",
      passwordHash: defaultPw,
      name: "박메카",
      department: "MECHA",
      role: "USER",
    },
  });

  const userInfo = await prisma.user.create({
    data: {
      username: "user4",
      passwordHash: defaultPw,
      name: "최정통",
      department: "INFO",
      role: "USER",
    },
  });

  // 4단계 테스트용 이용 제한 계정 (작성 차단 테스트용)
  const bannedUser = await prisma.user.create({
    data: {
      username: "banned_user",
      passwordHash: defaultPw,
      name: "정이용제한",
      department: "COMP",
      role: "USER",
      isSuspended: true,
      suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      suspendReason: "반복적인 광고·도배 게시물 작성으로 7일 이용 제한",
    },
  });

  const sampleTxtContent = Buffer.from(
    "=== 2026학년도 제2공학관 열람실 및 실습실 이용 수칙 ===\n1. 기말고사 기간 1층 열람실 24시간 개방\n2. 실습실 퇴실 시 전원 및 냉난방기 종료 필수\n3. 문의: 제2공학관 통합행정실 (02-1234-2000)\n",
    "utf-8"
  );

  const sampleCsvContent = Buffer.from(
    "호실,장비명,점검상태,담당부서\n301호,오실로스코프,정상,컴전과\n201호,비행시뮬레이터,정상,항공과\n305호,3D프린터,필라멘트보충필요,메카과\n",
    "utf-8"
  );

  // 1. 2공학관 공통 중요 공지 (첨부파일 2개 포함)
  const commonNotice1 = await prisma.post.create({
    data: {
      board: "COMMON",
      targetDepts: "ALL",
      isNotice: true,
      isPinned: true,
      title:
        "[2공학관 전체공지] 기말고사 기간 제2공학관 열람실 및 공용 실습실 24시간 개방 안내 (첨부파일 포함)",
      content:
        "제2공학관 전체 이용자(컴전과·항공과·메카과·정통과)를 위한 공통 공지입니다.\n기말고사 기간 동안 1층 공용 열람실 및 세미나실을 24시간 개방합니다.\n상세 이용 수칙 및 실습실 장비 점검 현황은 아래 첨부파일을 다운로드하여 확인해 주시기 바랍니다.",
      views: 215,
      authorId: superAdmin.id,
      authorName: superAdmin.name,
      attachments: {
        create: [
          {
            fileName: "2026_제2공학관_열람실_이용수칙.txt",
            mimeType: "text/plain; charset=utf-8",
            fileSize: sampleTxtContent.length,
            dataBase64: sampleTxtContent.toString("base64"),
          },
          {
            fileName: "제2공학관_실습장비_점검표.csv",
            mimeType: "text/csv; charset=utf-8",
            fileSize: sampleCsvContent.length,
            dataBase64: sampleCsvContent.toString("base64"),
          },
        ],
      },
    },
  });

  // 2. 2공학관 공통 공지 (지정 학과: 컴전과, 항공과에만 표시)
  await prisma.post.create({
    data: {
      board: "COMMON",
      targetDepts: "COMP,AERO",
      isNotice: true,
      isPinned: false,
      title: "[공통공지-컴전·항공] 제2공학관 2~3층 네트워크 장비 정기 점검 안내",
      content:
        "2층(항공과) 및 3층(컴전과) 구간 스위치 점검으로 금요일 18:00~19:00 사이 유무선 네트워크가 일시 중단됩니다.",
      views: 88,
      authorId: superAdmin.id,
      authorName: superAdmin.name,
    },
  });

  // 3. 2공학관 공통 질문 (답변 등록 상태 -> user2에게 새 답변 알림 생성)
  const commonQuestion = await prisma.post.create({
    data: {
      board: "COMMON",
      isNotice: false,
      questionStatus: "ANSWERED",
      title: "제2공학관 1층 공용 복합기 용지 보충 요청드립니다",
      content:
        "1층 로비 공용 프린터에 A4 용지가 모두 소진되었습니다. 어디로 요청하면 될까요?",
      views: 46,
      authorId: userComp.id,
      authorName: userComp.name,
      comments: {
        create: [
          {
            authorId: superAdmin.id,
            authorName: superAdmin.name,
            authorRole: "SUPER_ADMIN",
            isOfficial: true,
            content:
              "안녕하세요, 제2공학관 통합행정실입니다. 금일 오전 1층 공용 복합기 A4 용지 및 토너 보충을 완료했습니다.",
          },
        ],
      },
    },
  });

  // 4. 컴전과 공지 및 질문들
  await prisma.post.create({
    data: {
      board: "COMP",
      isNotice: true,
      isPinned: true,
      title: "[컴전과 공지] 2026학년도 컴퓨터전자공학과 졸업작품 발표회 일정",
      content:
        "컴전과 졸업작품 발표회가 다음 주 금요일 오후 2시 제2공학관 301호에서 진행됩니다.",
      views: 112,
      authorId: compAdmin.id,
      authorName: compAdmin.name,
    },
  });

  const compWaitingQ = await prisma.post.create({
    data: {
      board: "COMP",
      isNotice: false,
      questionStatus: "WAITING",
      title: "컴전과 실습실 C언어 컴파일러 버전 문의드립니다",
      content:
        "302호 실습실 PC에 설치된 GCC 버전 업데이트 일정이 궁금합니다.",
      views: 25,
      authorId: userComp.id,
      authorName: userComp.name,
    },
  });

  const compResolvedQ = await prisma.post.create({
    data: {
      board: "COMP",
      isNotice: false,
      questionStatus: "RESOLVED",
      title: "컴전과 사물함 비밀번호 초기화 신청 방법 질문",
      content:
        "학과 사물함 자물쇠 초기화를 신청하려면 학과 사무실로 방문하면 되나요?",
      views: 63,
      authorId: userComp.id,
      authorName: userComp.name,
      comments: {
        create: [
          {
            authorId: compAdmin.id,
            authorName: compAdmin.name,
            authorRole: "DEPT_ADMIN",
            isOfficial: true,
            content:
              "네, 학생증을 지참하여 제2공학관 301호 컴전과 학과사무실로 방문해 주시면 즉시 도와드립니다.",
          },
        ],
      },
    },
  });

  // 5. 항공과 공지 및 질문
  await prisma.post.create({
    data: {
      board: "AERO",
      isNotice: true,
      isPinned: true,
      title: "[항공과 공지] 비행시뮬레이션 실습실 안전교육 이수 안내",
      content:
        "항공과 재학생은 실습 전 온라인 안전교육 수료증을 제출해 주시기 바랍니다.",
      views: 94,
      authorId: aeroAdmin.id,
      authorName: aeroAdmin.name,
    },
  });

  const aeroWaitingQ = await prisma.post.create({
    data: {
      board: "AERO",
      isNotice: false,
      questionStatus: "WAITING",
      title: "항공과 비행역학 보강 강의실 위치가 어디인가요?",
      content:
        "이번 주 금요일 비행역학 보강 수업 강의실 번호를 알고 싶습니다.",
      views: 31,
      authorId: userAero.id,
      authorName: userAero.name,
    },
  });

  // 6. 메카과 & 정통과 질문
  await prisma.post.create({
    data: {
      board: "MECHA",
      isNotice: false,
      questionStatus: "WAITING",
      title: "메카과 3D 프린터 필라멘트 잔량 문의",
      content:
        "로봇제어 실습실 PLA 필라멘트 여유분이 남아있는지 질문합니다.",
      views: 19,
      authorId: userMecha.id,
      authorName: userMecha.name,
    },
  });

  await prisma.post.create({
    data: {
      board: "INFO",
      isNotice: false,
      questionStatus: "WAITING",
      title: "정통과 네트워크보안 특강 신청 마감일 질문",
      content:
        "특강 사전 신청 마감 시간이 언제까지인지 궁금합니다.",
      views: 27,
      authorId: userInfo.id,
      authorName: userInfo.name,
    },
  });

  // 7. 초기 알림 데이터 (user2 이컴전 앞으로 도착한 읽지 않은 알림 & 읽은 알림)
  await prisma.notification.createMany({
    data: [
      {
        userId: userComp.id,
        postId: commonQuestion.id,
        type: "OFFICIAL_ANSWER",
        message: `[공식 답변] '${commonQuestion.title}' 글에 전체관리자님이 답변을 등록했습니다.`,
        isRead: false,
      },
      {
        userId: userComp.id,
        postId: compResolvedQ.id,
        type: "OFFICIAL_ANSWER",
        message: `[공식 답변] '${compResolvedQ.title}' 글에 컴전과관리자님이 답변을 등록했습니다.`,
        isRead: true,
      },
    ],
  });

  // 8. 초기 신고 접수 데이터 (관리자 신고 처리 테스트용)
  const report1 = await prisma.report.create({
    data: {
      reporterId: userComp.id,
      reporterName: userComp.name,
      targetType: "POST",
      targetId: compWaitingQ.id,
      postId: compWaitingQ.id,
      reason: "게시판 성격과 무관한 중복 질문인지 확인 요청드립니다.",
      status: "PENDING",
    },
  });

  await prisma.report.create({
    data: {
      reporterId: userAero.id,
      reporterName: userAero.name,
      targetType: "POST",
      targetId: aeroWaitingQ.id,
      postId: aeroWaitingQ.id,
      reason: "강의실 호수 오기재 검토 요청",
      status: "REVIEWING",
      adminNote: "항공과 학과사무실에서 강의실 배정표 확인 중",
      handledBy: aeroAdmin.name,
    },
  });

  // 9. 초기 관리자 처리 이력 (AuditLog)
  await prisma.auditLog.createMany({
    data: [
      {
        adminId: superAdmin.id,
        adminName: superAdmin.name,
        adminRole: superAdmin.role,
        action: "회원 이용 제한 설정",
        targetType: "USER",
        targetId: bannedUser.id,
        detail: `${bannedUser.name}(${bannedUser.username}) 7일간 작성 제한 - 사유: 반복적인 광고·도배 게시물 작성으로 7일 이용 제한`,
      },
      {
        adminId: aeroAdmin.id,
        adminName: aeroAdmin.name,
        adminRole: aeroAdmin.role,
        action: "신고 상태 변경 (검토 중)",
        targetType: "REPORT",
        targetId: report1.id,
        detail: "신고 #2 (POST #8) 상태: REVIEWING / 메모: 항공과 학과사무실에서 강의실 배정표 확인 중",
      },
      {
        adminId: superAdmin.id,
        adminName: superAdmin.name,
        adminRole: superAdmin.role,
        action: "중요 공지 상단 고정",
        targetType: "POST",
        targetId: commonNotice1.id,
        detail: `[#${commonNotice1.id}] '${commonNotice1.title}' 상단 고정 설정`,
      },
    ],
  });

  console.log("Seed completed: 4단계 첨부파일, 알림, 마이페이지, 신고 및 운영 관리 초기 데이터 생성 완료!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
