import os
import json
import logging
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from mangum import Mangum

# 로컬 실행 시 .env 로드
if os.getenv("AWS_EXECUTION_ENV") is None:
    from dotenv import load_dotenv
    load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from insight_automation.logic.sources.insight_monthly import (
    synthesize_monthly_insight,
    _sample_indicators,
    get_monthly_indicators
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
    - use_mock: True면 샘플 지표 사용, False면 실제 Athena 연동
    - include_debug: True면 Perplexity 원본 일부를 debug로 반환
    """
    try:
        logger.info(f"Generating insight for cafe_id={cafe_id}, use_mock={use_mock}")

        # 1) 지표
        indicators = _sample_indicators() if use_mock else get_monthly_indicators(cafe_id)
        logger.debug(f"Indicators: {indicators}")

        # 2) 퍼플렉시티 트렌드 (실시간) - 토큰 여유 주고 타임아웃 설정
        menus_raw = fetch_menu_trends(max_tokens=1024, timeout=20)
        features_raw = fetch_cafe_features(max_tokens=1024, timeout=20)

        # 3) 안전한 파싱 (JSON 깨짐 방지)
        try:
            menus = ensure_dict_array_from_text(menus_raw)
        except Exception as e:
            logger.warning(f"Menus parsing failed: {e}")
            menus = []

        try:
            features = ensure_dict_array_from_text(features_raw)
        except Exception as e:
            logger.warning(f"Features parsing failed: {e}")
            features = []

        # 4) GPT 종합 인사이트
        report = synthesize_monthly_insight(indicators, menus, features)

        # 5) 응답
        payload = {
            "ok": True,
            "cafeId": cafe_id,
            "report": report
        }

        if include_debug:
            payload["debug"] = {
                "menus_raw_head": menus_raw[:500],
                "features_raw_head": features_raw[:500],
                "menus_parsed_len": len(menus),
                "features_parsed_len": len(features),
            }

        return JSONResponse(payload, status_code=200)

    except Exception as e:
        logger.exception("Insight generation failed")
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)


handler = Mangum(app)

def lambda_handler(event, context):
    return handler(event, context)
