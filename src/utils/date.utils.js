export const toStartOfDayKST = (date) => {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const kst = new Date(utc + 9 * 3600000);
    kst.setHours(0, 0, 0, 0);
    return kst;
  };