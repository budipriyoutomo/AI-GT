from io import BytesIO

from PIL import Image, UnidentifiedImageError

from app.utils.exceptions import AppError, ErrorCode

MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024
MAX_DIMENSION = 1024
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}

# Gambar konten dipakai sebagai foto foreground/background canvas — butuh resolusi jauh
# lebih besar dari logo, jadi batasnya sendiri.
MAX_CONTENT_FILE_SIZE_BYTES = 5 * 1024 * 1024
MAX_CONTENT_DIMENSION = 2048


def _decode(file_bytes: bytes, max_size: int, max_size_label: str) -> Image.Image:
    if len(file_bytes) > max_size:
        raise AppError(400, ErrorCode.FILE_TOO_LARGE, f"Ukuran file maksimum {max_size_label}.")

    try:
        img = Image.open(BytesIO(file_bytes))
        img.load()  # force eager decode — sniffs real bytes, never trusts extension/Content-Type
    except (UnidentifiedImageError, OSError):
        raise AppError(
            400, ErrorCode.INVALID_FILE_TYPE, "Format file tidak didukung. Gunakan PNG, JPEG, atau WEBP."
        )

    if img.format not in ALLOWED_FORMATS:
        raise AppError(
            400, ErrorCode.INVALID_FILE_TYPE, "Format file tidak didukung. Gunakan PNG, JPEG, atau WEBP."
        )
    return img


def _to_png(img: Image.Image, max_dimension: int) -> bytes:
    img = img.convert("RGBA")

    longest = max(img.size)
    if longest > max_dimension:
        scale = max_dimension / longest
        new_size = (round(img.width * scale), round(img.height * scale))
        img = img.resize(new_size, Image.LANCZOS)

    out = BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


def normalize_logo_image(file_bytes: bytes) -> bytes:
    return _to_png(_decode(file_bytes, MAX_FILE_SIZE_BYTES, "2 MB"), MAX_DIMENSION)


def normalize_content_image(file_bytes: bytes) -> bytes:
    """Gambar konten user (image_source = "upload"). Dinormalisasi ke PNG sama seperti logo,
    tapi dengan batas ukuran/dimensi yang lebih longgar."""
    return _to_png(
        _decode(file_bytes, MAX_CONTENT_FILE_SIZE_BYTES, "5 MB"), MAX_CONTENT_DIMENSION
    )
