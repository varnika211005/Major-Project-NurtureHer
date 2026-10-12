from app.schemas.health import PCOSPredictRequest
from app.ml.prediction_service import PCOSPredictionService


def predict_pcos_risk(payload: PCOSPredictRequest):
    return PCOSPredictionService().predict(payload)

