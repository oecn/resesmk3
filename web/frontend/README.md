# Dashboard web de Reces

Tablero Angular para revisar KPIs y cargar recepcion por sucursal.

## Estructura

- `../backend/dashboard_api.py`: implementacion de la API.
- `../run.py`: lanzador de la API.
- `./src`: aplicacion Angular.

## Ejecutar API

Desde la raiz del proyecto:

```bash
python web/run.py
```

La API queda disponible en `http://127.0.0.1:8008/api`.

## Ejecutar Angular

Requiere Node.js y npm instalados.

```bash
cd web/frontend
npm install
npm start
```

Abrir `http://127.0.0.1:4200`.

Para abrir desde otro dispositivo en la red:

```bash
cd web/frontend
.\node_modules\.bin\ng.cmd serve --host 0.0.0.0 --port 4200
```

Abrir `http://192.168.10.12:4200`.

## Escritura controlada

El dashboard de KPIs usa consultas de solo lectura. La seccion `Recepcion` agrega endpoints especificos para actualizar kg recibido y cargar, editar o eliminar menudencias de `ITAUGUA`, `LUQUE` y `AREGUA`.
