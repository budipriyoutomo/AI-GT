"""
Katalog paket langganan & add-on storage — sumber tunggal harga/limit.
Bukan di-hardcode di router. Harga dalam Rupiah (integer).
"""

PLANS: list[dict] = [
    {
        "id": "starter",
        "name": "Starter",
        "price": 0,
        "generate_limit": 20,
        "history_limit": 20,
        "profile_limit": 1,
        "thematic_image": False,
        "watermark_free": False,
        "priority_support": False,
    },
    {
        "id": "pro",
        "name": "Pro",
        "price": 99000,
        "generate_limit": 80,
        "history_limit": 50,
        "profile_limit": 3,
        "thematic_image": True,
        "watermark_free": True,
        "priority_support": False,
    },
    {
        "id": "business",
        "name": "Business",
        "price": 249000,
        "generate_limit": 300,
        "history_limit": -1,  # -1 = tidak terbatas
        "profile_limit": 10,
        "thematic_image": True,
        "watermark_free": True,
        "priority_support": True,
    },
]

STORAGE_ADDONS: list[dict] = [
    {"id": "s50", "name": "+50 slot", "price": 15000, "extra_slots": 50},
    {"id": "s200", "name": "+200 slot", "price": 45000, "extra_slots": 200},
    {"id": "s500", "name": "+500 slot", "price": 90000, "extra_slots": 500},
]

DEFAULT_PLAN_ID = "starter"

_PLANS_BY_ID = {p["id"]: p for p in PLANS}
_ADDONS_BY_ID = {a["id"]: a for a in STORAGE_ADDONS}


def get_plan(plan_id: str) -> dict | None:
    return _PLANS_BY_ID.get(plan_id)


def get_addon(addon_id: str) -> dict | None:
    return _ADDONS_BY_ID.get(addon_id)


def effective_history_limit(plan: dict, addon_id: str | None) -> int:
    """history_limit efektif = limit paket + extra_slots add-on aktif.
    Paket unlimited (-1) tetap unlimited, add-on tidak berpengaruh."""
    base = plan["history_limit"]
    if base == -1:
        return -1
    addon = get_addon(addon_id) if addon_id else None
    return base + (addon["extra_slots"] if addon else 0)
