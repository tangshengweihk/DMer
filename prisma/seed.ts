import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function seed() {
  // 清理现有数据
  await db.deviceLog.deleteMany();
  await db.device.deleteMany();
  await db.secondaryTag.deleteMany();
  await db.primaryTag.deleteMany();
  await db.user.deleteMany();

  // 创建用户
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

  const admin = await db.user.create({
    data: {
      username: 'admin',
      password: 'admin001',
      user_type: 'admin',
    },
  });
  console.log(`创建管理员 ${admin.username}`);

  const user = await db.user.create({
    data: {
      username: 'user',
      password: 'user001',
      user_type: 'user',
    },
  });
  console.log(`创建普通用户 ${user.username}`);

  // 创建一级标签和对应的二级标签
  const primaryTags = [
    {
      name: '视频',
      secondaryTags: ['摄像机', '录像机', '视频矩阵', '解码器', '编码器']
    },
    {
      name: '音频',
      secondaryTags: ['功放', '音箱', '话筒', '调音台', '音频处理器']
    },
    {
      name: '网络',
      secondaryTags: ['交换机', '路由器', '防火墙', '网关', '网络存储']
    }
  ];

  for (const tag of primaryTags) {
    const primaryTag = await db.primaryTag.create({
      data: {
        name: tag.name,
        secondaryTags: {
          create: tag.secondaryTags.map(name => ({
            name,
          })),
        },
      },
    });
    console.log(`创建一级标签 ${primaryTag.name} 及其二级标签`);
  }

  console.log('数据库初始化完成');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  }); 