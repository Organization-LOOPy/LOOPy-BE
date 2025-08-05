import { fetchCafeTrends } from '../services/perplexity.service.js';

export const getPopularCafeMenus = async (req, res, next) => {
  try {
    const result = await fetchCafeTrends(
        `당신은 한국 카페 트렌드 리서처입니다.
        2025년 현재 한국에서 인기 있는 카페들이 공통적으로 갖고 있는 특징을 조사해 주세요.
        인테리어, 주 고객층, 메뉴 구성, 서비스 방식 등에서 어떤 공통점이 있는지 
        웹의 최신 기사, 블로그, SNS 등에서 수집한 내용을 바탕으로 요약해 주세요.
        모두 실제로 존재하는 사례여야 하며, 광고 내용 같은 경우는 제외해야 합니다.

            반드시 아래와 같은 형식의 JSON 배열로 응답해 주세요:

            [
                {
                    "feature": "공통 특징 키워드 (예: 미니멀 인테리어, 디카페인 메뉴, 반려동물 동반 등)",
                    "description": "해당 특징에 대한 간단한 설명",
                    "whyEffective": "이 특징이 인기 있는 이유 또는 고객에게 긍정적인 반응을 얻는 이유 (1~2문장)",
                    "exampleCafe": "해당 특징을 가진 실제 카페 이름 또는 간단한 예시 (가능한 경우)"
                },
                ...
            ]

        모든 응답은 한국어로 작성해 주세요`
    );
    res.status(200).json({ message: 'success', data: result });
  } catch (err) {
    next(err);
  }
};