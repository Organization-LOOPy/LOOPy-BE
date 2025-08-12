import prisma from './client.js';

const DEFAULT_STAMP_IMAGES = [
  'https://default-images/stamp1.png',
  'https://default-images/stamp2.png',
];

async function main() {
  const cafes = await prisma.cafe.findMany({
    select: { id: true },
  });

  for (const cafe of cafes) {
    const count = await prisma.stampImage.count({
      where: { cafeId: cafe.id },
    });

    if (count === 0) {
      await prisma.stampImage.createMany({
        data: DEFAULT_STAMP_IMAGES.map((url) => ({
          cafeId: cafe.id,
          imageUrl: url,
        })),
      });
      console.log(`Cafe ${cafe.id} → 기본 스탬프 이미지 2개 등록 완료`);
    }
  }
}

main()
  .then(() => {
    console.log(' 기본 스탬프 이미지 초기화 완료');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
