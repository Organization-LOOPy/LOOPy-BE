import os
from datetime import datetime
from dotenv import load_dotenv
from logic.sources.insight_monthly import get_monthly_indicators, synthesize_monthly_insight
from logic.sources.perplexity import get_trending_menu_info, get_popular_cafe_features
## from utils.parses import parse_
from graph.monthly_graph import build_graph, GState

load_dotenv() 

if __name__ == "__main__":
    cafe_id = int(os.getenv("CAFE_ID", "1"))
    
    # 지난 달 지표
    menus_raw = get_trending_menu_info()