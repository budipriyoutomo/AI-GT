"""
Tests untuk backfill background_url di scripts/seed_templates.py.

Template image-bg LEGACY dulu menaruh foto latar di thumbnail_url (source "thumbnail").
Sekarang latar pindah ke kolom background_url (source "background"). Backfill menyalin
thumbnail_url -> background_url HANYA untuk template legacy tsb — bukan template baru yang
memakai thumbnail_url sebagai FOREGROUND (mis. special-deals: HP+keranjang).
"""
from scripts.seed_templates import needs_background_backfill, _uses_thumbnail_foreground


IMAGE_BG = {"background": {"type": "image", "source": "background"}, "elements": []}
FOREGROUND_CFG = {
    "background": {"type": "image", "source": "background"},
    "elements": [{"type": "image", "source": "thumbnail", "x": 0.1, "y": 0.5, "width": 0.8}],
}


class TestUsesThumbnailForeground:
    def test_true_when_image_element_source_thumbnail(self):
        assert _uses_thumbnail_foreground(FOREGROUND_CFG) is True

    def test_false_when_no_foreground_image(self):
        assert _uses_thumbnail_foreground(IMAGE_BG) is False

    def test_false_when_config_missing_elements(self):
        assert _uses_thumbnail_foreground({}) is False


class TestNeedsBackgroundBackfill:
    def test_legacy_image_bg_gets_backfilled(self):
        """Latar di thumbnail_url, background_url kosong, tak ada foreground → backfill."""
        assert needs_background_backfill(IMAGE_BG, "", "https://r2/store.png") is True

    def test_skips_when_background_url_already_set(self):
        assert needs_background_backfill(IMAGE_BG, "https://r2/bg.png", "https://r2/store.png") is False

    def test_skips_when_thumbnail_empty(self):
        assert needs_background_backfill(IMAGE_BG, "", "") is False
        assert needs_background_backfill(IMAGE_BG, None, None) is False

    def test_skips_when_background_not_image(self):
        cfg = {"background": {"type": "gradient"}, "elements": []}
        assert needs_background_backfill(cfg, "", "https://r2/x.png") is False

    def test_skips_when_thumbnail_is_foreground(self):
        """special-deals: thumbnail_url = HP+keranjang (foreground), BUKAN latar → jangan salin."""
        assert needs_background_backfill(FOREGROUND_CFG, "", "https://r2/phone.png") is False
