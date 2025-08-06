import os
import openai
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def get_weekly_comparison_insight():
    # 예시 지표 (나중엔 DB에서 불러오도록 변경할 것)
    indicators = {
        "thisWeek": {
            "visits": 340,
            "newCustomers": 50,
            "revisitRate": 0.32
        },
        "lastWeek": {
            "visits": 280,
            "newCustomers": 60,
            "revisitRate": 0.28
        }
    }

    prompt = f"""
    당신은 카페 데이터를 분석하여 인사이트를 생성하는 데이터 분석가입니다.

    다음은 지난주와 이번 주의 카페 지표입니다:

    지난주:
    - 방문 수: {indicators['lastWeek']['visits']}
    - 신규 고객 수: {indicators['lastWeek']['newCustomers']}
    - 재방문율: {indicators['lastWeek']['revisitRate'] * 100}%

    이번 주:
    - 방문 수: {indicators['thisWeek']['visits']}
    - 신규 고객 수: {indicators['thisWeek']['newCustomers']}
    - 재방문율: {indicators['thisWeek']['revisitRate'] * 100}%

    이 데이터를 바탕으로 아래 형식으로 인사이트를 작성해주세요:
        [
            {{
                "type": "weekly_comparison",
                "content": "이번 주 카페는 지난주에 비해 방문 수가 증가했고, 재방문율도 상승했습니다. 특히 주말에 방문이 집중되었습니다. ..."
            }}
        ]

    모든 응답은 한국어로 작성해주세요.
    """

    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "당신은 친절한 카페 인사이트 분석가입니다."},
            {"role": "user", "content": prompt}
        ]
    )

    content = response["choices"][0]["message"]["content"]

    return {
        "type": "weekly_comparison",
        "content": content
    }