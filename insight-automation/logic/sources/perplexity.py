import requests
import os
from typing import List
from utils.perplexity import fetch_cafe_trend
from utils.jsonsafe import coerce_json_array
from logic.schemas import MenuTrendItem, CafeFeatureItem

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

def _map_legacy_keys(obj: dict) -> dict:
    """프롬프트/모델에 따라 키가 살짝 다를 수 있어 호환 처리."""
    mapped = dict(obj)
    # menu trends: allow "example" -> "exampleCafe"
    if "example" in mapped and "exampleCafe" not in mapped:
        mapped["exampleCafe"] = mapped["example"]
    # features: allow "whyPopular" -> "whyEffective" fallback 등
    if "whyPopular" in mapped and "whyEffective" not in mapped:
        # 의미가 비슷하면 옮겨줌(트렌드/특징 프롬프트를 혼용했을 때 대비)
        mapped["whyEffective"] = mapped["whyPopular"]
    return mapped


def get_trending_menu_info() -> List[MenuTrendItem]:
    prompt = """당신은 F&B 트렌드 분석가입니다.
2025년 현재 한국에서 인기 있는 카페 메뉴 트렌드를 조사해 주세요.
신메뉴, 재조명된 음료, 고객 반응이 좋은 메뉴 등을 중심으로 요약해 주세요.
결과는 JSON 배열로 다음 형식에 맞춰 주세요:

[
  {
    "menu": "메뉴 이름",
    "description": "이 메뉴가 어떤 특징을 가지고 있는지",
    "whyPopular": "인기 있는 이유",
    "exampleCafe": "이 메뉴를 제공하는 대표 카페 이름 또는 예시"
  }
]
한국어로 응답해 주세요.
"""
    text = fetch_cafe_trend(prompt)
    arr, _reason = coerce_json_array(text)
    items: List[MenuTrendItem] = []
    for obj in arr:
        try:
            items.append(MenuTrendItem(**_map_legacy_keys(obj)))
        except Exception:
            # 유효하지 않은 항목은 스킵 (로깅 필요시 여기서 처리)
            continue
    return items


def get_popular_cafe_features() -> List[CafeFeatureItem]:
    prompt = """2025년 한국에서 인기가 많은 카페들이 공통적으로 갖고 있는 특징을 조사해 주세요.
예: 분위기, 좌석 구성, 운영 시간, 서비스, 디저트 종류 등
결과는 JSON 배열로 요약해 주세요.

[
  {
    "feature": "특징 이름",
    "description": "이 특징이 왜 중요한지",
    "example": "이 특징을 갖춘 대표 카페 이름 또는 설명"
  }
]
한국어로 응답해 주세요.
"""
    text = fetch_cafe_trend(prompt)
    arr, _reason = coerce_json_array(text)
    items: List[CafeFeatureItem] = []
    for obj in arr:
        # example -> exampleCafe 호환
        if "example" in obj and "exampleCafe" not in obj:
            obj["exampleCafe"] = obj["example"]
        try:
            items.append(CafeFeatureItem(**obj))
        except Exception:
            continue
    return items