"""
Design-system resolver (Tier 1 preset library).

`design_system.json` = "benchmark" visual: kumpulan preset bernama (palette, background,
brand_theme, text style). Template merujuk preset lewat nama; resolver ini meng-expand-nya
menjadi `template_config` lengkap SAAT SEED (renderer tidak berubah, Template Integrity aman).

Kontrak merge: preset = base, field/style INLINE di template MENANG (shallow override).
Preset bersifat OPT-IN — template boleh tetap full-inline (passthrough tanpa perubahan).
"""
import copy
import json
import os

_DS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "design_system.json")


class UnknownPresetError(ValueError):
    """Nama preset yang dirujuk template tidak ada di design_system.json."""


def load_design_system(path: str = _DS_PATH) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _lookup(ds: dict, kind: str, name: str) -> dict:
    try:
        return ds[kind][name]
    except KeyError:
        raise UnknownPresetError(
            f"Preset {kind!r} bernama {name!r} tidak ada di design_system.json"
        ) from None


def _merge(base: dict, override: dict | None) -> dict:
    """Shallow merge: base ditimpa override (nilai inline menang)."""
    return {**base, **(override or {})}


def _resolve_element(el: dict, ds: dict) -> None:
    """Resolve stylePreset element (in-place), rekursif ke children (group)."""
    preset = el.pop("stylePreset", None)
    if preset is not None:
        el["style"] = _merge(_lookup(ds, "text_styles", preset), el.get("style"))
    for child in el.get("children") or []:
        _resolve_element(child, ds)


def resolve_config(raw: dict, ds: dict) -> dict:
    """Kembalikan template_config baru dengan semua preset ter-expand. `raw` tidak dimutasi."""
    cfg = copy.deepcopy(raw)

    # canvas default (hampir selalu 4:5 1080x1350) bila template tak menyebut.
    if "canvas" not in cfg and "canvas" in ds:
        cfg["canvas"] = copy.deepcopy(ds["canvas"])

    # palette -> color_scheme (inline color_scheme override sebagian palette).
    palette = cfg.pop("palette", None)
    if palette is not None:
        cfg["color_scheme"] = _merge(_lookup(ds, "palettes", palette), cfg.get("color_scheme"))

    # background.preset / brand_theme.preset -> merge dengan sisa field inline.
    bg = cfg.get("background")
    if isinstance(bg, dict) and "preset" in bg:
        name = bg.pop("preset")
        cfg["background"] = _merge(_lookup(ds, "backgrounds", name), bg)

    bt = cfg.get("brand_theme")
    if isinstance(bt, dict) and "preset" in bt:
        name = bt.pop("preset")
        cfg["brand_theme"] = _merge(_lookup(ds, "brand_themes", name), bt)

    for el in cfg.get("elements") or []:
        _resolve_element(el, ds)

    return cfg
