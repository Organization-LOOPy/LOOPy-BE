import prisma from '../../prisma/client.js';

// 휴면계정으로 전환 
export const deactivateUser = async (req, res) => {
  const userId = req.user.id;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        status: 'inactive',
        inactivedAt: new Date(), // 휴면 시점 기록
      },
    });

    return res.status(200).json({
      message: '계정이 휴면 상태로 전환되었습니다.',
      user: {
        id: updatedUser.id.toString(),
        status: updatedUser.status,
        inactivedAt: updatedUser.inactivedAt,
      },
    });
  } catch (error) {
    console.error('휴면 전환 오류:', error);
    return res.status(500).json({ error: '휴면 전환에 실패했습니다.' });
  }
};

// 휴면 계정 다시 활성화
export const reactivateUser = async (req, res) => {
  const userId = req.user.id;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        status: 'active',
        inactivedAt: null,
      },
    });

    return res.status(200).json({
      message: '계정이 다시 활성화되었습니다.',
      user: {
        id: updatedUser.id.toString(),
        status: updatedUser.status,
        inactivedAt: updatedUser.inactivedAt,
      },
    });
  } catch (error) {
    console.error('계정 복구 오류:', error);
    return res.status(500).json({ error: '계정 복구에 실패했습니다.' });
  }
};

// 사용자 정보 조회
export const getMyInfo = async (req, res) => {
  console.log('req.user:', req.user);
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        nickname: true,
        role: true,
        status: true,
        allowKakaoAlert: true,
        profileImageUrl: true,
        fcmToken: true,
        createdAt: true,
        updatedAt: true,
        inactivedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    return res.status(200).json({
      user: {
        ...user,
        id: user.id.toString(), // BigInt → string 변환
      },
    });
  } catch (error) {
    console.error('내 정보 조회 오류:', error);
    return res.status(500).json({ error: '사용자 정보 조회 실패' });
  }
};

export const updateNickname = async (req, res) => {
  const userId = req.user.id;
  const { nickname } = req.body;

  if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
    return res.status(400).json({ error: '유효한 닉네임을 입력해주세요.' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { nickname: nickname.trim() },
      select: {
        id: true,
        nickname: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: '닉네임이 성공적으로 변경되었습니다.',
      user: {
        id: updatedUser.id.toString(),
        nickname: updatedUser.nickname,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('닉네임 수정 오류:', error);
    return res.status(500).json({ error: '닉네임 수정 중 오류가 발생했습니다.' });
  }
};

// 선호 키워드 저장
export const updateUserPreferences = async (req, res) => {
  const userId = req.user.id;
  const { preferredKeywords } = req.body;

  const VALID_KEYWORDS = [
    "노트북", "1인석", "단체석", "주차 가능", "예약 가능",
    "와이파이 제공", "애견 동반", "24시간 운영", "텀블러 할인",
    "포장 할인", "비건", "저당/무가당", "글루텐프리", "디카페인"
  ];

  const sanitized = (preferredKeywords || []).filter(k =>
    VALID_KEYWORDS.includes(k)
  );

  try {
    const updated = await prisma.userPreference.upsert({
      where: { userId },
       update: { preferredKeywords: sanitized },
  create: {
    userId,
    preferredKeywords: sanitized
  }
});

    return res.status(200).json({
      message: '선호 키워드가 저장되었습니다.',
      preferredKeywords: updated.preferredKeywords
    });
  } catch (error) {
    console.error('키워드 저장 오류:', error);
    return res.status(500).json({ error: '선호 키워드 저장 실패' });
  }
};
