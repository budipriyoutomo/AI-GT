# AI-GT — Makefile
# Jalankan frontend (Next.js) + backend (FastAPI) sekaligus.

# Path virtualenv backend
VENV := backend/aigt/bin

.PHONY: dev frontend backend install seed migrate reconcile help

# Default: jalanin frontend + backend bareng
dev:
	@echo "🚀 Menjalankan frontend + backend..."
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) backend & \
	$(MAKE) frontend & \
	wait

# Backend saja (FastAPI / uvicorn)
backend:
	@echo "🔧 Backend → http://localhost:8000"
	cd backend && $(abspath $(VENV))/uvicorn app.main:app --reload

# Frontend saja (Next.js)
frontend:
	@echo "🎨 Frontend → http://localhost:3000"
	cd frontend && npm run dev

# Migrasi database ke versi terbaru (DB baru maupun existing yang sudah selaras)
migrate:
	@echo "🧬 Alembic upgrade head..."
	cd backend && $(abspath $(VENV))/alembic upgrade head

# Reconcile schema DB existing yang drift (akibat revisi Alembic lama duplikat) → head.
# SEKALI JALAN, idempoten. DB baru TIDAK perlu ini — cukup `make migrate`.
reconcile:
	@echo "🩹 Reconcile schema DB existing ke head (0006)..."
	cd backend && $(abspath $(VENV))/python scripts/reconcile_schema.py

# Seed templates ke database (RESET tabel templates lalu insert ulang dari JSON)
seed:
	@echo "🌱 Seeding templates..."
	cd backend && $(abspath $(VENV))/python scripts/seed_templates.py

# Install dependencies frontend + backend
install:
	cd frontend && npm install
	$(VENV)/pip install -r backend/requirements.txt

help:
	@echo "make dev       → jalankan frontend + backend sekaligus"
	@echo "make frontend  → jalankan frontend saja"
	@echo "make backend   → jalankan backend saja"
	@echo "make migrate   → alembic upgrade head"
	@echo "make reconcile → selaraskan schema DB existing yang drift ke head (sekali jalan)"
	@echo "make seed      → seed templates ke database (reset + insert ulang)"
	@echo "make install   → install dependencies keduanya"
