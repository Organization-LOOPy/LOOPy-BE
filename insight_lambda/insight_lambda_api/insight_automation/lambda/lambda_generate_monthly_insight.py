import os
from datetime import datetime
from langgraph.graph import END
from insight_automation.graph.monthly_graph import build_graph, GState

def lambda_handler(event, context):
    cafe_id = int(os.environ.get("CAFE_ID", "1"))
    graph = build_graph()

    # 현재 연월 (예: 2025-08)
    month_str = datetime.utcnow().strftime("%Y-%m")

    state = GState(
        cafeId=cafe_id,
        overwrite=True
    )
    graph.invoke(state)

    return {
        "statusCode": 200,
        "body": f"Monthly insight for {month_str} generated for cafe {cafe_id}."
    }
