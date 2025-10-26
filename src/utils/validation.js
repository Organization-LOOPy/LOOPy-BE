import { ChallengeNotActiveError } from "../errors/customErrors.js";

// 숫자형 ID 검증
export const parseIntOrThrow = (value, errorMessage) => {
    const num = Number(value);
    if (isNaN(num)) throw new BadRequestError(errorMessage);
    return num;
  };
  
// 챌린지가 활성화 상태이고 진행 중인지 검증
export const validateActiveChallenge = (challenge, now) => {
    if (!challenge || !challenge.isActive) throw new ChallengeNotFoundError();
    if (challenge.startDate > now || challenge.endDate < now)
      throw new ChallengeNotActiveError();
  };