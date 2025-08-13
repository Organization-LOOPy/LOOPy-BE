import os
import json
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from mangum import Mangum

from insight_automation.logic.sources.insight_monthly import (
    synthesize_monthly_insight,  # 수정한 버전
    _sample_indicators,          # 샘플 지표
    get_monthly_indicators       # Athena 연동
)
from insight_automation.utils.perplexity import (
    fetch_menu_trends,
    fetch_cafe_features,
    ensure_dict_array_from_text
)

app = FastAPI(title="Cafe Insight API", version="1.0.0")

@app.get("/health")
def health():
    return {"ok": True, "message": "healthy"}

@app.get("/insight")
def get_insight(
    cafe_id: int = Query(..., alias="cafeId"),
    use_mock: bool = Query(True, description="지표를 목데이터로 사용할지 (기본 true)"),
    include_debug: bool = Query(False, description="원시 응답 일부 포함 여부"),
):
    """
    인사이트 생성 API
    - cafeId: 카페 ID
    - use_mock: True면 지표는 샘플(_sample_indicators), False면 실제(get_monthly_indicators)
    - include_debug: True면 Perplexity 원본 일부를 debug로 반환
    """
    try:
        # 1) 지표
        indicators = _sample_indicators() if use_mock else get_monthly_indicators(cafe_id)

        # 2) 퍼플렉시티 트렌드 (실시간)
        menus_raw = fetch_menu_trends()
        features_raw = fetch_cafe_features()
        menus = ensure_dict_array_from_text(menus_raw)
        features = ensure_dict_array_from_text(features_raw)

        # 3) GPT 종합 인사이트
        report = synthesize_monthly_insight(indicators, menus, features)

        # 4) 응답
        payload = {"ok": True, "cafeId": cafe_id, "report": report}
        if include_debug:
            
            payload["debug"] = {
                "menus_raw_head": menus_raw[:500],
                "features_raw_head": features_raw[:500],
                "menus_parsed_len": len(menus),
                "features_parsed_len": len(features),
            }

        return JSONResponse(payload, status_code=200)

    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)

# Lambda 핸들러 (API Gateway -> Lambda)
handler = Mangum(app)
