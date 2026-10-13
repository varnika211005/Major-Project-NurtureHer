from pydantic import BaseModel, Field


class FacilityItem(BaseModel):
    id: str
    name: str
    facility_type: str
    address: str
    lat: float | None = None
    lng: float | None = None
    distance_km: float | None = None
    contact_number: str | None = None
    opening_hours: str | None = None
    directions_url: str
    rating: float | None = None
    user_ratings_total: int | None = None
    is_emergency: bool = False


class OfficialHelpline(BaseModel):
    title: str
    number: str
    description: str
    category: str


class FacilitySearchResponse(BaseModel):
    is_live_provider: bool
    provider_status: str
    provider_name: str = "Google Maps Places API"
    total_found: int
    query: str | None = None
    category: str | None = None
    location_searched: str | None = None
    external_search_url: str
    facilities: list[FacilityItem] = Field(default_factory=list)
    official_helplines: list[OfficialHelpline] = Field(default_factory=list)


class ConcernRecommendation(BaseModel):
    concern_key: str
    concern_title: str
    detected_assessment_basis: str | None = None
    suggested_facility_types: list[str]
    recommended_category: str
    clinical_safety_notice: str


class HerReachRecommendationsResponse(BaseModel):
    user_role: str
    has_pcos_data: bool
    has_ppd_data: bool
    has_pregnancy_data: bool
    clinical_disclaimer: str
    recommendations: list[ConcernRecommendation]
    available_categories: list[str]
