from __future__ import annotations
import json
import re

from typing import Any, Dict, Iterable, List, Sequence, Union

from insight_automation.utils.perplexity import ensure_dict_array_from_text
from insight_automation.logic.schemas import CafeFeatureItem, MenuTrendItem
from insight_automation.utils.jsonsafe import coerce_json_array

JsonLike = Union[str, Sequence[Dict[str, Any]], Sequence[MenuTrendItem], Sequence[CafeFeatureItem]]

def safe_json_parse(text: str):
    """Perplexity 응답에서 JSON 부분만 안전하게 추출/파싱"""
    if not text:
        print("⚠️ safe_json_parse: 입력이 비어 있음")
        return None
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            parsed = json.loads(match.group(0))
            print(f"✅ JSON 파싱 성공 (길이={len(str(parsed))})")
            return parsed
        parsed = json.loads(text)
        print(f"✅ JSON 파싱 성공 (길이={len(str(parsed))})")
        return parsed
    except Exception as e:
        print(f"❌ JSON 파싱 실패: {e}\n원본 텍스트:\n{text[:300]}...")
        return None
    
def _map_menu_keys(odj: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perplexity가 키를 살짝 다르게 줄 때 호환 처리.
    - example -> exampleCafe
    """
    mapped = dict(odj) 
    if "exampleCafe" not in mapped and "example" in mapped:
        mapped["exampleCafe"] = mapped["example"]
    return mapped

def _map_feature_keys(obj: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perplexity가 키를 혼용할 수 있어 호환 처리.
    - example -> exampleCafe
    - whyPopular -> whyEffective
    """
    mapped = dict(obj)
    if "exampleCafe" not in mapped and "example" in mapped:
        mapped["exampleCafe"] = mapped["example"]
    if "whyEffective" not in mapped and "whyPopular" in mapped:
        mapped["whyEffective"] = mapped["whyPopular"]
    return mapped

def _ensure_dict_array(payload: JsonLike) -> List[Dict[str,Any]]:
    """
    문자열이면 JSON으로 파싱하고, 이미 dict 리스트면 그대로 반환.
    Pydantic 모델 리스트인 경우 dict로 변환.
    실패 시 빈 리스트.
    """
    if isinstance(payload, str):
        arr, _reason = coerce_json_array(payload)
        return arr

    # pydantic 모델 인스턴스 리스트인 경우
    if isinstance(payload, Iterable) and not isinstance(payload, (str, bytes)):
        out: List[Dict[str, Any]] = []
        for item in payload:  # type: ignore[assignment]
            if isinstance(item, (MenuTrendItem, CafeFeatureItem)):
                out.append(item.dict())
            elif isinstance(item, dict):
                out.append(item)
            else:
                # 알 수 없는 타입은 스킵
                continue
        return out

    return []

def parse_menu_trends(payload: str, max_items: int | None = None) -> list[MenuTrendItem]:
    print("📥 parse_menu_trends 호출됨")
    dicts = ensure_dict_array_from_text(payload)
    print(f"  - dicts 개수: {len(dicts)}")

    items: list[MenuTrendItem] = []
    for obj in dicts:
        try:
            items.append(MenuTrendItem(**_map_menu_keys(obj)))
        except Exception as e:
            print(f"⚠️ MenuTrendItem 변환 실패: {e} | 데이터: {obj}")
            continue

    print(f"  - 변환 성공 개수: {len(items)}")
    return items[:max_items] if max_items else items



def parse_cafe_features(payload: JsonLike, max_items: int | None = None) -> List[CafeFeatureItem] | None:
    print("📥 parse_cafe_features 호출됨")
    dicts = _ensure_dict_array(payload)
    print(f"  - dicts 개수: {len(dicts)}")

    items: List[CafeFeatureItem] = []
    for obj in dicts:
        try:
            items.append(CafeFeatureItem(**_map_feature_keys(obj)))
        except Exception as e:
            print(f"⚠️ CafeFeatureItem 변환 실패: {e} | 데이터: {obj}")
            continue

    print(f"  - 변환 성공 개수: {len(items)}")

    if not items:  # 변환 성공이 없으면 None 반환
        return None

    return items[:max_items] if max_items else items
