"""Regression tests for the nine-field PCOS screening contract.

Covers: blank/required validation, the 2-or-4 cycle encoding, exact
nine-feature preprocessing order, live-model prediction shape, and a
nine-feature-compatible fallback when the artifact is missing.
"""

from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.ml import prediction_service as prediction_service_module
from app.ml.model_loader import RuleBasedPCOSFallback, load_pcos_model
from app.ml.prediction_service import PCOSPredictionService
from app.ml.preprocessing import FEATURE_ORDER, preprocess_pcos_features
from app.models.enums import RiskLevel
from app.schemas.health import PCOSPredictRequest


def make_payload(**overrides):
    values = {
        "age": 28,
        "bmi": 24.5,
        "cycle": 2,
        "cycle_length": 30,
        "weight_gain": False,
        "hair_growth": False,
        "skin_darkening": False,
        "hair_loss": False,
        "pimples": False,
    }
    values.update(overrides)
    return PCOSPredictRequest(**values)


def test_cycle_accepts_only_2_or_4():
    assert make_payload(cycle=2).cycle == 2
    assert make_payload(cycle=4).cycle == 4
    for invalid in (1, 3, 5, 0):
        with pytest.raises(ValidationError):
            make_payload(cycle=invalid)


def test_required_fields_reject_missing_values():
    base = {
        "age": 28,
        "bmi": 24.5,
        "cycle": 2,
        "cycle_length": 30,
        "weight_gain": False,
        "hair_growth": False,
        "skin_darkening": False,
        "hair_loss": False,
        "pimples": False,
    }
    for field in ("age", "bmi", "cycle", "cycle_length"):
        values = {key: value for key, value in base.items() if key != field}
        with pytest.raises(ValidationError):
            PCOSPredictRequest(**values)


def test_preprocessing_preserves_nine_feature_training_order():
    payload = make_payload(
        age=31,
        bmi=27.5,
        cycle=4,
        cycle_length=42,
        weight_gain=True,
        hair_growth=True,
        skin_darkening=False,
        hair_loss=True,
        pimples=False,
    )
    assert FEATURE_ORDER == [
        "Age",
        "BMI",
        "Cycle",
        "Cycle length",
        "Weight gain",
        "Hair growth",
        "Skin darkening",
        "Hair loss",
        "Pimples",
    ]
    assert preprocess_pcos_features(payload) == [31.0, 27.5, 4.0, 42.0, 1.0, 1.0, 0.0, 1.0, 0.0]


def test_model_artifact_exists_with_nine_features():
    path = Path(settings.pcos_model_path)
    assert path.exists(), f"Trained model artifact missing at {path}"
    model = load_pcos_model()
    assert getattr(model, "n_features_in_", 9) == 9


def test_live_prediction_returns_risk_probability_recommendations():
    payload = make_payload()
    risk, probability, recommendations = PCOSPredictionService().predict(payload)
    assert isinstance(risk, RiskLevel)
    assert 0.0 <= probability <= 1.0
    assert isinstance(recommendations, str) and recommendations.strip()
    # Deterministic for identical inputs (no cached/stale results).
    assert PCOSPredictionService().predict(payload) == (risk, probability, recommendations)


def test_risk_thresholds_follow_probability():
    class StubModel:
        def __init__(self, probability: float):
            self.probability = probability

        def predict_proba(self, values):
            assert len(values[0]) == 9
            return [[1 - self.probability, self.probability]]

    cases = [(0.8, RiskLevel.HIGH), (0.5, RiskLevel.MODERATE), (0.1, RiskLevel.LOW)]
    for probability, expected_risk in cases:
        prediction_service_module.load_pcos_model = lambda prob=probability: StubModel(prob)  # type: ignore[assignment]
        try:
            risk, returned_probability, recommendations = PCOSPredictionService().predict(make_payload())
        finally:
            prediction_service_module.load_pcos_model = load_pcos_model
        assert risk == expected_risk
        assert returned_probability == probability
        assert recommendations.strip()


def test_fallback_supports_nine_features():
    fallback = RuleBasedPCOSFallback()
    low = fallback.predict_proba([[28, 22.0, 2, 30, 0, 0, 0, 0, 0]])[0][1]
    high = fallback.predict_proba([[28, 33.0, 4, 45, 1, 1, 1, 1, 1]])[0][1]
    assert 0.0 <= low <= 1.0
    assert 0.0 <= high <= 1.0
    assert high > low


def test_fallback_rejects_wrong_feature_count():
    with pytest.raises(ValueError):
        RuleBasedPCOSFallback().predict_proba([[28, 22.0, 2, 30, 0, 0, 0]])


def test_missing_artifact_falls_back_safely(monkeypatch, tmp_path):
    missing = tmp_path / "no-model.pkl"
    monkeypatch.setattr(settings, "pcos_model_path", str(missing))
    load_pcos_model.cache_clear()
    try:
        model = load_pcos_model()
        assert isinstance(model, RuleBasedPCOSFallback)
        probability = float(model.predict_proba([preprocess_pcos_features(make_payload())])[0][1])
        assert 0.0 <= probability <= 1.0
    finally:
        load_pcos_model.cache_clear()
