
import os
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@192.168.10.13:5432/reces")
EMPRESAS = ["Corral", "Rodeo", "Ferusa", "TROPA"]
LOCALES = ["LUQUE", "AREGUA", "ITAUGUA"]
ARCHIVOS_DIRECTORIO_ROOT = os.getenv(
    "ARCHIVOS_DIRECTORIO_ROOT",
    str(Path(__file__).resolve().parents[2] / "archivos_directorio"),
)
