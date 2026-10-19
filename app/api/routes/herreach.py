from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.user import User
from app.schemas.herreach import (
    FacilitySearchResponse,
    HerReachRecommendationsResponse,
    OfficialHelpline,
)
from app.services.herreach import OFFICIAL_HELPLINES, HerReachService

router = APIRouter(prefix="/herreach", tags=["HerReach Healthcare Discovery"])


@router.get("/facilities", response_model=FacilitySearchResponse)
async def search_facilities(
    query: Annotated[str | None, Query(description="Search facility name or keywords")] = None,
    category: Annotated[str | None, Query(description="Healthcare category key")] = None,
    lat: Annotated[float | None, Query(description="User latitude", ge=-90.0, le=90.0)] = None,
    lng: Annotated[float | None, Query(description="User longitude", ge=-180.0, le=180.0)] = None,
    area: Annotated[str | None, Query(description="Manual locality, city or PIN code")] = None,
    radius: Annotated[int, Query(description="Search radius in meters", ge=500, le=50000)] = 10000,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Healthcare Facility Discovery for Mother, Caregiver, and Doctor portals.
    Supports real-time Google Places API if configured, or graceful Google Maps deep links.
    """
    return await HerReachService(db).search_facilities(
        query=query,
        category=category,
        lat=lat,
        lng=lng,
        area=area,
        radius_meters=radius,
    )


@router.get("/recommendations", response_model=HerReachRecommendationsResponse)
async def get_recommendations(
    user: User = Depends(require_roles(UserRole.MOTHER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """
    Smart, concern-based healthcare facility recommendations for Mother Dashboard.
    Uses existing PCOS and PPD assessment results without diagnostic claims.
    """
    return await HerReachService(db).get_recommendations_for_mother(user)


@router.get("/helplines", response_model=list[OfficialHelpline])
async def get_official_helplines(
    user: User = Depends(get_current_user),
):
    """Return verified official public emergency and healthcare helpline numbers."""
    return OFFICIAL_HELPLINES
