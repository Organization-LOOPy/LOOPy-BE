from typing import Optional
from pydantic import BaseModel, Field, validator


class MenuTrendItem(BaseModel):
    menu: str = Field(..., description="메뉴 이름")
    description: Optional[str] = Field("", description="설명")
    whyPopular: Optional[str] = Field("", description="인기 있는 이유")
    exampleCafe: Optional[str] = Field("", description="예시 카페")

    @validator("exampleCafe", pre=True, always=True)
    def coerce_example_cafe(cls, v, values):
        if v is not None:
            return v
        return v


class CafeFeatureItem(BaseModel):
    feature: str = Field(..., description="특징 이름")
    description: Optional[str] = Field("", description="설명")
    whyEffective: Optional[str] = Field("", description="인기/효과 이유")
    exampleCafe: Optional[str] = Field("", description="예시 카페")
