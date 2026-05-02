from __future__ import annotations

from web.backend.modules.acuerdos_comerciales.repository import AcuerdosComercialesRepository


class AcuerdosComercialesService:
    def __init__(self, repository: AcuerdosComercialesRepository):
        self.repository = repository

    def list_acuerdos(self, search=None):
        return self.repository.list_acuerdos_comerciales(search=search)

    def list_proveedores(self, search=None):
        return self.repository.list_acuerdos_proveedores(search=search)

    def list_historial(self, acuerdo_id):
        return self.repository.list_acuerdo_historial(acuerdo_id)

    def list_historial_proveedor(self, proveedor_id):
        return self.repository.list_acuerdos_por_proveedor(proveedor_id)

    def save_proveedor(self, payload):
        return self.repository.save_acuerdos_proveedor(payload)

    def save_acuerdo(self, payload, cambiado_por=None):
        return self.repository.save_acuerdo_comercial(payload, cambiado_por=cambiado_por)
