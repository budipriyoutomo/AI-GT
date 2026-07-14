"""
Test app/utils/images.py — normalize_logo_image. Pure Pillow logic, no S3 mock needed.
"""
from io import BytesIO

import pytest
from PIL import Image

from app.utils import images
from app.utils.exceptions import AppError


def _png_bytes(size=(400, 400), color=(255, 0, 0, 255)) -> bytes:
    buf = BytesIO()
    Image.new("RGBA", size, color).save(buf, format="PNG")
    return buf.getvalue()


def _jpeg_bytes(size=(400, 400)) -> bytes:
    buf = BytesIO()
    Image.new("RGB", size, (0, 255, 0)).save(buf, format="JPEG")
    return buf.getvalue()


def _webp_bytes(size=(400, 400)) -> bytes:
    buf = BytesIO()
    Image.new("RGBA", size, (0, 0, 255, 255)).save(buf, format="WEBP")
    return buf.getvalue()


class TestNormalizeLogoImage:
    def test_png_valid_returns_png_rgba(self):
        result = images.normalize_logo_image(_png_bytes())
        img = Image.open(BytesIO(result))
        assert img.format == "PNG"
        assert img.mode == "RGBA"

    def test_jpeg_valid_converted_to_png(self):
        result = images.normalize_logo_image(_jpeg_bytes())
        img = Image.open(BytesIO(result))
        assert img.format == "PNG"
        assert img.mode == "RGBA"

    def test_webp_valid_converted_to_png(self):
        result = images.normalize_logo_image(_webp_bytes())
        img = Image.open(BytesIO(result))
        assert img.format == "PNG"
        assert img.mode == "RGBA"

    def test_large_image_resized_longest_side_1024_ratio_preserved(self):
        result = images.normalize_logo_image(_png_bytes(size=(2000, 800)))
        img = Image.open(BytesIO(result))
        assert max(img.size) == 1024
        assert img.size[0] / img.size[1] == pytest.approx(2000 / 800, rel=0.01)

    def test_small_image_not_upscaled(self):
        result = images.normalize_logo_image(_png_bytes(size=(400, 400)))
        img = Image.open(BytesIO(result))
        assert img.size == (400, 400)

    def test_non_image_bytes_rejected(self):
        with pytest.raises(AppError) as exc_info:
            images.normalize_logo_image(b"this is definitely not an image, just text bytes")
        assert exc_info.value.code == "INVALID_FILE_TYPE"
        assert exc_info.value.status_code == 400

    def test_png_extension_but_not_actually_image_rejected(self):
        """Proves sniffing-by-bytes, not trusting a filename/extension the caller might pass."""
        with pytest.raises(AppError) as exc_info:
            images.normalize_logo_image(b"%PDF-1.4 fake pdf content pretending to be logo.png")
        assert exc_info.value.code == "INVALID_FILE_TYPE"

    def test_svg_rejected(self):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
        with pytest.raises(AppError) as exc_info:
            images.normalize_logo_image(svg)
        assert exc_info.value.code == "INVALID_FILE_TYPE"

    def test_oversized_file_rejected(self):
        oversized = _png_bytes(size=(10, 10)) + b"\x00" * (2 * 1024 * 1024)
        with pytest.raises(AppError) as exc_info:
            images.normalize_logo_image(oversized)
        assert exc_info.value.code == "FILE_TOO_LARGE"
        assert exc_info.value.status_code == 400
