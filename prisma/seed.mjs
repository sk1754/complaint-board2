import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function main() {
  const count = await prisma.complaint.count();
  if (count > 0) {
    console.log("Database already has seed data. Skipping...");
    return;
  }

  const defaultPasswordHash = hashPassword("1234");

  await prisma.complaint.create({
    data: {
      title: "3층 휴게실 정수기 냉수가 나오지 않습니다",
      content:
        "어제 오후부터 3층 휴게실에 있는 정수기에서 냉수 버튼을 눌러도 미지근한 물만 나옵니다. 날씨가 더워지는데 빠른 점검 부탁드립니다.",
      category: "FACILITY",
      status: "RESOLVED",
      isSecret: false,
      passwordHash: defaultPasswordHash,
      replies: {
        create: [
          {
            authorName: "시설관리팀 관리자",
            content:
              "안녕하세요. 제보해 주신 3층 휴게실 정수기 냉각 필터 및 컴프레서 점검을 완료하여 현재 정상적으로 냉수가 출수됩니다. 이용에 불편을 드려 죄송합니다.",
          },
        ],
      },
    },
  });

  await prisma.complaint.create({
    data: {
      title: "사내 와이파이 간헐적 끊김 현상 개선 요청",
      content:
        "회의실 B 구역에서 화상회의 진행 시 와이파이가 10~15분 간격으로 끊어집니다. 공유기 증설이나 채널 조정이 필요해 보입니다.",
      category: "SYSTEM",
      status: "IN_PROGRESS",
      isSecret: false,
      passwordHash: defaultPasswordHash,
      replies: {
        create: [
          {
            authorName: "IT지원팀 관리자",
            content:
              "소중한 의견 감사합니다. 현재 회의실 B 구역 AP 신호 간섭 현상을 확인하였으며, 금주 금요일 중으로 신규 메시(Mesh) AP 증설 작업이 예정되어 있습니다. 조치 완료 후 다시 안내드리겠습니다.",
          },
        ],
      },
    },
  });

  await prisma.complaint.create({
    data: {
      title: "[비밀글] 고객 응대 프로세스 관련 건의사항입니다",
      content:
        "민감한 내부 프로세스 관련 건의사항입니다. 야간 당직 시 긴급 문의 매뉴얼이 최신화되어 있지 않아 혼선이 발생하고 있습니다. 매뉴얼 개정을 요청드립니다. (테스트 비밀번호: 1234)",
      category: "SERVICE",
      status: "PENDING",
      isSecret: true,
      passwordHash: defaultPasswordHash,
    },
  });

  await prisma.complaint.create({
    data: {
      title: "구내식당 채식/샐러드 코너 수량 확대 건의",
      content:
        "점심시간 12시 20분쯤 내려가면 샐러드팩이 이미 모두 소진되어 있는 경우가 많습니다. 일일 준비 수량을 조금 더 늘려주실 수 있을까요?",
      category: "OTHER",
      status: "PENDING",
      isSecret: false,
      passwordHash: defaultPasswordHash,
    },
  });

  console.log("Seed data created successfully! (Sample post password: 1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

