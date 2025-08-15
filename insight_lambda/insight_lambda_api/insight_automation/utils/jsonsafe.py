import json
import re
from typing import Any, Dict, List, Tuple


FENCE_RE = re.compile(r"```(?:json)?(.*?)```", re.DOTALL | re.IGNORECASE)


def _strip_code_fences(text: str) -> str:
    m = FENCE_RE.search(text)
    if m:
        return m.group(1).strip()
    return text.strip()


def _try_json(text: str):
    try:
        return json.loads(text)
    except Exception:
        return None


def _fix_trailing_commas(text: str) -> str:
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text


def normalize_to_array(data: Any) -> List[Dict]:
    """
    응답이 배열이 아니어도 최대한 배열[dict] 형태로 정규화.
    """
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if isinstance(data, dict):
        return [data]
    return []


def coerce_json_array(text: str) -> Tuple[List[Dict], str]:
    """
    - 코드펜스 제거
    - JSON 로드
    - 실패 시 트레일링 콤마 제거 후 재시도
    - 최종적으로 배열[dict] 반환 (실패 시 빈 배열)
    - 디버그용 reason 문자열 함께 반환
    """
    raw = _strip_code_fences(text)
    data = _try_json(raw)
    if data is not None:
        return normalize_to_array(data), "ok"

    fixed = _fix_trailing_commas(raw)
    data2 = _try_json(fixed)
    if data2 is not None:
        return normalize_to_array(data2), "fixed_trailing_commas"

    bracket_match = re.search(r"(\[.*\]|\{.*\})", raw, re.DOTALL)
    if bracket_match:
        data3 = _try_json(bracket_match.group(1))
        if data3 is not None:
            return normalize_to_array(data3), "extracted_brackets"

    return [], "failed"
