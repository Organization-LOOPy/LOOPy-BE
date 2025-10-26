export const toStartOfDayKST = (date) => {
    if (!date) return null;
  
    // UTC 기준 timestamp에 KST(+9시간) 보정 후 0시로 설정
    const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    kstDate.setUTCHours(0, 0, 0, 0);
  
    // 다시 KST 기준 시간으로 반환
    return new Date(kstDate.getTime() - 9 * 60 * 60 * 1000);
  };
  