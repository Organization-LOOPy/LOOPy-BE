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
