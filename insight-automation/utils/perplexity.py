import requests
import os

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

def fetch_cafe_trend(prompt: str) -> str:
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama-3-sonar-small-32k-online",
        "messages": [{"role": "user", "content": prompt}]
    }

    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()

    return response.json()["choices"][0]["message"]["content"]
