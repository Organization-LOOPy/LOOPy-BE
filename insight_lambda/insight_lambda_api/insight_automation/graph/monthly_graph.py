from dataclasses import dataclass, field
from typing import Any, Dict, List
from langgraph.graph import StateGraph, END

from insight_automation.logic.sources.insight_monthly import (
    get_monthly_indicators, synthesize_monthly_insight
)
from insight_automation.logic.sources.perplexity import (
    get_trending_menu_info, get_popular_cafe_features
)
from insight_automation.utils.storage import save_report_to_s3 # type: ignore

@dataclass
class GState:
    cafeId: int
    overwrite: bool = False
    indicators: Dict[str, Any] | None = None
    menus: List[Any] = field(default_factory=list)
    features: List[Any] = field(default_factory=list)
    report: Dict[str, Any] | None = None
    logs: List[str] = field(default_factory=list)

def fetch_indicators(state: GState) -> GState:
    state.indicators = get_monthly_indicators(state.cafeId)
    state.logs.append("indicators:fetched")
    return state

def fetch_trends(state: GState) -> GState:
    try:
        state.menus = get_trending_menu_info()[:3]
        state.features = get_popular_cafe_features()[:3]
        state.logs.append("trends:fetched")
    except Exception:
        state.logs.append("trends:failed")
    return state

def synthesize_and_store(state: GState) -> GState:
    state.report = synthesize_monthly_insight(
        state.indicators,
        state.menus,
        state.features,
    )
    save_report_to_s3(
        cafe_id=state.cafeId,
        period=state.report["period"],
        payload=state.report,
        overwrite=state.overwrite
    )
    state.logs.append("report:stored")
    return state

def build_graph():
    g = StateGraph(GState)
    g.add_node("fetch_indicators", fetch_indicators)
    g.add_node("fetch_trends", fetch_trends)
    g.add_node("synthesize_and_store", synthesize_and_store)

    g.set_entry_point("fetch_indicators")
    g.add_edge("fetch_indicators", "fetch_trends")
    g.add_edge("fetch_trends", "synthesize_and_store")
    g.add_edge("synthesize_and_store", END)
    return g.compile()
