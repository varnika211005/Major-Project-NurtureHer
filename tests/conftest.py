import pytest

from app.schemas.health import PCOSPredictRequest, PPDAssessmentRequest


@pytest.fixture
def high_pcos_payload() -> PCOSPredictRequest:
    return PCOSPredictRequest(
        age=29,
        bmi=34,
        cycle=4,
        cycle_length=45,
        weight_gain=True,
        hair_growth=True,
        skin_darkening=True,
        hair_loss=True,
        pimples=True,
    )


@pytest.fixture
def moderate_ppd_payload() -> PPDAssessmentRequest:
    return PPDAssessmentRequest(answers=[1, 1, 1, 1, 1, 1, 1, 1, 1, 1], journal_text="I feel tired and alone")
