import logging
import math
import urllib.parse
from typing import Any
import httpx
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.schemas.herreach import (
    ConcernRecommendation,
    FacilityItem,
    FacilitySearchResponse,
    HerReachRecommendationsResponse,
    OfficialHelpline,
)

logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)

OFFICIAL_HELPLINES = [
    OfficialHelpline(
        title="National Emergency Number (Police / Fire / Medical)",
        number="112",
        description="Unified national 24/7 emergency response for immediate life-safety emergencies.",
        category="urgent",
    ),
    OfficialHelpline(
        title="Emergency Medical Ambulance Service",
        number="108",
        description="Free 24/7 emergency medical transport and on-call paramedics.",
        category="urgent",
    ),
    OfficialHelpline(
        title="Janani Shishu Suraksha Ambulance (Maternal Transport)",
        number="102",
        description="Free government medical transportation for pregnant mothers, deliveries, and sick infants.",
        category="maternity",
    ),
    OfficialHelpline(
        title="Tele-MANAS National Mental Health Helpline",
        number="14416",
        description="Free, confidential 24/7 mental health counseling and psychological support by certified counselors.",
        category="mental_health",
    ),
    OfficialHelpline(
        title="National Health Helpline (MoHFW)",
        number="1075",
        description="Ministry of Health & Family Welfare toll-free health guidance, hospital queries, and disease info.",
        category="general",
    ),
    OfficialHelpline(
        title="Women Helpline (Emergency & Distress)",
        number="1091",
        description="24/7 dedicated helpline for women in distress, domestic safety, and emergency assistance.",
        category="gynaecology",
    ),
]

CATEGORY_LABELS: dict[str, str] = {
    "gynaecology": "Gynaecologists & Women's Health Clinics",
    "obstetrics": "Obstetricians & Maternity Centres",
    "mental_health": "Mental Health & Counseling Professionals",
    "maternity": "Maternity Centres & Delivery Hospitals",
    "hospital": "Multi-specialty Hospitals & Emergency Care",
    "pharmacy": "Pharmacies & Medical Stores",
    "clinic": "Clinics & General Practitioners",
    "diagnostic_lab": "Diagnostic Laboratories & Imaging Centres",
    "general": "General Practitioners & Primary Care",
    "emergency": "Emergency Facilities & 24x7 Casualty Wards",
}

GOOGLE_TYPE_MAP: dict[str, str] = {
    "gynaecology": "doctor",
    "obstetrics": "hospital",
    "mental_health": "health",
    "maternity": "hospital",
    "hospital": "hospital",
    "pharmacy": "pharmacy",
    "clinic": "doctor",
    "diagnostic_lab": "health",
    "general": "doctor",
    "emergency": "hospital",
}

GOOGLE_KEYWORD_MAP: dict[str, str] = {
    "gynaecology": "gynaecologist women clinic",
    "obstetrics": "obstetrician maternity hospital",
    "mental_health": "psychiatrist psychologist mental health clinic counseling",
    "maternity": "maternity hospital birthing center",
    "hospital": "hospital",
    "pharmacy": "pharmacy medical store chemist",
    "clinic": "clinic medical doctor",
    "diagnostic_lab": "diagnostic center medical laboratory blood test",
    "general": "general physician clinic family doctor",
    "emergency": "emergency hospital casualty trauma center",
}

OSM_KEYWORD_MAP: dict[str, str] = {
    "gynaecology": "gynaecologist hospital clinic",
    "obstetrics": "maternity hospital obstetrician",
    "mental_health": "mental health clinic hospital",
    "maternity": "maternity hospital",
    "hospital": "hospital",
    "pharmacy": "pharmacy",
    "clinic": "clinic",
    "diagnostic_lab": "diagnostic laboratory clinic",
    "general": "hospital clinic",
    "emergency": "emergency hospital",
}



def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    radius_earth_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(radius_earth_km * c, 2)


