from dotenv import load_dotenv
from logic.generate_insight import generate_insight

load_dotenv()

if __name__ == "__main__":
    insight = generate_insight(cafe_id=1, enforce_schedule=False)
    print(f"[{insight['type']}] 생성 결과:")
    print(insight["content"])
