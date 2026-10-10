from typing import Dict, Optional
from app.models.enums import CivicCategory

# Strict deterministic mapping from civic category to department code
CATEGORY_TO_DEPARTMENT: Dict[str, str] = {
    CivicCategory.DAMAGED_ROAD.value: "ROAD_AUTHORITY",
    CivicCategory.GARBAGE.value: "GARBAGE_DEPT",
    CivicCategory.POTHOLE.value: "ROAD_AUTHORITY",
    CivicCategory.STREETLIGHT_FAILURE.value: "INFRASTRUCTURE",
    CivicCategory.WATER_LEAK.value: "WATER_DEPT",
}

CATEGORY_METADATA: Dict[str, Dict[str, str]] = {
    CivicCategory.DAMAGED_ROAD.value: {
        "display_name": "Damaged Road Surface",
        "description": "Cracked pavement, surface degradation, or structural asphalt failure.",
        "department_code": "ROAD_AUTHORITY",
        "department_name": "Road Authority",
    },
    CivicCategory.GARBAGE.value: {
        "display_name": "Waste & Garbage",
        "description": "Overflowing public waste containers, unauthorized dumping, or scattered litter.",
        "department_code": "GARBAGE_DEPT",
        "department_name": "Garbage Department",
    },
    CivicCategory.POTHOLE.value: {
        "display_name": "Pothole",
        "description": "Depression or crater in the roadway creating vehicular hazards.",
        "department_code": "ROAD_AUTHORITY",
        "department_name": "Road Authority",
    },
    CivicCategory.STREETLIGHT_FAILURE.value: {
        "display_name": "Streetlight Failure",
        "description": "Non-functioning, damaged, or flickering municipal lighting fixtures.",
        "department_code": "INFRASTRUCTURE",
        "department_name": "Infrastructure Department",
    },
    CivicCategory.WATER_LEAK.value: {
        "display_name": "Water Pipeline Leak",
        "description": "Burst main, leaking valves, or pooling municipal drinking water.",
        "department_code": "WATER_DEPT",
        "department_name": "Water Department",
    },
    CivicCategory.OTHER.value: {
        "display_name": "General Civic Issue",
        "description": "Unclassified civic concern requiring manual evaluation.",
        "department_code": "",
        "department_name": "Manual Review Required",
    },
}


def resolve_department_code_for_category(category: str) -> Optional[str]:
    """Deterministically resolve municipal department code for a classified category."""
    return CATEGORY_TO_DEPARTMENT.get(category)
