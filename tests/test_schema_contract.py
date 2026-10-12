from app.core.database import Base


def test_database_contract_columns():
    tables = Base.metadata.tables

    assert "created_at" in tables["mother_profiles"].columns
    assert "parameters" not in tables["pcos_predictions"].columns
    assert "answers" not in tables["ppd_assessments"].columns
    assert "risk_type" in tables["high_risk_cases"].columns
    assert "sent_status" in tables["alerts"].columns
    assert "audit_logs" in tables
    assert "refresh_tokens" in tables
    assert "district" in tables["mother_profiles"].columns
    assert "village" in tables["mother_profiles"].columns
    for table in tables.values():
        assert "updated_at" in table.columns
        assert "deleted_at" in table.columns