class HerReachService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_recommendations_for_mother(self, user: User) -> HerReachRecommendationsResponse:
        """
        Produce intelligent, concern-based facility recommendation guidance
        using genuine screening records without diagnostic claims.
        """
        # Fetch latest screenings if genuinely present
        pcos = await self.db.scalar(
            select(PCOSPrediction)
            .where(PCOSPrediction.user_id == user.id)
            .order_by(desc(PCOSPrediction.created_at))
            .limit(1)
        )
        ppd = await self.db.scalar(
            select(PPDAssessment)
            .where(PPDAssessment.user_id == user.id)
            .order_by(desc(PPDAssessment.created_at))
            .limit(1)
        )
        profile = await self.db.scalar(
            select(MotherProfile)
            .where(MotherProfile.user_id == user.id)
            .limit(1)
        )

        recommendations: list[ConcernRecommendation] = []
        has_pcos = pcos is not None
        has_ppd = ppd is not None
        has_pregnancy = bool(profile and profile.pregnancy_status and profile.pregnancy_status.lower() != "not pregnant")

        # 1. PCOS Concern (if genuinely available)
        if has_pcos and pcos:
            recommendations.append(
                ConcernRecommendation(
                    concern_key="pcos",
                    concern_title="PCOS & Hormonal Health Exploration",
                    detected_assessment_basis=f"Recorded screening risk level: {pcos.risk_level.value}",
                    suggested_facility_types=[
                        "Gynaecologists",
                        "Reproductive Endocrinology Clinics",
                        "Women's Health Specialty Clinics",
                        "Pelvic Ultrasound & Hormone Diagnostic Labs",
                    ],
                    recommended_category="gynaecology",
                    clinical_safety_notice=(
                        "Facilities that may be relevant to your concern. Screening results are not confirmed medical "
                        "diagnoses. Please consult a qualified gynaecologist for pelvic evaluation and confirmatory blood tests."
                    ),
                )
            )

        # 2. PPD Concern (if genuinely available)
        if has_ppd and ppd:
            recommendations.append(
                ConcernRecommendation(
                    concern_key="ppd",
                    concern_title="Perinatal & Maternal Emotional Wellbeing",
                    detected_assessment_basis=f"Recorded screening risk level: {ppd.risk_level.value} (EPDS score: {ppd.epds_score})",
                    suggested_facility_types=[
                        "Perinatal Mental Health Counselors",
                        "Clinical Psychologists & Psychiatrists",
                        "Maternal Support Groups & Therapy Centers",
                        "Hospital Outpatient Mental Health Units",
                    ],
                    recommended_category="mental_health",
                    clinical_safety_notice=(
                        "Facilities that may be relevant to your concern. Questionnaire screening indicates emotional distress "
                        "markers, not a formal diagnosis. A licensed mental health professional can provide supportive care."
                    ),
                )
            )

        # 3. Pregnancy & Maternal Wellness
        if has_pregnancy and profile:
            recommendations.append(
                ConcernRecommendation(
                    concern_key="pregnancy",
                    concern_title="Antenatal & Maternity Care",
                    detected_assessment_basis=f"Profile status: {profile.pregnancy_status}",
                    suggested_facility_types=[
                        "Obstetricians",
                        "Maternity Centres",
                        "Antenatal Ultrasound Centers",
                        "Tertiary Delivery Hospitals",
                    ],
                    recommended_category="maternity",
                    clinical_safety_notice=(
                        "Regular antenatal checkups ensure both maternal and fetal safety. Keep your maternal records handy."
                    ),
                )
            )

        # 4. Urgent & Emergency Care (always included as safety protocol)
        recommendations.append(
            ConcernRecommendation(
                concern_key="urgent",
                concern_title="Urgent & Emergency Medical Care",
                detected_assessment_basis="General Safety Guidance",
                suggested_facility_types=[
                    "24x7 Emergency Rooms & Casualty Wards",
                    "Obstetric Emergency Hospitals",
                    "Government District Emergency Units",
                ],
                recommended_category="emergency",
                clinical_safety_notice=(
                    "CRITICAL: Never delay seeking emergency hospital care or calling 112/108 to complete an assessment "
                    "or search an app if experiencing severe bleeding, acute pain, difficulty breathing, or sudden high fever."
                ),
            )
        )

        # 5. General Healthcare Discovery (always included)
        recommendations.append(
            ConcernRecommendation(
                concern_key="general",
                concern_title="General & Preventive Primary Care",
                detected_assessment_basis="General Healthcare Access",
                suggested_facility_types=[
                    "General Practitioners",
                    "Primary Health Clinics",
                    "Multi-specialty Community Hospitals",
                ],
                recommended_category="general",
                clinical_safety_notice=(
                    "Primary care physicians provide routine wellness evaluations and diagnostic referrals."
                ),
            )
        )

        return HerReachRecommendationsResponse(
            user_role="mother",
            has_pcos_data=has_pcos,
            has_ppd_data=has_ppd,
            has_pregnancy_data=has_pregnancy,
            clinical_disclaimer=(
                "Clinical Decision Support Notice: Screening results and suggestions in HerReach are not medical diagnoses. "
                "Facilities are provided as potential resources for discovery. Always consult a licensed healthcare practitioner."
            ),
            recommendations=recommendations,
            available_categories=list(CATEGORY_LABELS.keys()),
        )

    async def search_facilities(
        self,
        query: str | None = None,
        category: str | None = None,
        lat: float | None = None,
        lng: float | None = None,
        area: str | None = None,
        radius_meters: int = 10000,
    ) -> FacilitySearchResponse:
        """
        Search healthcare facilities.
        Uses Google Places API when settings.google_maps_api_key is present.
        Gracefully falls back to valid Google Maps deep-links and verified official helplines
        when unconfigured, with zero fabricated places.
        """
        api_key = settings.google_maps_api_key
        if not api_key:
            import dotenv
            env_vals = dotenv.dotenv_values(".env")
            api_key = env_vals.get("GOOGLE_MAPS_API_KEY")

        # Build clean search terms
        search_category = category.lower().strip() if category else "hospital"
        keyword_part = GOOGLE_KEYWORD_MAP.get(search_category, "healthcare clinic hospital")
        if query and query.strip():
            combined_search = f"{query.strip()} {keyword_part}".strip()
        else:
            combined_search = keyword_part

        location_label = area.strip() if area and area.strip() else (f"{lat:.4f}, {lng:.4f}" if lat and lng else "")

        # External Google Maps search URL fallback
        query_for_map = combined_search
        if location_label:
            query_for_map = f"{query_for_map} near {location_label}"
        encoded_query = urllib.parse.quote_plus(query_for_map)
        external_search_url = f"https://www.google.com/maps/search/?api=1&query={encoded_query}"

        # 1. If Google Maps API key IS configured, execute real Google Places search first
        if api_key and api_key.strip():
            try:
                return await self._query_google_places(
                    api_key=api_key.strip(),
                    query=query,
                    category=search_category,
                    lat=lat,
                    lng=lng,
                    area=area,
                    radius_meters=radius_meters,
                    external_search_url=external_search_url,
                    location_label=location_label,
                )
            except Exception as exc:
                logger.warning("Google Places search encountered error: %s; falling back to OpenStreetMap", exc)

        # 2. No-Google-key fallback: OpenStreetMap (Nominatim)
        try:
            return await self._query_osm_nominatim(
                query=query,
                category=search_category,
                lat=lat,
                lng=lng,
                area=area,
                radius_meters=radius_meters,
                external_search_url=external_search_url,
                location_label=location_label,
            )
        except Exception as exc:
            logger.warning("OpenStreetMap fallback query failed: %s", exc)
            return FacilitySearchResponse(
                is_live_provider=False,
                provider_status=(
                    "Live healthcare facility search is currently unavailable. Direct Google Maps navigation "
                    "links and verified emergency helplines are provided below."
                ),
                provider_name="OpenStreetMap (Nominatim)",
                total_found=0,
                query=query,
                category=search_category,
                location_searched=location_label or None,
                external_search_url=external_search_url,
                facilities=[],
                official_helplines=OFFICIAL_HELPLINES,
            )

    async def _query_google_places(
        self,
        api_key: str,
        query: str | None,
        category: str,
        lat: float | None,
        lng: float | None,
        area: str | None,
        radius_meters: int,
        external_search_url: str,
        location_label: str,
    ) -> FacilitySearchResponse:
        """Call Google Maps Geocoding & Places APIs using httpx."""
        resolved_lat = lat
        resolved_lng = lng

        async with httpx.AsyncClient(timeout=10.0) as client:
            # If coordinates are missing but manual area is provided, geocode area first
            if (resolved_lat is None or resolved_lng is None) and area and area.strip():
                clean_area = area.strip()
                geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
                geo_params: dict[str, Any] = {"address": clean_area, "key": api_key}
                if clean_area.isdigit() and len(clean_area) == 6:
                    geo_params["components"] = f"country:IN|postal_code:{clean_area}"
                elif not any(c in clean_area.lower() for c in ["india", "bharat"]):
                    geo_params["components"] = "country:IN"

                geo_resp = await client.get(
                    geocode_url,
                    params=geo_params,
                )
                if geo_resp.status_code == 200:
                    geo_data = geo_resp.json()
                    if geo_data.get("results"):
                        location = geo_data["results"][0]["geometry"]["location"]
                        resolved_lat = location["lat"]
                        resolved_lng = location["lng"]

            # Query Google Places API (New) Text Search
            places_results: list[dict[str, Any]] = []
            keyword = GOOGLE_KEYWORD_MAP.get(category, "hospital")
            search_text = f"{query.strip()} {keyword}".strip() if query else keyword

            places_url = "https://places.googleapis.com/v1/places:searchText"
            effective_text_query = f"{search_text} {area.strip()}".strip() if area and area.strip() else search_text
            request_body: dict[str, Any] = {
                "textQuery": effective_text_query,
                "maxResultCount": 20,
            }
            if resolved_lat is not None and resolved_lng is not None:
                request_body["locationBias"] = {
                    "circle": {
                        "center": {
                            "latitude": resolved_lat,
                            "longitude": resolved_lng,
                        },
                        "radius": radius_meters,
                    }
                }

            places_resp = await client.post(
                places_url,
                headers={
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": (
                        "places.id,places.displayName,places.formattedAddress,"
                        "places.location,places.rating,places.userRatingCount,"
                        "places.currentOpeningHours.openNow,places.nationalPhoneNumber"
                    ),
                },
                json=request_body,
            )
            data = places_resp.json()
            provider_error = data.get("error", {}) if isinstance(data, dict) else {}
            error_code = provider_error.get("status") or provider_error.get("code")
            error_message = provider_error.get("message")
            safe_error_message = (
                str(error_message).replace(api_key, "[redacted]") if error_message else None
            )
            if places_resp.status_code == 200 and isinstance(data, dict):
                places_results = data.get("places", [])

            logger.log(
                logging.WARNING
                if places_resp.status_code != 200
                else logging.INFO,
                "Google Places API (New) diagnostics: http_status=%s error_code=%s "
                "error_message=%s result_count=%d",
                places_resp.status_code,
                error_code,
                safe_error_message,
                len(places_results),
            )

            if places_resp.status_code != 200:
                error_detail = safe_error_message or "Google Places API returned an error."
                return FacilitySearchResponse(
                    is_live_provider=False,
                    provider_status=f"Google Places API error (HTTP {places_resp.status_code}): "
                    f"{error_detail} Direct Google Maps navigation is available below.",
                    total_found=0,
                    query=query,
                    category=category,
                    location_searched=location_label or None,
                    external_search_url=external_search_url,
                    facilities=[],
                    official_helplines=OFFICIAL_HELPLINES,
                )

            # Map raw Google results to structured FacilityItem models
            facilities: list[FacilityItem] = []
            for item in places_results[:25]:
                p_name = item.get("displayName", {}).get("text", "Healthcare Facility")
                p_address = item.get("formattedAddress", "Address not specified")
                loc = item.get("location", {})
                p_lat = loc.get("latitude")
                p_lng = loc.get("longitude")

                # Distance calculation only when both origin & place coords exist
                dist: float | None = None
                if lat is not None and lng is not None and p_lat is not None and p_lng is not None:
                    dist = haversine_distance_km(lat, lng, p_lat, p_lng)

                # Directions URL to Google Maps
                place_id = item.get("id")
                if place_id:
                    dir_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote_plus(p_name)}&query_place_id={place_id}"
                else:
                    dir_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote_plus(p_name + ' ' + p_address)}"

                # Opening hours string if available
                opening_str: str | None = None
                if "currentOpeningHours" in item:
                    is_open = item["currentOpeningHours"].get("openNow")
                    if is_open is True:
                        opening_str = "Open now"
                    elif is_open is False:
                        opening_str = "Closed now"

                is_emergency = "emergency" in category or "hospital" in category or "casualty" in p_name.lower()

                facilities.append(
                    FacilityItem(
                        id=place_id or f"place_{len(facilities)}",
                        name=p_name,
                        facility_type=CATEGORY_LABELS.get(category, "Healthcare Facility"),
                        address=p_address,
                        lat=p_lat,
                        lng=p_lng,
                        distance_km=dist,
                        contact_number=item.get("nationalPhoneNumber"),
                        opening_hours=opening_str,
                        directions_url=dir_url,
                        rating=item.get("rating"),
                        user_ratings_total=item.get("userRatingCount"),
                        is_emergency=is_emergency,
                    )
                )

            return FacilitySearchResponse(
                is_live_provider=True,
                provider_status="Live Google Places API search successful.",
                total_found=len(facilities),
                query=query,
                category=category,
                location_searched=location_label or None,
                external_search_url=external_search_url,
                facilities=facilities,
                official_helplines=OFFICIAL_HELPLINES,
            )

    async def _query_osm_nominatim(
        self,
        query: str | None,
        category: str,
        lat: float | None,
        lng: float | None,
        area: str | None,
        radius_meters: int,
        external_search_url: str,
        location_label: str,
    ) -> FacilitySearchResponse:
        """
        Query healthcare facilities using OpenStreetMap (Nominatim).
        Requires zero API keys. Returns verified genuine healthcare facilities.
        """
        osm_term = OSM_KEYWORD_MAP.get(category, "hospital")
        clean_query = query.strip() if query and query.strip() else ""
        clean_area = area.strip() if area and area.strip() else ""

        headers = {
            "User-Agent": "NurtureHerHealthcareApp/1.0 (maternal-health-support; contact@nurtureher.org)",
            "Accept": "application/json",
        }

        resolved_lat = lat
        resolved_lng = lng

        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            # 1. Geocode area if coordinates are not provided
            if (resolved_lat is None or resolved_lng is None) and clean_area:
                geo_params: dict[str, Any] = {"format": "json", "limit": 1}
                if clean_area.isdigit() and len(clean_area) == 6:
                    geo_params["postalcode"] = clean_area
                    geo_params["country"] = "India"
                else:
                    geo_params["q"] = clean_area
                    geo_params["countrycodes"] = "in"

                try:
                    geo_resp = await client.get("https://nominatim.openstreetmap.org/search", params=geo_params)
                    if geo_resp.status_code == 200:
                        geo_data = geo_resp.json()
                        if isinstance(geo_data, list) and len(geo_data) > 0:
                            resolved_lat = float(geo_data[0]["lat"])
                            resolved_lng = float(geo_data[0]["lon"])
                except Exception as exc:
                    logger.warning("OSM geocoding failed for area %s: %s", clean_area, exc)

            items: list[dict[str, Any]] = []

            # 2. Search within bounding viewbox if coordinates are available
            if resolved_lat is not None and resolved_lng is not None:
                delta_deg = max(0.045, min(radius_meters / 111000.0, 0.15))
                viewbox = f"{resolved_lng - delta_deg:.5f},{resolved_lat + delta_deg:.5f},{resolved_lng + delta_deg:.5f},{resolved_lat - delta_deg:.5f}"
                search_q = f"{clean_query} {osm_term}".strip() if clean_query else osm_term
                search_params = {
                    "q": search_q,
                    "format": "json",
                    "viewbox": viewbox,
                    "bounded": 1,
                    "addressdetails": 1,
                    "extratags": 1,
                    "countrycodes": "in",
                    "limit": 20,
                }
                resp = await client.get("https://nominatim.openstreetmap.org/search", params=search_params)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list):
                        items = data

            # 3. Fallback text search if viewbox returned 0 results or coordinates were unavailable
            if not items and (clean_query or clean_area):
                fallback_parts: list[str] = []
                if clean_query:
                    fallback_parts.append(clean_query)
                fallback_parts.append(osm_term)
                if clean_area:
                    fallback_parts.append(f"in {clean_area}, India")
                fallback_q = " ".join(fallback_parts)

                resp2 = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": fallback_q,
                        "format": "json",
                        "addressdetails": 1,
                        "extratags": 1,
                        "countrycodes": "in",
                        "limit": 15,
                    },
                )
                if resp2.status_code == 200:
                    data2 = resp2.json()
                    if isinstance(data2, list):
                        items = data2

            # 4. Map results to FacilityItem
            facilities: list[FacilityItem] = []
            seen_ids: set[str] = set()

            for item in items:
                raw_id = f"osm/{item.get('osm_type', 'node')}/{item.get('osm_id', item.get('place_id', len(facilities)))}"
                if raw_id in seen_ids:
                    continue
                seen_ids.add(raw_id)

                name = item.get("name") or (item.get("display_name", "").split(",")[0].strip())
                if not name:
                    continue

                f_lat: float | None = None
                f_lng: float | None = None
                try:
                    if "lat" in item and item["lat"] is not None:
                        f_lat = float(item["lat"])
                    if "lon" in item and item["lon"] is not None:
                        f_lng = float(item["lon"])
                except (ValueError, TypeError):
                    pass

                # Calculate distance only if user supplied device coordinates
                dist: float | None = None
                if lat is not None and lng is not None and f_lat is not None and f_lng is not None:
                    dist = haversine_distance_km(lat, lng, f_lat, f_lng)

                extratags = item.get("extratags") or {}
                contact = extratags.get("phone") or extratags.get("contact:phone") or extratags.get("contact:mobile")
                opening = extratags.get("opening_hours")

                directions_url = (
                    f"https://www.google.com/maps/dir/?api=1&destination={f_lat:.5f},{f_lng:.5f}"
                    if f_lat is not None and f_lng is not None
                    else external_search_url
                )

                item_type = str(item.get("type", "")).lower()
                is_emergency = category == "emergency" or "hospital" in item_type or "emergency" in item_type

                facilities.append(
                    FacilityItem(
                        id=raw_id,
                        name=name,
                        facility_type=CATEGORY_LABELS.get(category, "Multi-specialty Hospitals & Emergency Care"),
                        address=item.get("display_name", "Address not specified"),
                        lat=f_lat,
                        lng=f_lng,
                        distance_km=dist,
                        contact_number=contact,
                        opening_hours=opening,
                        directions_url=directions_url,
                        rating=None,
                        user_ratings_total=None,
                        is_emergency=is_emergency,
                    )
                )

            # Sort by distance if available
            facilities.sort(key=lambda f: f.distance_km if f.distance_km is not None else 9999.0)

            provider_status = (
                f"Found {len(facilities)} verified facilities via OpenStreetMap (Nominatim) directory."
                if facilities
                else "No matching facilities found in OpenStreetMap for this search area."
            )

            return FacilitySearchResponse(
                is_live_provider=bool(facilities),
                provider_status=provider_status,
                provider_name="OpenStreetMap (Nominatim)",
                total_found=len(facilities),
                query=query,
                category=category,
                location_searched=location_label or None,
                external_search_url=external_search_url,
                facilities=facilities,
                official_helplines=OFFICIAL_HELPLINES,
            )
