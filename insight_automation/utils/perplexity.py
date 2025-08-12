import requests
import os

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"

def fetch_cafe_trend(prompt: str) -> str:
    if not PERPLEXITY_API_KEY:
        raise RuntimeError("PERPLEXITY_API_KEY is not set")

    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "model": "llama-3-sonar-small-32k-online",
        "messages": [{"role": "user", "content": prompt}],
    }
    resp = requests.post(PERPLEXITY_URL, json=data, headers=headers, timeout=60)
    resp.raise_for_status()

    j = resp.json()
    # 방어적으로 키 존재 확인
    try:
        return j["choices"][0]["message"]["content"]
    except Exception as e:
        raise RuntimeError(f"Unexpected Perplexity response shape: {j}") from e