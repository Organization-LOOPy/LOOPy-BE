from logic.generate_insight import generate_insight
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    insight = generate_insight()
    print(f"[{insight['type']}] 인사이트 생성 완료:\n")
    print(insight["content"])
