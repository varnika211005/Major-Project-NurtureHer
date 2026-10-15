import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models  # noqa: F401 - register all models on Base.metadata
from app.core.database import Base
from app.core.security import UserRole
from app.models.user import User
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


@pytest.fixture
async def db_session():
    """Isolated in-memory SQLite session (no external DB, no network)."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            yield session
    finally:
        await engine.dispose()


async def make_chat_user(db, email: str = "chat@example.com") -> User:
    user = User(
        email=email,
        name="Chat User",
        password_hash="x",
        role=UserRole.MOTHER,
        preferred_language="en",
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    return user
