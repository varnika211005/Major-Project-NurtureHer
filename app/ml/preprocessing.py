from app.schemas.health import PCOSPredictRequest

FEATURE_ORDER = [
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


def preprocess_pcos_features(payload: PCOSPredictRequest) -> list[float]:
    return [
        float(payload.age),
        float(payload.bmi),
        float(payload.cycle),
        float(payload.cycle_length),
        float(payload.weight_gain),
        float(payload.hair_growth),
        float(payload.skin_darkening),
        float(payload.hair_loss),
        float(payload.pimples),
    ]