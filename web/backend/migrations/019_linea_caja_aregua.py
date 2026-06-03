from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from web.backend.config import DATABASE_URL
from web.backend.modules.acuerdos_comerciales.repository import AcuerdosComercialesRepository


LINEA_CAJA_AREGUA = """LC-1/2	PROFARCO	1000000
LC-3/4	PROFARCO	1000000
LC-5/6	CODISA	1000000
LC-7	BIMBO	1000000
LC-8	BIMBO	1000000
LC-9	ACONCAGUA	1000000
LC-10	WISHIMPEX	1000000
LC-11	PY TRADING	1000000
LC-12	ARCOR	1000000
LC-13/14	VARSA	1000000
LC-15/16	ARCOR / PROFARCO	1000000
LC-17/18	PROFARCO	1000000
LC-19/20	PY TRADING	1000000
LC-21/22	WISHIMPEX	1000000
LC-23/24	ARCOR	1000000
LC-25/26	BIMBO	1000000
LC-27/28	PY TRADING	1000000
LC-29/30	IMP SAN JOSE IMPORT EXPORT	1000000
LC-31/32	PY TRADING	1000000
LC-33/34	ARCOR	1000000
LC-35/36	PY TRADING	1000000
LC-37/38	COCA COLA	1000000
LC-39/40	PROFARCO	1000000
LC-41/42	COCA COLA	1000000"""


def main() -> None:
    result = AcuerdosComercialesRepository(DATABASE_URL).import_ubicaciones_aregua(
        LINEA_CAJA_AREGUA,
        cambiado_por="migracion_linea_caja_aregua",
    )
    print(result)


if __name__ == "__main__":
    main()
