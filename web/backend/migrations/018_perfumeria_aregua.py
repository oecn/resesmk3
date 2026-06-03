from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from web.backend.config import DATABASE_URL
from web.backend.modules.acuerdos_comerciales.repository import AcuerdosComercialesRepository


PERFUMERIA_AREGUA = """PA	A-P1	Puntera	BELLEZA Y AROMA	2,000,000
PA	A-P1-L1	Lateral	PARAGUAY TRADING	750,000
PA	A-P1-L2	Lateral	COLGATE	750,000
PA	A-P2	Puntera	RUOTI Y CIA	2,000,000
PA	A-P2-L1	Lateral	RUOTI Y CIA	0
PA	A-P2-L2	Lateral	RUOTI Y CIA	0
PA	A-P3	Puntera	UNION SA	2,000,000
PA	A-P3-L1	Lateral	UNION SA	750,000
PA	A-P3-L2	Lateral	UNION SA	750,000
PA	A-P4	Puntera	COMINCO	2,000,000
PA	A-P4-L1	Lateral	LIBRE	0
PA	A-P4-L2	Lateral	UNILEVER	750,000
PB	B-P4	Puntera	ACONCAGUA	2,000,000
PB	B-P4-L1	Lateral	MERCADOPLUS	750,000
PB	B-P4-L2	Lateral	ASUNCION SA DE NEGOCIOS	750,000
PB	B-P3	Puntera	UNILEVER	2,000,000
PB	B-P3-L1	Lateral	IBAMA IMPORT	750,000
PB	B-P3-L2	Lateral	SALEMMA	750,000
PB	B-P2	Puntera	UNILEVER	2,000,000
PB	B-P2-L1	Lateral	AC IMPORTACIONES	750,000
PB	B-P2-L2	Lateral	BROETTO	750,000
PB	B-P1	Puntera	SANTOS	0
PB	B-P1-L1	Lateral	MERCADOPLUS	750,000
PB	B-P1-L2	Lateral	MERCADOPLUS	750,000"""


def main() -> None:
    result = AcuerdosComercialesRepository(DATABASE_URL).import_ubicaciones_aregua(
        PERFUMERIA_AREGUA,
        cambiado_por="migracion_perfumeria_aregua",
    )
    print(result)


if __name__ == "__main__":
    main()
