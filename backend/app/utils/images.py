from io import BytesIO

from PIL import Image, UnidentifiedImageError

from app.utils.exceptions import AppError, ErrorCode

MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024
MAX_DIMENSION = 1024
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}


def normalize_logo_image(file_bytes: bytes) -> bytes:
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise AppError(400, ErrorCode.FILE_TOO_LARGE, "Ukuran file maksimum 2 MB.")

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

    img = img.convert("RGBA")

    longest = max(img.size)
    if longest > MAX_DIMENSION:
        scale = MAX_DIMENSION / longest
        new_size = (round(img.width * scale), round(img.height * scale))
        img = img.resize(new_size, Image.LANCZOS)

    out = BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()
