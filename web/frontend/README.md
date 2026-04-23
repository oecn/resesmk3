# Dashboard web de Reces

Tablero Angular para revisar KPIs y cargar recepcion por sucursal.

## Estructura

- `../dashboard/dashboard_api.py`: implementacion de la API.
- `../dashboard_api.py`: lanzador compatible para seguir usando `python dashboard_api.py`.
- `./src`: aplicacion Angular.

## Ejecutar API

Desde la raiz del proyecto:

```bash
python dashboard_api.py
```

La API queda disponible en `http://127.0.0.1:8008/api`.

## Ejecutar Angular

Requiere Node.js y npm instalados.

```bash
cd web-dashboard
npm install
npm start
```

Abrir `http://127.0.0.1:4200`.

Para abrir desde otro dispositivo en la red:

```bash
cd web-dashboard
.\node_modules\.bin\ng.cmd serve --host 0.0.0.0 --port 4200
```

Abrir `http://192.168.10.12:4200`.

## Escritura controlada

El dashboard de KPIs usa consultas de solo lectura. La seccion `Recepcion` agrega endpoints especificos para actualizar kg recibido y cargar, editar o eliminar menudencias de `ITAUGUA`, `LUQUE` y `AREGUA`.
