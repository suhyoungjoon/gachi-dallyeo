// 관리자 권한 부여/회수. 앱에서는 관리자를 만들 수 없고 서버에서만 실행한다.
//   node scripts/set-admin.js <email>          관리자로 지정
//   node scripts/set-admin.js <email> --revoke 일반 사용자로 되돌림
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email) {
    console.error('사용법: node scripts/set-admin.js <email> [--revoke]');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const role = flag === '--revoke' ? 'user' : 'admin';
    const user = await prisma.user.update({ where: { email }, data: { role }, select: { email: true, name: true, role: true } });
    console.log(`${user.name} <${user.email}> → ${user.role}`);
  } catch (e) {
    console.error(e.code === 'P2025' ? `해당 이메일의 사용자가 없습니다: ${email}` : e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
