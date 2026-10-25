import uuid
import pytest
from collections.abc import AsyncIterator
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.api.deps import get_current_user
from app.core.database import Base, get_db
from app.core.security import UserRole, hash_password
from app.main import app
from app.models.user import User

PASSWORD = "Password123!"


@pytest.fixture
async def education_test_client() -> AsyncIterator[tuple[AsyncClient, async_sessionmaker[AsyncSession], dict[str, User | None]]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    current_user_box: dict[str, User | None] = {"user": None}

    async def override_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    async def override_current_user() -> User:
        user = current_user_box["user"]
        if user is None:
            raise HTTPException(status_code=401, detail="Authentication credentials were not provided")
        return user

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client, session_factory, current_user_box
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)
        await engine.dispose()


@pytest.mark.asyncio
async def test_education_categories(education_test_client):
    client, session_factory, current_user_box = education_test_client

    async with session_factory() as session:
        mother = User(
            id=uuid.uuid4(),
            email="mother.edu@example.com",
            name="Mother Edu",
            password_hash=hash_password(PASSWORD),
            role=UserRole.MOTHER,
            is_verified=True,
            is_active=True,
        )
        session.add(mother)
        await session.commit()

    current_user_box["user"] = mother

    res = await client.get("/api/v1/education/categories")
    assert res.status_code == 200
    data = res.json()
    assert "video_categories" in data
    assert "article_categories" in data
    assert len(data["video_categories"]) >= 8
    assert len(data["article_categories"]) == 8
    assert "Pregnancy care and trimester-wise guidance" in data["video_categories"]
    assert "Emergency warning signs and first-aid guidance" in data["article_categories"]


@pytest.mark.asyncio
async def test_education_list_and_filters(education_test_client):
    client, session_factory, current_user_box = education_test_client

    async with session_factory() as session:
        mother = User(
            id=uuid.uuid4(),
            email="mother.edu2@example.com",
            name="Mother Edu 2",
            password_hash=hash_password(PASSWORD),
            role=UserRole.MOTHER,
            is_verified=True,
            is_active=True,
        )
        session.add(mother)
        await session.commit()

    current_user_box["user"] = mother

    # 1. List all resources (auto-populates default seed: 6 videos + 8 articles = 14)
    res = await client.get("/api/v1/education/resources")
    assert res.status_code == 200
    all_items = res.json()
    assert len(all_items) == 14

    # 2. Filter by video (6 multilingual videos)
    res_videos = await client.get("/api/v1/education/videos")
    assert res_videos.status_code == 200
    videos = res_videos.json()
    assert len(videos) == 6
    for v in videos:
        assert v["content_type"] == "video"
        assert v["video_url"] is not None

    # 3. Filter by article
    res_articles = await client.get("/api/v1/education/articles")
    assert res_articles.status_code == 200
    articles = res_articles.json()
    assert len(articles) == 8
    for a in articles:
        assert a["content_type"] == "article"
        assert len(a["article_content"]) > 50

    # 4. Search query
    res_search = await client.get("/api/v1/education/resources?search=maternal")
    assert res_search.status_code == 200
    search_items = res_search.json()
    assert len(search_items) >= 1
    assert any("maternal" in item["title"].lower() or "maternal" in item["description"].lower() for item in search_items)

    # 5. Get single resource by ID
    first_id = all_items[0]["id"]
    res_single = await client.get(f"/api/v1/education/resources/{first_id}")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == first_id


