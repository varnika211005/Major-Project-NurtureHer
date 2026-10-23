from app.models.enums import MoodOption
from app.models.user import MotherProfile
from app.models.wellness import Mood
from app.rag.context_builder import HealthContextBuilder
from tests.conftest import make_chat_user


async def _profile(db, user, *, age, pregnancy_status, district, village):
    profile = MotherProfile(
        user_id=user.id,
        age=age,
        pregnancy_status=pregnancy_status,
        district=district,
        village=village,
    )
    db.add(profile)
    await db.commit()
    return profile


async def test_chat_context_excludes_location_and_irrelevant_profile_fields(db_session):
    mother = await make_chat_user(db_session, email="context-min@example.com")
    await _profile(
        db_session,
        mother,
        age=29,
        pregnancy_status="2nd Trimester (Weeks 13-26)",
        district="Bengaluru Urban",
        village="Test Village",
    )
    context = await HealthContextBuilder(db_session)._build_user_context(mother, "en", "I have period cramps")
    assert "Bengaluru" not in context
    assert "Test Village" not in context
    assert "Location" not in context
    assert "2nd Trimester" not in context
    assert "Age: 29" in context


async def test_chat_context_is_limited_to_authenticated_user(db_session):
    mother_a = await make_chat_user(db_session, email="context-a@example.com")
    mother_b = await make_chat_user(db_session, email="context-b@example.com")
    await _profile(
        db_session,
        mother_a,
        age=29,
        pregnancy_status="2nd Trimester",
        district="District A",
        village="Village A",
    )
    await _profile(
        db_session,
        mother_b,
        age=41,
        pregnancy_status="Postpartum",
        district="District B",
        village="Village B",
    )
    db_session.add(Mood(user_id=mother_a.id, mood=MoodOption.SAD))
    db_session.add(Mood(user_id=mother_b.id, mood=MoodOption.HAPPY))
    await db_session.commit()

    context_a = await HealthContextBuilder(db_session)._build_user_context(mother_a, "en", "I feel anxious")
    context_b = await HealthContextBuilder(db_session)._build_user_context(mother_b, "en", "I feel anxious")
    pregnancy_a = await HealthContextBuilder(db_session)._build_user_context(mother_a, "en", "I am pregnant")
    pregnancy_b = await HealthContextBuilder(db_session)._build_user_context(mother_b, "en", "I am pregnant")

    assert "Latest mood: sad" in context_a
    assert "happy" not in context_a
    assert "Age: 41" not in context_a
    assert "Postpartum" not in context_a
    assert "Latest mood: happy" in context_b
    assert "sad" not in context_b
    assert "Age: 29" not in context_b
    assert "2nd Trimester" in pregnancy_a
    assert "Postpartum" not in pregnancy_a
    assert "District B" not in pregnancy_a
    assert "Postpartum" in pregnancy_b
    assert "2nd Trimester" not in pregnancy_b
    assert "District A" not in pregnancy_b
