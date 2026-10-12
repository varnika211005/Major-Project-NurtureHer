from app.ml.pcos_model import predict_pcos_risk
from app.ml.sentiment import analyze_sentiment
from app.models.enums import RiskLevel
from app.models.wellness import Cycle
from app.schemas.health import PCOSPredictRequest
from datetime import date

from app.ml.preprocess_pcos import load_training_csv


def test_pcos_high_risk_prediction():
    payload = PCOSPredictRequest(
        age=28,
        bmi=33,
        cycle=4,
        cycle_length=45,
        weight_gain=True,
        hair_growth=True,
        skin_darkening=True,
        hair_loss=True,
        pimples=True,
    )
    risk, probability, _ = predict_pcos_risk(payload)
    assert risk == RiskLevel.HIGH
    assert probability >= 0.65


def test_sentiment_negative():
    assert analyze_sentiment("I feel hopeless and alone") == "negative"


def test_cycle_prediction_date():
    assert Cycle.predicted_date(date(2026, 6, 1), 28) == date(2026, 6, 29)


def test_pcos_training_csv_preprocessing(tmp_path):
    csv_path = tmp_path / "pcos.csv"
    csv_path.write_text(
        "age,bmi,cycle,cycle_length,weight_gain,hair_growth,skin_darkening,hair_loss,pimples,pcos\n"
        "28,31.2,4,45,true,false,false,true,true,1\n",
        encoding="utf-8",
    )
    features, labels = load_training_csv(csv_path)
    assert labels == [1]
    assert features[0] == [28.0, 31.2, 4.0, 45.0, 1.0, 0.0, 0.0, 1.0, 1.0]
