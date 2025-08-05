import random
from utils.perplexity import fetch_cafe_trend
from logic.trend_prompt import get_menu_prompt, get_feature_prompt
from logic.sources.perplexity import get_trending_menu_info, get_popular_cafe_features
from logic.sources.insight_weekly import get_weekly_comparison_insight
from datetime import datetime

def choose_insight_type():
    today = datetime.now()
    if today.weekday() == 0:  # 월요일마다 주간 분석
        return "weekly_report"
    return random.choice(["popular_menu", "cafe_feature"])

def generate_insight():
    today = datetime.datetime.now()
    weekday = today.weekday()  # 0 = Monday, 6 = Sunday

    if weekday == 6:  # 일요일엔 과거 지표 비교
        insight_type = 'performance_comparison'
        content = get_weekly_comparison_insight()
    else:
        options = ['popular_menus', 'cafe_features']
        chosen = random.choice(options)

        if chosen == 'popular_menus':
            insight_type = 'popular_menus'
            content = get_trending_menu_info()
        else:
            insight_type = 'cafe_features'
            content = get_popular_cafe_features()

    return {
        'type': insight_type,
        'content': content,
    }