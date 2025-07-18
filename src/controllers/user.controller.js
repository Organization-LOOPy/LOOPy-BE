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
