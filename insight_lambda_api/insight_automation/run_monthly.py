import os
import json
from datetime import datetime
from dotenv import load_dotenv
from insight_automation.utils.parses import parse_menu_trends, parse_cafe_features
from insight_automation.logic.sources.insight_monthly import get_monthly_indicators
from insight_automation.utils.perplexity import fetch_menu_trends, fetch_cafe_features
from insight_automation.logic.sources.insight_monthly import synthesize_monthly_insight
import json

load_dotenv() 

if __name__ == "__main__":
    cafe_id = 1  # 테스트용
    print(f"▶️ {cafe_id}번 카페 월간 인사이트 생성 시작")

    # 1. 아테나로 지표 수집
    indicators = get_monthly_indicators(cafe_id)
    print(f"📊 월간 지표 수집 완료: {indicators}")

    # 2. 퍼플렉시티로 메뉴 트렌드 + 카페 특징 수집
    menus_raw = fetch_menu_trends()
    features_raw = fetch_cafe_features()

    # 3. 파싱 시도, 실패 시 원본 데이터 유지
    menus = parse_menu_trends(menus_raw, max_items=3) or menus_raw
    features = parse_cafe_features(features_raw, max_items=3) or features_raw

    # 4. GPT로 종합 인사이트 생성
    insight = synthesize_monthly_insight(indicators, menus, features)
    print("💡 생성된 인사이트 JSON:")
    print(json.dumps(insight, ensure_ascii=False, indent=2))