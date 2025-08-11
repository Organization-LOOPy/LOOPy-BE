import os
import openai
from datetime import datetime, timedelta, timezone
from calendar import monthrange
from dotenv import load_dotenv
from typing import Dict, Any, List
from utils.athena import fetch_monthly_metrics
from logic.schemas import MenuTrendItem, CafeFeatureItem

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

KST = timezone(timedelta(hours=9))


def _prev_month_range(ref_dt: datetime | None = None):
    ref_dt = ref_dt or datetime.now(KST)
    year, month = ref_dt.year, ref_dt.month
    if month == 1:
        year -= 1
        month = 12
    else:
        month -= 1
    start = datetime(year, month, 1, tzinfo=KST)
    last_day = monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59, tzinfo=KST)
    return start, end


def _sample_indicators() -> Dict[str, Any]:
    # TODO: Athena 연동 함수로 교체 (예: utils.athena.fetch_monthly_metrics)
    return {
        "month": "샘플",
        "kpis": {
            "visits": 1480,
            "newCustomers": 210,
            "revisitRate": 0.35,
            "couponUseRate": 0.18,       # 선택 KPI
            "challengeJoin": 96          # 선택 KPI
        }
    }


def get_monthly_indicators(cafe_id: int, ref_dt: datetime | None = None) -> Dict[str, Any]:
    """지난달(완료월) 지표를 Athena에서 조회."""
    return fetch_monthly_metrics(cafe_id, ref_dt)

def synthesize_monthly_insight(indicators: Dict[str, Any],
                               menus: List[MenuTrendItem],
                               features: List[CafeFeatureItem]) -> Dict[str, Any]:
    """
    지표(디폴트) + 트렌드(덧붙이기)로 종합 인사이트 JSON을 LLM로 생성.
    """
    month_label = indicators.get("month", "지난달")
    kpis = indicators.get("kpis", {})

    menu_items = menus[:3]
    feature_items = features[:3]

    menu_text = "\n".join(
        [f'- {m.menu}: {m.whyPopular or m.description or ""} (예: {m.exampleCafe or "N/A"})' for m in menu_items]
    ) or "- (수집 없음)"
    feature_text = "\n".join(
        [f'- {f.feature}: {f.whyEffective or f.description or ""} (예: {f.exampleCafe or "N/A"})' for f in feature_items]
    ) or "- (수집 없음)"

    prompt = f"""
당신은 카페 경영 인사이트를 제공하는 데이터 분석가입니다.
아래 "지난달 KPI"를 기반으로 핵심 결론과 실행 항목을 먼저 제시하고,
마지막에 "최근 트렌드 참고" 섹션을 짧게 덧붙이세요.
숫자는 과장 없이, 액션은 구체적으로.

[지난달 KPI: {month_label}]
- 방문 수(visits): {kpis.get('visits', 'N/A')}
- 신규 고객 수(newCustomers): {kpis.get('newCustomers', 'N/A')}
- 재방문율(revisitRate): {kpis.get('revisitRate', 0)*100:.1f}%
- 쿠폰 사용률(couponUseRate): {kpis.get('couponUseRate', 0)*100:.1f}% (선택)
- 챌린지 참여 수(challengeJoin): {kpis.get('challengeJoin', 'N/A')} (선택)

[최근 트렌드 요약(참고용)]
[메뉴]
{menu_text}

[카페 특징]
{feature_text}

요청 형식(JSON 한 개의 객체):
{{
  "type": "monthly_insight",
  "period": "{month_label}",
  "kpis": {{
    "visits": <int>,
    "newCustomers": <int>,
    "revisitRate": <float>,
    "couponUseRate": <float>,
    "challengeJoin": <int>
  }},
  "insights": [
    {{"title": "핵심 결론 1", "detail": "수치 근거 포함"}},
    {{"title": "핵심 결론 2", "detail": "..."}}],
  "actions": [
    {{"title": "실행 항목 1", "detail": "구체적인 실행 방법과 대상 고객/시간대 등"}},
    {{"title": "실행 항목 2", "detail": "..."}}],
  "trendNotes": {{
    "menus": ["짧은 참고 포인트 1", "2", "3"],
    "features": ["짧은 참고 포인트 1", "2", "3"]
  }}
}}

모든 텍스트는 한국어로 작성하세요.
"""

    resp = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "당신은 친절하고 신뢰할 수 있는 카페 인사이트 분석가입니다."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )
    content = resp["choices"][0]["message"]["content"]
    return {
        "type": "monthly_insight",
        "period": month_label,
        "kpis": kpis,
        "content": content  
    }
