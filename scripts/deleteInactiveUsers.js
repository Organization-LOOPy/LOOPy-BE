import prisma from '../prisma/client.js';

const deleteInactiveUsers = async () => {
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await prisma.user.deleteMany({
    where: {
      status: 'inactive',
      inactivedAt: {
        lte: oneMonthAgo,
      },
    },
  });

  console.log(`${result.count}명의 휴면 계정이 삭제되었습니다.`);
};

deleteInactiveUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
