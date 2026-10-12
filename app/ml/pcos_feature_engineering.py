from app.schemas.health import PCOSPredictRequest


def engineer_pcos_features(payload: PCOSPredictRequest) -> dict[str, float]:
    symptom_burden = sum(
        [
            payload.weight_gain,
            payload.hair_growth,
            payload.skin_darkening,
            payload.hair_loss,
            payload.pimples,
            payload.bmi >= 25,
            payload.cycle == 4,
        ]
    )
    return {
        "age": float(payload.age),
        "bmi": float(payload.bmi),
        "cycle_category_4": 1.0 if payload.cycle == 4 else 0.0,
        "cycle_length": float(payload.cycle_length),
        "weight_gain": 1.0 if payload.weight_gain else 0.0,
        "hair_growth": 1.0 if payload.hair_growth else 0.0,
        "skin_darkening": 1.0 if payload.skin_darkening else 0.0,
        "hair_loss": 1.0 if payload.hair_loss else 0.0,
        "pimples": 1.0 if payload.pimples else 0.0,
        "symptom_burden": float(symptom_burden),
        "metabolic_signal": 1.0 if payload.bmi >= 30 or payload.skin_darkening else 0.0,
    }
