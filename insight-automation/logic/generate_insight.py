from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from logic.sources.insight_monthly import (
    get_monthly_indicators,
    synthesize_monthly_insight,
)
from logic.sources.perplexity import (
    get_trending_menu_info,
    get_popular_cafe_features,
)

KST = timezone(timedelta(hours=9))


def generate_insight(cafe_id: int = 1, enforce_schedule: bool = True) -> Dict[str, Any]:
    """
    한 달에 한 번만 생성하는 인사이트.
    - 기본은 지난달 KPI 기반(지표 중심)
    - Perplexity 트렌드(메뉴/특징)를 짧게 덧붙여 제공
    - enforce_schedule=True면 매월 1일이 아닐 때 생성 스킵
    """
    now = datetime.now(KST)
    if enforce_schedule and now.day != 1:
        return {
            "type": "skipped",
            "reason": "Monthly insight runs only on day=1 (KST). Set enforce_schedule=False to override."
        }

    # 1) 지난달 지표
    indicators = get_monthly_indicators(cafe_id, now)

    # 2) 트렌드 수집
    menus = get_trending_menu_info()       
    features = get_popular_cafe_features() 

    # 3) LLM 종합(지표 → 결론/액션 중심, 마지막에 트렌드 참고)
    result = synthesize_monthly_insight(indicators, menus, features)

    # 4) 필요하면 여기서 result["content"]를 jsonsafe로 파싱해 dict로 바꿔 저장 가능
    return result
