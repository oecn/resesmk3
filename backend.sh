#!/usr/bin/env bash
# ============================================================
# backend.sh - Gestion del backend Reces MK13 en produccion
# Ubuntu 22.04 LTS
#
# Uso:
#   ./backend.sh install     Prepara venv, deps y servicio systemd
#   ./backend.sh update      Reinstala deps y recarga el servicio (post-pull)
#   ./backend.sh migrate     Aplica todas las migraciones incrementales
#   ./backend.sh start       Aplica migraciones e inicia el servicio
#   ./backend.sh stop        Detiene el servicio
#   ./backend.sh restart     Aplica migraciones y reinicia el servicio
#   ./backend.sh status      Estado del servicio
#   ./backend.sh logs        Ultimas lineas de log en vivo
#   ./backend.sh uninstall   Elimina el servicio systemd (conserva archivos)
# ============================================================

set -euo pipefail

SERVICE_NAME="reces-backend"
PYTHON_MIN="3.10"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/.venv"
ENV_FILE="$PROJECT_DIR/.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

RUN_USER="${RUN_USER:-$(whoami)}"
RUN_GROUP="${RUN_GROUP:-$(id -gn "$RUN_USER")}"

# Migraciones idempotentes aplicadas en orden en cada deploy.
# 001_auth_schema.py excluido: siembra el usuario admin y no es idempotente.
# 007_flota_facturas_unicas.py tiene el mismo prefijo que 007_lote_cerrado.py (bug historico);
#   ambos se aplican explicitamente a continuacion.
SAFE_MIGRATIONS=(
    "002_usuario_sucursal.py"
    "003_flota_base.py"
    "004_gastos_flota_proveedor_manual.py"
    "005_flota_vehiculos_incompletos.py"
    "006_flota_tipo_combustible.py"
    "007_lote_cerrado.py"
    "007_flota_facturas_unicas.py"
    "008_sesiones_expiradas_cleanup.py"
    "009_menudencias_unificadas.py"
    "010_gastos_flota_soft_delete.py"
    "011_facturas_por_proveedor.py"
    "012_acuerdos_comerciales.py"
    "013_acuerdos_duracion_meses.py"
    "014_acuerdos_historial.py"
    "015_acuerdos_renovacion.py"
    "016_usuario_modulos_permitidos.py"
    "017_archivos_propiedades.py"
)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}${BOLD}[INFO]${RESET}  $*"; }
ok()      { echo -e "${GREEN}${BOLD}[ OK ]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}${BOLD}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}${BOLD}[ERR ]${RESET}  $*" >&2; }
die()     { error "$*"; exit 1; }
section() { echo -e "\n${BOLD}== $* ==${RESET}"; }

require_root() {
    [[ $EUID -eq 0 ]] || die "Este comando requiere sudo. Ejecuta: sudo ./backend.sh $1"
}

require_file() {
    [[ -f "$1" ]] || die "Archivo no encontrado: $1"
}

python_version_ok() {
    local py_bin="$1"
    local ver
    ver=$("$py_bin" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null) || return 1
    python3 -c "
import sys
req = tuple(int(x) for x in '${PYTHON_MIN}'.split('.'))
got = tuple(int(x) for x in '${ver}'.split('.'))
sys.exit(0 if got >= req else 1)
"
}

find_python() {
    for py in python3.12 python3.11 python3.10 python3; do
        if command -v "$py" &>/dev/null && python_version_ok "$py"; then
            echo "$py"
            return 0
        fi
    done
    return 1
}

load_env_file() {
    if [[ -f "$ENV_FILE" ]]; then
        set -a
        # shellcheck disable=SC1090
        source "$ENV_FILE"
        set +a
    fi
}

cmd_migrate() {
    require_root "migrate"
    [[ -x "$VENV_DIR/bin/python" ]] || die "Venv no encontrado. Ejecuta: sudo ./backend.sh install"
    require_file "$ENV_FILE"

    section "Aplicando migraciones (${#SAFE_MIGRATIONS[@]} scripts)"
    load_env_file
    local count=0
    for migration in "${SAFE_MIGRATIONS[@]}"; do
        local path="$PROJECT_DIR/web/backend/migrations/$migration"
        require_file "$path"
        info "[$((++count))/${#SAFE_MIGRATIONS[@]}] $migration"
        "$VENV_DIR/bin/python" "$path"
    done
    ok "Todas las migraciones aplicadas (${#SAFE_MIGRATIONS[@]} scripts)"
}