@pytest.mark.asyncio
async def test_admin_content_management_authorization(education_test_client):
    client, session_factory, current_user_box = education_test_client

    async with session_factory() as session:
        mother = User(
            id=uuid.uuid4(),
            email="mother.nonadmin@example.com",
            name="Mother NonAdmin",
            password_hash=hash_password(PASSWORD),
            role=UserRole.MOTHER,
            is_verified=True,
            is_active=True,
        )
        admin = User(
            id=uuid.uuid4(),
            email="admin.edu@example.com",
            name="Admin Edu",
            password_hash=hash_password(PASSWORD),
            role=UserRole.ADMIN,
            is_verified=True,
            is_active=True,
        )
        session.add_all([mother, admin])
        await session.commit()

    new_payload = {
        "title": "Postnatal Pelvic Restoration and Core Safety",
        "description": "Safe clinical movements to strengthen pelvic floor and transversus abdominis.",
        "content_type": "video",
        "category": "Postpartum recovery",
        "video_url": "/media/videos/NurtureHer-English.mp4",
        "thumbnail_url": "/nurtureher-logo.png",
        "duration_seconds": 1781,
        "file_size_bytes": 206195482,
        "author_publisher": "Obstetric Physical Therapy Association",
        "review_date": "October 2026",
    }

    # 1. Mother tries to POST -> 403 Forbidden
    current_user_box["user"] = mother
    res_forbidden = await client.post("/api/v1/education/resources", json=new_payload)
    assert res_forbidden.status_code == 403

    # 2. Admin posts -> 201 Created
    current_user_box["user"] = admin
    res_created = await client.post("/api/v1/education/resources", json=new_payload)
    assert res_created.status_code == 201
    created = res_created.json()
    assert created["title"] == "Postnatal Pelvic Restoration and Core Safety"
    created_id = created["id"]

    # 3. Admin updates -> 200 OK
    res_update = await client.patch(
        f"/api/v1/education/resources/{created_id}",
        json={"title": "Postnatal Pelvic Restoration and Core Safety (Updated)"},
    )
    assert res_update.status_code == 200
    assert res_update.json()["title"] == "Postnatal Pelvic Restoration and Core Safety (Updated)"

    # 4. Admin deletes -> 200 OK
    res_delete = await client.delete(f"/api/v1/education/resources/{created_id}")
    assert res_delete.status_code == 200

    # 5. Subsequent GET yields 404
    res_get_deleted = await client.get(f"/api/v1/education/resources/{created_id}")
    assert res_get_deleted.status_code == 404


@pytest.mark.asyncio
async def test_education_language_filtering(education_test_client):
    client, session_factory, current_user_box = education_test_client

    async with session_factory() as session:
        admin = User(
            id=uuid.uuid4(),
            email="admin.lang@example.com",
            name="Admin Lang",
            password_hash=hash_password(PASSWORD),
            role=UserRole.ADMIN,
            is_verified=True,
            is_active=True,
        )
        session.add(admin)
        await session.commit()

    current_user_box["user"] = admin

    # Check default resources have language="en" (1 video + 8 articles = 9)
    res_en = await client.get("/api/v1/education/resources?language=en")
    assert res_en.status_code == 200
    items_en = res_en.json()
    assert len(items_en) == 9
    assert all(item["language"] == "en" for item in items_en)

    # Add a Hindi resource
    hi_payload = {
        "title": "Hindi Maternal Nutrition Video",
        "description": "Video guidance in Hindi.",
        "content_type": "video",
        "language": "hi",
        "category": "Maternal nutrition",
        "video_url": "/media/videos/NurtureHer-Hindi.mp4",
        "thumbnail_url": "/nurtureher-logo.png",
        "duration_seconds": 339,
        "author_publisher": "NIN India",
    }
    res_hi_created = await client.post("/api/v1/education/resources", json=hi_payload)
    assert res_hi_created.status_code == 201
    assert res_hi_created.json()["language"] == "hi"

    # Filter language=hi
    res_hi = await client.get("/api/v1/education/videos?language=hi")
    assert res_hi.status_code == 200
    items_hi = res_hi.json()
    assert len(items_hi) >= 1
    assert any(item["title"] == "Hindi Maternal Nutrition Video" for item in items_hi)
    assert all(item["language"] == "hi" for item in items_hi)

    # Filter language=en should not include Hindi
    res_en_after = await client.get("/api/v1/education/videos?language=en")
    assert res_en_after.status_code == 200
    assert not any(item["language"] == "hi" for item in res_en_after.json())

    # Filter language=all should include both
    res_all = await client.get("/api/v1/education/videos?language=all")
    assert res_all.status_code == 200
    assert any(item["language"] == "hi" for item in res_all.json())
    assert any(item["language"] == "en" for item in res_all.json())
