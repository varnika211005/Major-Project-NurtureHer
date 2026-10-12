import logging
import joblib 
from functools import lru_cache
from pathlib import Path
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger(__name__)


class ProbabilityModel(Protocol):
    def predict_proba(self, values: list[list[float]]) -> list[list[float]]:
        ...


class RuleBasedPCOSFallback:
    """Calibrated heuristic used only when the trained artifact is missing.

    Compatible with the nine-feature live schema:
    (age, bmi, cycle, cycle_length, weight_gain, hair_growth,
    skin_darkening, hair_loss, pimples).
    """

    def predict_proba(self, values: list[list[float]]) -> list[list[float]]:
        features = values[0]
        if len(features) != 9:
            raise ValueError(f"PCOS fallback expects 9 features, received {len(features)}")
        _, bmi, cycle, _, weight_gain, hair_growth, skin_darkening, hair_loss, pimples = features
        probability = 0.05
        probability += 0.20 if cycle == 4 else 0
        probability += 0.15 if bmi >= 30 else 0.07 if bmi >= 25 else 0
        probability += 0.10 if weight_gain else 0
        probability += 0.10 if hair_growth else 0
        probability += 0.08 if skin_darkening else 0
        probability += 0.05 if hair_loss else 0
        probability += 0.05 if pimples else 0
        probability = round(min(probability, 0.98), 4)
        return [[1 - probability, probability]]


@lru_cache
def load_pcos_model() -> ProbabilityModel:
    path = Path(settings.pcos_model_path)
    if path.exists():
        logger.info("Loading PCOS model from %s", path)
        return joblib.load(path)

    logger.warning("PCOS model not found at %s; using calibrated rule-based fallback", path)
    return RuleBasedPCOSFallback()