cmd_update() {
    require_root "update"
    [[ -d "$VENV_DIR" ]] || die "Venv no encontrado. Ejecuta: sudo ./backend.sh install"
    require_file "$PROJECT_DIR/web/backend/requirements.txt"

    section "Actualizando dependencias"
    info "Actualizando pip y wheel"
    "$VENV_DIR/bin/pip" install --quiet --upgrade pip wheel
    info "Reinstalando requirements.txt"
    "$VENV_DIR/bin/pip" install --quiet -r "$PROJECT_DIR/web/backend/requirements.txt"
    ok "Dependencias actualizadas"

    if [[ -f "$SERVICE_FILE" ]]; then
        cmd_migrate
        info "Reiniciando ${SERVICE_NAME}..."
        systemctl restart "$SERVICE_NAME"
        sleep 1
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            ok "Servicio reiniciado con dependencias actualizadas"
        else
            error "El servicio no reinicio correctamente"
            journalctl -u "$SERVICE_NAME" -n 20 --no-pager
            exit 1
        fi
    else
        warn "Servicio no instalado; omitiendo reinicio"
    fi
}

cmd_install() {
    require_root "install"
    section "Verificando requisitos del sistema"

    PYTHON_BIN=$(find_python) || die "Python >= ${PYTHON_MIN} no encontrado. Instala con: sudo apt install python3.10"
    ok "Python: $($PYTHON_BIN --version)"

    $PYTHON_BIN -m pip --version &>/dev/null || die "pip no encontrado. Ejecuta: sudo apt install python3-pip"
    $PYTHON_BIN -m venv --help &>/dev/null || die "venv no encontrado. Ejecuta: sudo apt install python3-venv"

    if ! dpkg -s libpq-dev &>/dev/null 2>&1; then
        warn "libpq-dev no instalado. Instalando..."
        apt-get install -y libpq-dev > /dev/null
        ok "libpq-dev instalado"
    fi

    section "Configurando entorno virtual"
    if [[ -d "$VENV_DIR" ]]; then
        warn "Entorno virtual ya existe en $VENV_DIR; se reutiliza"
    else
        info "Creando venv en $VENV_DIR"
        $PYTHON_BIN -m venv "$VENV_DIR"
        ok "Venv creado"
    fi

    info "Actualizando pip y wheel"
    "$VENV_DIR/bin/pip" install --quiet --upgrade pip wheel

    info "Instalando dependencias desde requirements.txt"
    require_file "$PROJECT_DIR/web/backend/requirements.txt"
    "$VENV_DIR/bin/pip" install --quiet -r "$PROJECT_DIR/web/backend/requirements.txt"
    ok "Dependencias instaladas"

    section "Configurando variables de entorno"
    if [[ -f "$ENV_FILE" ]]; then
        warn ".env ya existe; no se sobreescribe"
    else
        cat > "$ENV_FILE" <<EOF
# Reces MK13 - Variables de entorno del backend
# Ajusta los valores antes de iniciar el servicio.

DATABASE_URL=postgresql://postgres:postgres@192.168.10.13:5432/reces
ARCHIVOS_DIRECTORIO_ROOT=${PROJECT_DIR}/archivos_directorio
EOF
        chown "${RUN_USER}:${RUN_GROUP}" "$ENV_FILE"
        chmod 640 "$ENV_FILE"
        ok ".env creado en $ENV_FILE"
        warn "IMPORTANTE: revisa DATABASE_URL y ARCHIVOS_DIRECTORIO_ROOT antes de iniciar."
    fi

    mkdir -p "${ARCHIVOS_DIRECTORIO_ROOT:-$PROJECT_DIR/archivos_directorio}"
    chown -R "${RUN_USER}:${RUN_GROUP}" "$PROJECT_DIR"

    section "Registrando servicio systemd"
    cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Reces MK13 - Backend API
After=network.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_GROUP}
WorkingDirectory=${PROJECT_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${VENV_DIR}/bin/python ${PROJECT_DIR}/web/run.py
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

    chmod 644 "$SERVICE_FILE"
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    ok "Servicio registrado y habilitado: ${SERVICE_NAME}"

    section "Instalacion completada"
    echo -e "  Proyecto : ${BOLD}${PROJECT_DIR}${RESET}"
    echo -e "  Venv     : ${BOLD}${VENV_DIR}${RESET}"
    echo -e "  Env file : ${BOLD}${ENV_FILE}${RESET}"
    echo -e "  Servicio : ${BOLD}${SERVICE_FILE}${RESET}"
    echo
    echo -e "  Proximo paso -> ${GREEN}sudo ./backend.sh migrate && sudo ./backend.sh start${RESET}"
}

