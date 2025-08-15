from typing import List
from insight_automation.utils.perplexity import fetch_menu_trends
from insight_automation.utils.jsonsafe import coerce_json_array
from insight_automation.logic.schemas import MenuTrendItem

def _map_legacy_keys(obj: dict) -> dict:
    if "example" in obj and "exampleCafe" not in obj:
        obj["exampleCafe"] = obj["example"]
    if "whyPopular" in obj and "whyEffective" not in obj:
        obj["whyEffective"] = obj["whyPopular"]
    return obj

def get_trending_menu_info() -> List[MenuTrendItem]:
    text = fetch_menu_trends()
    arr, _reason = coerce_json_array(text)
    items: List[MenuTrendItem] = []
    for obj in arr:
        try:
            items.append(MenuTrendItem(**_map_legacy_keys(obj)))
        except Exception:
            continue
    return items
