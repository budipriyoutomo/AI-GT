from app.utils.exceptions import AppError, ErrorCode

MAX_PAGE_SIZE = 100


def validate_page(limit: int, offset: int) -> None:
    """Guard paginasi list admin — error 400 berformat AGENTS.md §4, bukan 422 bawaan FastAPI."""
    if limit < 1 or limit > MAX_PAGE_SIZE or offset < 0:
        raise AppError(400, ErrorCode.VALIDATION_ERROR, "Parameter paginasi tidak valid.")
