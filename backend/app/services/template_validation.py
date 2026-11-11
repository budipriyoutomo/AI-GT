"""
A-6 — Validasi template_config untuk Template Lab, sebelum draft dipublish.

Aturan = backend/scripts/seed_template_data/README.md. Preset di-expand lewat resolver yang sama
dengan seeder (`design_system.resolve_config`), jadi config yang lolos di sini identik dengan hasil seed.
"""
from dataclasses import dataclass, field

from app.services.design_system import UnknownPresetError, load_design_system, resolve_config

# content_type → canvas. Menambah platform = menambah entri di sini (README §5 spec Template Lab).
CONTENT_TYPE_CANVAS: dict[str, dict] = {
    "instagram_post": {"aspect": "4:5", "dimensions": {"width": 1080, "height": 1350}},
}

ELEMENT_TYPES = frozenset({"logo", "tagline", "text", "rule", "image", "scrim", "footer", "group"})
BIND_VALUES = frozenset({"headline", "body", "cta"})
_POSITION_FIELDS = ("x", "y", "width", "height")


@dataclass
class ValidationResult:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    resolved: dict | None = None

    @property
    def valid(self) -> bool:
        return not self.errors


def _walk(elements: list, prefix: str):
    """(path, element) untuk tiap elemen, rekursif ke children group (README §6)."""
    for i, el in enumerate(elements):
        path = f"{prefix}[{i}]"
        yield path, el
        if isinstance(el, dict) and isinstance(el.get("children"), list):
            yield from _walk(el["children"], f"{path}.children")


def _check_element(path: str, el, errors: list[str]) -> None:
    if not isinstance(el, dict):
        errors.append(f"{path}: elemen harus berupa objek.")
        return
    el_type = el.get("type")
    if el_type not in ELEMENT_TYPES:
        errors.append(f"{path}.type: tipe {el_type!r} tidak dikenal renderer.")
    for f in _POSITION_FIELDS:
        if f not in el:
            continue
        v = el[f]
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not 0 <= v <= 1:
            errors.append(f"{path}.{f}: harus angka 0–1 (posisi ternormalisasi).")
    bind = el.get("bind")
    if bind is not None and bind not in BIND_VALUES:
        errors.append(f"{path}.bind: {bind!r} tidak valid — hanya headline, body, atau cta.")


def _has_image_slot(cfg: dict) -> bool:
    bg = cfg.get("background") or {}
    if isinstance(bg, dict) and bg.get("type") == "image":
        return True
    return any(
        isinstance(el, dict) and el.get("type") == "image" and el.get("source") != "brand"
        for _, el in _walk(cfg.get("elements") or [], "elements")
    )


def validate_template_config(raw, content_type: str = "instagram_post") -> ValidationResult:
    result = ValidationResult()
    if not isinstance(raw, dict):
        result.errors.append("template_config harus berupa objek JSON.")
        return result

    try:
        cfg = resolve_config(raw, load_design_system())
    except UnknownPresetError as e:
        result.errors.append(str(e))
        return result

    canvas = CONTENT_TYPE_CANVAS.get(content_type)
    if canvas is None:
        result.errors.append(f"content_type {content_type!r} belum didukung.")
    elif (cfg.get("canvas") or {}).get("aspect") != canvas["aspect"]:
        result.errors.append(f"canvas.aspect harus {canvas['aspect']} untuk {content_type}.")

    elements = cfg.get("elements")
    if not isinstance(elements, list) or not elements:
        result.errors.append("elements wajib berisi minimal 1 elemen.")
        elements = []

    for path, el in _walk(elements, "elements"):
        _check_element(path, el, result.errors)

    if not any(isinstance(el, dict) and el.get("bind") == "headline" for _, el in _walk(elements, "elements")):
        result.errors.append("Wajib ada minimal 1 elemen text dengan bind \"headline\" (slot AI).")

    if not isinstance(cfg.get("brand_theme"), dict):
        result.errors.append("brand_theme wajib ada — tanpa itu preview brand tidak berubah (README §0 #1).")

    if not _has_image_slot(cfg):
        result.warnings.append(
            "Tidak ada slot gambar (background image atau element image) — README §0 #2 mewajibkannya."
        )

    if result.valid:
        result.resolved = cfg
    return result
