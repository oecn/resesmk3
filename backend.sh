#!/usr/bin/env bash
# ============================================================
#  backend.sh — Gestión del backend Reces MK13 en producción
#  Ubuntu 22.04.4 LTS
#
#  Uso:
#    ./backend.sh install     Prepara venv, deps y servicio systemd
#    ./backend.sh start       Inicia el servicio
#    ./backend.sh stop        Detiene el servicio
#    ./backend.sh restart     Reinicia el servicio
#    ./backend.sh status      Estado del servicio
#    ./backend.sh logs        Últimas 50 líneas de log (sigue en vivo)
#    ./backend.sh uninstall   Elimina el servicio systemd (conserva archivos)
# ============================================================

set -euo pipefail

# ── Configuración ────────────────────────────────────────────
SERVICE_NAME="reces-backend"
PYTHON_MIN="3.10"

# Directorio raíz del proyecto (donde está este script)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/.venv"
ENV_FILE="$PROJECT_DIR/.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Usuario que correrá el servicio (se usa el usuario actual si no se define)
RUN_USER="${RUN_USER:-$(whoami)}"
RUN_GROUP="${RUN_GROUP:-$(id -gn "$RUN_USER")}"

# ── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}${BOLD}[INFO]${RESET}  $*"; }
ok()      { echo -e "${GREEN}${BOLD}[ OK ]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}${BOLD}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}${BOLD}[ERR ]${RESET}  $*" >&2; }
die()     { error "$*"; exit 1; }
section() { echo -e "\n${BOLD}══ $* ══${RESET}"; }

# ── Comprobaciones previas ───────────────────────────────────
require_root() {
    [[ $EUID -eq 0 ]] || die "Este comando requiere sudo. Ejecutá: sudo ./backend.sh $1"
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
            echo "$py"; return 0
        fi
    done
    return 1
}

# ── Subcomandos ──────────────────────────────────────────────

cmd_install() {
    require_root "install"
    section "Verificando requisitos del sistema"

    # Python
    PYTHON_BIN=$(find_python) || die "Python >= ${PYTHON_MIN} no encontrado. Instalá con: sudo apt install python3.10"
    ok "Python: $($PYTHON_BIN --version)"

    # pip + venv
    $PYTHON_BIN -m pip --version &>/dev/null   || die "pip no encontrado. Ejecutá: sudo apt install python3-pip"
    $PYTHON_BIN -m venv --help &>/dev/null      || die "venv no encontrado. Ejecutá: sudo apt install python3-venv"

    # Dependencias del sistema para psycopg2
    if ! dpkg -s libpq-dev &>/dev/null 2>&1; then
        warn "libpq-dev no instalado. Instalando..."
        apt-get install -y libpq-dev > /dev/null
        ok "libpq-dev instalado"
    fi

    # ── Entorno virtual ──
    section "Configurando entorno virtual"
    if [[ -d "$VENV_DIR" ]]; then
        warn "Entorno virtual ya existe en $VENV_DIR — se reutiliza"
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

    # ── Archivo .env ──
    section "Configurando variables de entorno"
    if [[ -f "$ENV_FILE" ]]; then
        warn ".env ya existe — no se sobreescribe"
    else
        cat > "$ENV_FILE" <<EOF
# Reces MK13 — Variables de entorno del backend
# Ajustá los valores antes de iniciar el servicio

DATABASE_URL=postgresql://postgres:postgres@192.168.10.13:5432/reces
EOF
        chown "${RUN_USER}:${RUN_GROUP}" "$ENV_FILE"
        chmod 640 "$ENV_FILE"
        ok ".env creado en $ENV_FILE"
        warn "IMPORTANTE: Revisá $ENV_FILE y ajustá DATABASE_URL antes de iniciar."
    fi

    # ── Permisos del proyecto ──
    chown -R "${RUN_USER}:${RUN_GROUP}" "$PROJECT_DIR"

    # ── Servicio systemd ──
    section "Registrando servicio systemd"
    cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Reces MK13 — Backend API
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

# Seguridad básica
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

    chmod 644 "$SERVICE_FILE"
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    ok "Servicio registrado y habilitado: ${SERVICE_NAME}"

    section "Instalación completada"
    echo -e "  Proyecto : ${BOLD}${PROJECT_DIR}${RESET}"
    echo -e "  Venv     : ${BOLD}${VENV_DIR}${RESET}"
    echo -e "  Env file : ${BOLD}${ENV_FILE}${RESET}"
    echo -e "  Servicio : ${BOLD}${SERVICE_FILE}${RESET}"
    echo
    echo -e "  Próximo paso → ${GREEN}sudo ./backend.sh start${RESET}"
}

cmd_start() {
    require_root "start"
    [[ -f "$SERVICE_FILE" ]] || die "Servicio no instalado. Ejecutá: sudo ./backend.sh install"

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
    info "Reiniciando ${SERVICE_NAME}..."
    systemctl restart "$SERVICE_NAME"
    sleep 1
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        ok "Servicio reiniciado correctamente"
    else
        error "El servicio no reinició correctamente"
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
    warn "Esto eliminará el servicio systemd (los archivos del proyecto NO se borran)."
    read -rp "¿Continuar? [s/N] " confirm
    [[ "${confirm,,}" == "s" ]] || { info "Cancelado"; exit 0; }

    systemctl stop "$SERVICE_NAME"   2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload
    ok "Servicio ${SERVICE_NAME} eliminado"
}

# ── Punto de entrada ─────────────────────────────────────────
case "${1:-help}" in
    install)   cmd_install   ;;
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
        echo -e "  ${GREEN}start${RESET}      Inicia el servicio"
        echo -e "  ${GREEN}stop${RESET}       Detiene el servicio"
        echo -e "  ${GREEN}restart${RESET}    Reinicia el servicio"
        echo -e "  ${GREEN}status${RESET}     Muestra el estado del servicio"
        echo -e "  ${GREEN}logs${RESET}       Sigue los logs en tiempo real"
        echo -e "  ${GREEN}uninstall${RESET}  Elimina el servicio systemd"
        echo
        echo -e "  Variable de entorno opcional: ${CYAN}RUN_USER${RESET} (default: usuario actual)"
        echo -e "  Ejemplo:  ${CYAN}RUN_USER=deploy sudo ./backend.sh install${RESET}"
        ;;
esac
