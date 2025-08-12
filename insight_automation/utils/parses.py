from __future__ import annotations

from typing import Any, Dict, Iterable, List, Sequence, Union

from insight_automation.logic.schemas import CafeFeatureItem, MenuTrendItem
from insight_automation.utils.jsonsafe import coerce_json_array

JsonLike = Union[str, Sequence[Dict[str, Any]], Sequence[MenuTrendItem], Sequence[CafeFeatureItem]]

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

def parse_menu_trends(payload: JsonLike, max_items: int | None = None) -> List[MenuTrendItem]:
    """
    Perplexity '메뉴 트렌드' 응답을 List[MenuTrendItem]로 파싱.
    - payload: JSON 문자열, dict 리스트, 또는 MenuTrendItem 리스트
    - max_items: 상위 n개만 반환하고 싶을 때 지정
    """
    if isinstance(payload, list) and payload and isinstance(payload[0], MenuTrendItem):
        items = payload  # type: ignore[assignment]
        return items[:max_items] if max_items else items  # type: ignore[return-value]

    dicts = _ensure_dict_array(payload)
    items: List[MenuTrendItem] = []
    for obj in dicts:
        try:
            items.append(MenuTrendItem(**_map_menu_keys(obj)))
        except Exception:
            continue

    return items[:max_items] if max_items else items

def parse_cafe_features(payload: JsonLike, max_items: int | None = None) -> List[CafeFeatureItem]:
    """
    Perplexity '인기 카페 특징' 응답을 List[CafeFeatureItem]로 파싱.
    - payload: JSON 문자열, dict 리스트, 또는 CafeFeatureItem 리스트
    - max_items: 상위 n개만 반환하고 싶을 때 지정
    """
    # 이미 모델 리스트인 경우
    if isinstance(payload, list) and payload and isinstance(payload[0], CafeFeatureItem):
        items = payload  # type: ignore[assignment]
        return items[:max_items] if max_items else items  # type: ignore[return-value]

    dicts = _ensure_dict_array(payload)
    items: List[CafeFeatureItem] = []
    for obj in dicts:
        try:
            items.append(CafeFeatureItem(**_map_feature_keys(obj)))
        except Exception:
            continue

    return items[:max_items] if max_items else items


__all__ = ["parse_menu_trends", "parse_cafe_features"]