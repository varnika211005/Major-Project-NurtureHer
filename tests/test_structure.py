import importlib


def test_requested_repository_modules_importable():
    modules = [
        "app.repositories.users",
        "app.repositories.mother_profiles",
        "app.repositories.moods",
        "app.repositories.symptoms",
        "app.repositories.journals",
        "app.repositories.cycles",
        "app.repositories.pcos",
        "app.repositories.ppd",
        "app.repositories.chat",
        "app.repositories.caregiver",
        "app.repositories.high_risk",
        "app.repositories.alerts",
    ]
    for module in modules:
        assert importlib.import_module(module)


def test_requested_service_modules_importable():
    modules = [
        "app.services.auth",
        "app.services.wellness",
        "app.services.cycle",
        "app.services.pcos",
        "app.services.ppd",
        "app.services.chatbot",
        "app.services.caregiver",
        "app.services.notification",
        "app.services.notification_service",
        "app.services.sms_provider",
        "app.services.risk_engine",
        "app.services.alert_service",
        "app.services.gemini_service",
        "app.services.rag_service",
        "app.services.memory_service",
        "app.services.chat_service",
        "app.services.ppd_service",
        "app.services.scoring_engine",
        "app.services.voice_service",
        "app.services.chatbot_service",
        "app.services.translation_service",
        "app.services.speech_service",
        "app.services.sentiment_service",
        "app.services.epds_service",
    ]
    for module in modules:
        assert importlib.import_module(module)


def test_requested_ml_and_observability_modules_importable():
    modules = [
        "app.ml.model_loader",
        "app.ml.preprocessing",
        "app.ml.prediction_service",
        "app.ml.preprocess_pcos",
        "app.ml.train_pcos",
        "app.analytics.dashboard",
        "app.monitoring.metrics",
    ]
    for module in modules:
        assert importlib.import_module(module)


def test_requested_api_modules_importable():
    modules = [
        "app.api.auth",
        "app.api.wellness",
        "app.api.pcos",
        "app.api.ppd",
        "app.api.chatbot",
        "app.api.caregiver",
        "app.api.cycle",
        "app.api.admin",
    ]
    for module in modules:
        assert importlib.import_module(module)
