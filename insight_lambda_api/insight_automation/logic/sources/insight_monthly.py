import os
import json
import re
from openai import OpenAI
from datetime import datetime, timedelta, timezone
from calendar import monthrange
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional
from insight_automation.utils.athena import fetch_monthly_metrics
from insight_automation.logic.schemas import MenuTrendItem, CafeFeatureItem

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

KST = timezone(timedelta(hours=9))

def _prev_month_range(ref_dt: Optional[datetime] = None):
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
            "couponUseRate": 0.18,
            "challengeJoin": 96
        }
    }

def get_monthly_indicators(cafe_id: int, ref_dt: Optional[datetime] = None) -> Dict[str, Any]:
    """지난달(완료월) 지표를 Athena에서 조회.(현재는 샘플 데이터 사용)"""
    return _sample_indicators()

def _generate_service_recommendations(kpis: Dict[str, Any]) -> str:
    """KPI 상황에 따라 챌린지/쿠폰 등 서비스 기능 추천 문구 생성"""
    recommendations = []
    revisit_rate = kpis.get('revisitRate', 0)
    new_customers = kpis.get('newCustomers', 0)
    coupon_use_rate = kpis.get('couponUseRate', 0)
    challenge_join = kpis.get('challengeJoin', 0)

    if revisit_rate < 0.4:
        recommendations.append("재방문율이 낮으므로 기존 고객을 위한 재방문 유도 쿠폰 이벤트를 진행하세요.")
    if new_customers < 200:
        recommendations.append("신규 고객 유입이 적으니 시즌 한정 메뉴나 이벤트를 주제로 한 챌린지를 개설하세요.")
    if coupon_use_rate < 0.2:
        recommendations.append("쿠폰 사용률이 낮으니 매장에서 쿠폰 혜택을 더 적극적으로 안내하세요.")
    if challenge_join < 50:
        recommendations.append("챌린지 참여율이 낮으니 참여 조건을 완화하거나 보상을 강화해보세요.")

    if not recommendations:
        recommendations.append("지표가 전반적으로 양호하니 현재 캠페인을 유지하며 꾸준히 고객과 소통하세요.")

    return " ".join(recommendations)

def synthesize_monthly_insight(indicators: Dict[str, Any],
                               menus: Any,
                               features: Any) -> Dict[str, Any]:
    """
    지표 + 트렌드 + 서비스 기능 추천을 포함한 종합 인사이트 JSON 생성.
    """
    month_label = indicators.get("month", "지난달")
    kpis = indicators.get("kpis", {})

    # 메뉴 텍스트 변환
    if isinstance(menus, list):
        try:
            menu_text = "\n".join(
                [f'- {m.menu}: {getattr(m, "whyPopular", "") or getattr(m, "description", "")} (예: {getattr(m, "exampleCafe", "N/A")})'
                 for m in menus[:3]]
            )
        except AttributeError:
            menu_text = "\n".join(
                [f'- {m.get("menu")}: {m.get("whyPopular") or m.get("description") or ""} (예: {m.get("exampleCafe", "N/A")})'
                 for m in menus[:3]]
            )
    else:
        menu_text = str(menus)[:500]
    if not menu_text.strip():
        menu_text = "- (수집 없음)"

    # 카페 특징 텍스트 변환
    if isinstance(features, list):
        try:
            feature_text = "\n".join(
                [f'- {f.feature}: {getattr(f, "whyEffective", "") or getattr(f, "description", "")} (예: {getattr(f, "exampleCafe", "N/A")})'
                 for f in features[:3]]
            )
        except AttributeError:
            feature_text = "\n".join(
                [f'- {f.get("feature")}: {f.get("whyEffective") or f.get("description") or ""} (예: {f.get("exampleCafe", "N/A")})'
                 for f in features[:3]]
            )
    else:
        feature_text = str(features)[:500]
    if not feature_text.strip():
        feature_text = "- (수집 없음)"

    # KPI 기반 서비스 기능 추천
    service_suggestions = _generate_service_recommendations(kpis)

    prompt = f"""
당신은 카페 경영 인사이트를 제공하는 데이터 분석가입니다.
아래 "지난달 KPI"와 "서비스 기능 추천"을 기반으로 사장님께 직접 이야기하듯, 친근하지만 신뢰감 있는 말투로 핵심 결론과 실행 조언을 작성하세요.

**중요:**
- "insights_text" 필드는 사장님께 보고하듯 모든 내용을 하나의 단락 줄글로 작성하세요.
- 불릿포인트, 번호, 줄바꿈 없이 자연스럽게 이어진 문장만 사용하세요.
- KPI 수치, 실행 방법, 트렌드 내용을 모두 포함해 작성하세요.
- 실행 항목(actions)에는 아래 서비스 기능 추천을 반드시 반영하세요.

[지난달 KPI: {month_label}]
- 방문 수(visits): {kpis.get('visits', 'N/A')}
- 신규 고객 수(newCustomers): {kpis.get('newCustomers', 'N/A')}
- 재방문율(revisitRate): {kpis.get('revisitRate', 0)*100:.1f}%
- 쿠폰 사용률(couponUseRate): {kpis.get('couponUseRate', 0)*100:.1f}%
- 챌린지 참여 수(challengeJoin): {kpis.get('challengeJoin', 'N/A')}

[서비스 기능 추천]
{service_suggestions}

[최근 트렌드 요약]
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
  "insights_text": "<사장님에게 드리는 줄글 설명 — 모든 KPI, 인사이트, 실행 항목, 트렌드 내용을 하나로 자연스럽게 이어서 작성. 서비스 기능 추천을 반드시 포함>",
  "insights": [
    {{"title": "핵심 결론 1", "detail": "수치 근거 포함"}},
    {{"title": "핵심 결론 2", "detail": "..."}}
  ],
  "actions": [
    {{"title": "실행 항목 1", "detail": "구체적인 실행 방법 (챌린지/쿠폰 등 포함)"}},
    {{"title": "실행 항목 2", "detail": "..."}}
  ],
  "trendNotes": {{
    "menus": ["참고 포인트 1", "2", "3"],
    "features": ["참고 포인트 1", "2", "3"]
  }}
}}
모든 텍스트는 한국어로 작성하세요.
"""

    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "당신은 친절하고 신뢰할 수 있는 카페 인사이트 분석가입니다."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    content = resp.choices[0].message.content

    match = re.search(r"\{.*\}", content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return {"raw": content}
    else:
        return {"raw": content}