cmd_start() {
    require_root "start"
    [[ -f "$SERVICE_FILE" ]] || die "Servicio no instalado. Ejecuta: sudo ./backend.sh install"

    cmd_migrate
    info "Iniciando ${SERVICE_NAME}..."
    systemctl start "$SERVICE_NAME"

    sleep 1
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        ok "Backend corriendo en http://0.0.0.0:8008"
        systemctl --no-pager status "$SERVICE_NAME" | tail -5
    else
        error "El servicio no pudo iniciarse."
        journalctl -u "$SERVICE_NAME" -n 20 --no-pager
        exit 1
    fi
}

cmd_stop() {
    require_root "stop"
    info "Deteniendo ${SERVICE_NAME}..."
    systemctl stop "$SERVICE_NAME"
    ok "Servicio detenido"
}

cmd_restart() {
    require_root "restart"
    cmd_migrate
    info "Reiniciando ${SERVICE_NAME}..."
    systemctl restart "$SERVICE_NAME"
    sleep 1
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        ok "Servicio reiniciado correctamente"
    else
        error "El servicio no reinicio correctamente"
        journalctl -u "$SERVICE_NAME" -n 20 --no-pager
        exit 1
    fi
}

cmd_status() {
    systemctl --no-pager status "$SERVICE_NAME" 2>/dev/null || {
        warn "Servicio no instalado o no registrado en systemd"
        exit 1
    }
}

cmd_logs() {
    info "Mostrando logs de ${SERVICE_NAME} (Ctrl+C para salir)..."
    journalctl -u "$SERVICE_NAME" -n 50 -f
}

cmd_uninstall() {
    require_root "uninstall"
    warn "Esto eliminara el servicio systemd. Los archivos del proyecto no se borran."
    read -rp "Continuar? [s/N] " confirm
    [[ "${confirm,,}" == "s" ]] || { info "Cancelado"; exit 0; }

    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload
    ok "Servicio ${SERVICE_NAME} eliminado"
}

case "${1:-help}" in
    install)   cmd_install   ;;
    update)    cmd_update    ;;
    migrate)   cmd_migrate   ;;
    start)     cmd_start     ;;
    stop)      cmd_stop      ;;
    restart)   cmd_restart   ;;
    status)    cmd_status    ;;
    logs)      cmd_logs      ;;
    uninstall) cmd_uninstall ;;
    *)
        echo -e "${BOLD}Uso:${RESET} sudo ./backend.sh <comando>"
        echo
        echo -e "  ${GREEN}install${RESET}    Prepara venv, instala deps y registra el servicio systemd"
        echo -e "  ${GREEN}update${RESET}     Reinstala deps, aplica migraciones y reinicia (post git pull)"
        echo -e "  ${GREEN}migrate${RESET}    Aplica todas las migraciones incrementales"
        echo -e "  ${GREEN}start${RESET}      Aplica migraciones e inicia el servicio"
        echo -e "  ${GREEN}stop${RESET}       Detiene el servicio"
        echo -e "  ${GREEN}restart${RESET}    Aplica migraciones y reinicia el servicio"
        echo -e "  ${GREEN}status${RESET}     Muestra el estado del servicio"
        echo -e "  ${GREEN}logs${RESET}       Sigue los logs en tiempo real"
        echo -e "  ${GREEN}uninstall${RESET}  Elimina el servicio systemd"
        echo
        echo -e "  Variable opcional: ${CYAN}RUN_USER${RESET} (default: usuario actual)"
        echo -e "  Ejemplo: ${CYAN}RUN_USER=deploy sudo ./backend.sh install${RESET}"
        ;;
esac
