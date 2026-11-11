"""
Re-export resolver design-system. Implementasi pindah ke app/services/design_system.py (A-6)
supaya Template Lab di backend memakai pipeline preset yang SAMA dengan seeder — tanpa app
bergantung ke folder scripts/.
"""
from app.services.design_system import (  # noqa: F401
    UnknownPresetError,
    load_design_system,
    resolve_config,
)
