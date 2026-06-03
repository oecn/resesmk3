from __future__ import annotations

import sys
from pathlib import Path

import psycopg2

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from web.backend.config import DATABASE_URL


def run_migration(db_url: str) -> None:
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DO $$
                DECLARE
                    constraint_name TEXT;
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM acuerdos_comerciales a
                        WHERE a.acuerdo_origen_id IS NOT NULL
                          AND NOT EXISTS (
                              SELECT 1
                              FROM acuerdos_comerciales ref
                              WHERE ref.id = a.acuerdo_origen_id
                          )
                    ) THEN
                        RAISE EXCEPTION 'Hay acuerdo_origen_id sin acuerdo relacionado';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM acuerdos_comerciales a
                        WHERE a.renovado_por_acuerdo_id IS NOT NULL
                          AND NOT EXISTS (
                              SELECT 1
                              FROM acuerdos_comerciales ref
                              WHERE ref.id = a.renovado_por_acuerdo_id
                          )
                    ) THEN
                        RAISE EXCEPTION 'Hay renovado_por_acuerdo_id sin acuerdo relacionado';
                    END IF;

                    FOR constraint_name IN
                        SELECT con.conname
                        FROM pg_constraint con
                        JOIN pg_class rel ON rel.oid = con.conrelid
                        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                        JOIN unnest(con.conkey) WITH ORDINALITY key(attnum, ord) ON TRUE
                        JOIN pg_attribute att
                          ON att.attrelid = rel.oid
                         AND att.attnum = key.attnum
                        WHERE nsp.nspname = 'public'
                          AND rel.relname = 'acuerdos_comerciales'
                          AND con.contype = 'f'
                          AND att.attname IN ('acuerdo_origen_id', 'renovado_por_acuerdo_id')
                    LOOP
                        EXECUTE format(
                            'ALTER TABLE acuerdos_comerciales DROP CONSTRAINT IF EXISTS %I',
                            constraint_name
                        );
                    END LOOP;

                    ALTER TABLE acuerdos_comerciales
                    ADD CONSTRAINT fk_acuerdos_comerciales_acuerdo_origen
                    FOREIGN KEY (acuerdo_origen_id) REFERENCES acuerdos_comerciales(id);

                    ALTER TABLE acuerdos_comerciales
                    ADD CONSTRAINT fk_acuerdos_comerciales_renovado_por
                    FOREIGN KEY (renovado_por_acuerdo_id) REFERENCES acuerdos_comerciales(id);
                END $$;
                """
            )
        conn.commit()


def main() -> None:
    run_migration(DATABASE_URL)
    print("Foreign keys duplicadas de acuerdos_comerciales limpiadas correctamente.")


if __name__ == "__main__":
    main()
