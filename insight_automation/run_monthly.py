import os
from datetime import datetime
from dotenv import load_dotenv
from insight_automation.logic.sources.insight_monthly import get_monthly_indicators, synthesize_monthly_insight
from insight_automation.logic.sources.perplexity import get_trending_menu_info, get_popular_cafe_features
from insight_automation.utils.parses import parse_cafe_features, parse_menu_trends
from insight_automation.graph.monthly_graph import build_graph, GState

load_dotenv() 

if __name__ == "__main__":
    cafe_id = int(os.getenv("CAFE_ID", "1"))
    
    # 지난 달 지표
    indicators = get_monthly_indicators(cafe_id)
    
    
    # 카페 트렌드 데이터
    menus_raw = get_trending_menu_info()
    feature_raw = get_popular_cafe_features()
    menus = parse_menu_trends(menus_raw)
    features = parse_cafe_features(feature_raw)
    
    # LLM으로 종합 인사이트 생성
    insight = synthesize_monthly_insight(indicators, menus, features)
    
    print(insight["content"])