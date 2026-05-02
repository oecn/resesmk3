from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import psycopg2

from web.backend.config import DATABASE_URL


def main():
    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                ALTER TABLE usuarios
                ADD COLUMN IF NOT EXISTS modulos_permitidos JSONB NULL
                """
            )
        conn.commit()
    print("Migracion 016_usuario_modulos_permitidos aplicada.")


if __name__ == "__main__":
    main()
