import requests
import os
import json
from dotenv import load_dotenv
load_dotenv()

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"

def ensure_dict_array_from_text(text: str) -> list[dict]:
    """
    Perplexity가 반환한 JSON 문자열을 dict 리스트로 변환
    """
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        print(f"⚠️ JSON 파싱 실패 → text 그대로 반환: {text[:200]}...")
        return []

    if isinstance(data, dict):
        return [data]
    elif isinstance(data, list):
        return [obj for obj in data if isinstance(obj, dict)]
    else:
        return []
    
def fetch_cafe_trend(prompt: str) -> str:
    if not PERPLEXITY_API_KEY:
        raise RuntimeError("PERPLEXITY_API_KEY is not set")

    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "model": "sonar-pro",
        "messages": [
            {"role": "system", "content": "Be precise and concise."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 500
    }

    resp = requests.post(PERPLEXITY_URL, json=data, headers=headers, timeout=60)


    print(f"🔍 Status: {resp.status_code}")
    print(f"🔍 Raw Response: {resp.text}")

    resp.raise_for_status()

    j = resp.json()
    try:
        return j["choices"][0]["message"]["content"]
    except Exception as e:
        raise RuntimeError(f"Unexpected Perplexity response shape: {j}") from e

def fetch_menu_trends() -> str:
    """
    Perplexity API를 통해 인기 카페 메뉴 트렌드 데이터를 JSON 문자열로 가져옴
    """
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
    return fetch_cafe_trend(prompt)


def fetch_cafe_features() -> str:
    """
    Perplexity API를 통해 인기 있는 카페 특징 정보를 JSON 문자열로 가져옴
    """
    prompt = """2025년 한국에서 인기가 많은 카페들이 공통적으로 갖고 있는 특징을 조사해 주세요.
예: 분위기, 좌석 구성, 운영 시간, 서비스, 디저트 종류 등
결과는 JSON 배열로 요약해 주세요.

[
  {
    "feature": "특징 이름",
    "description": "이 특징이 왜 중요한지",
    "exampleCafe": "이 특징을 갖춘 대표 카페 이름 또는 설명"
  }
]
한국어로 응답해 주세요.
"""
    return fetch_cafe_trend(prompt)