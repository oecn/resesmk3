from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from web.backend.config import DATABASE_URL
from web.backend.modules.acuerdos_comerciales.repository import AcuerdosComercialesRepository


PANADERIA_AREGUA = """PA-A-P1	Puntera	BIMBO	2,000,000
PA-A-P2	Puntera	DYLO	2,000,000
PA-B-P2	Puntera	COCONUT	2,000,000"""


def main() -> None:
    result = AcuerdosComercialesRepository(DATABASE_URL).import_ubicaciones_aregua(
        PANADERIA_AREGUA,
        cambiado_por="migracion_panaderia_aregua",
    )
    print(result)


if __name__ == "__main__":
    main()
