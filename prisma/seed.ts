import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function seed() {
  // 清理现有数据
  await db.deviceLog.deleteMany();
  await db.device.deleteMany();
  await db.user.deleteMany();

  // 创建超级管理员
  const kid = await db.user.create({
    data: {
      username: 'Kid',
      password: 'tsw',
      user_type: 'super_admin',
    },
  });
  console.log(`创建超级管理员 ${kid.username}`);

  const th = await db.user.create({
    data: {
      username: 'TH',
      password: 'tsw',
      user_type: 'super_admin',
    },
  });
  console.log(`创建超级管理员 ${th.username}`);

  // 创建普通管理员
  const admin = await db.user.create({
    data: {
      username: 'admin',
      password: 'admin001',
      user_type: 'admin',
    },
  });
  console.log(`创建管理员 ${admin.username}`);

  // 创建普通用户
  const user = await db.user.create({
    data: {
      username: 'user',
      password: 'user001',
      user_type: 'user',
    },
  });
  console.log(`创建普通用户 ${user.username}`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  }); 