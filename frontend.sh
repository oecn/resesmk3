#!/usr/bin/env bash
# ============================================================
#  frontend.sh — Gestión del frontend Reces MK13 en producción
#  Ubuntu 22.04.4 LTS
#
#  El frontend se sirve como archivos estáticos con nginx.
#  ng serve es solo para desarrollo — NO se usa en producción.
#
#  Uso:
#    ./frontend.sh install     Instala Node, nginx, compila y despliega
#    ./frontend.sh deploy      Recompila y redespliega (tras cambios de código)
#    ./frontend.sh start       Inicia nginx
#    ./frontend.sh stop        Detiene nginx
#    ./frontend.sh restart     Reinicia nginx
#    ./frontend.sh status      Estado de nginx
#    ./frontend.sh logs        Logs de acceso y error en vivo
#    ./frontend.sh uninstall   Elimina la config de nginx (conserva archivos)
#
#  Variables de entorno configurables:
#    API_URL     URL del backend  (default: http://192.168.10.12:8008/api)
#    SERVE_PORT  Puerto HTTP      (default: 80)
#    SERVER_NAME Nombre del host  (default: _  → acepta cualquier host)
# ============================================================

set -euo pipefail

# ── Configuración ────────────────────────────────────────────
NODE_REQUIRED_MAJOR=20

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/web/frontend"
ENV_TS="$FRONTEND_DIR/src/environments/environment.ts"

# Angular 17 (application builder) pone los archivos en browser/
DIST_DIR="$FRONTEND_DIR/dist/reces-dashboard/browser"

NGINX_SITE_NAME="reces-frontend"
NGINX_AVAILABLE="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
NGINX_LOG_DIR="/var/log/nginx"

SERVE_PORT="${SERVE_PORT:-80}"
SERVER_NAME="${SERVER_NAME:-_}"

# API_URL: si no se define, se lee del environment.ts actual
if [[ -z "${API_URL:-}" ]]; then
    API_URL=$(grep -oP "(?<=apiUrl: ')[^']+" "$ENV_TS" 2>/dev/null || echo "http://192.168.10.12:8008/api")
fi

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
    [[ $EUID -eq 0 ]] || die "Este comando requiere sudo. Ejecutá: sudo ./frontend.sh $1"
}

require_file() {
    [[ -f "$1" ]] || die "Archivo no encontrado: $1"
}

# ── Instalar Node.js vía NodeSource ──────────────────────────
install_node() {
    info "Instalando Node.js ${NODE_REQUIRED_MAJOR}.x desde NodeSource..."
    apt-get install -y ca-certificates curl gnupg > /dev/null
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_REQUIRED_MAJOR}.x" | bash - > /dev/null
    apt-get install -y nodejs > /dev/null
    ok "Node.js instalado: $(node --version)  npm: $(npm --version)"
}

check_node() {
    if ! command -v node &>/dev/null; then
        warn "Node.js no encontrado — instalando..."
        install_node
        return
    fi

    local major
    major=$(node --version | sed 's/v//' | cut -d. -f1)
    if (( major < NODE_REQUIRED_MAJOR )); then
        warn "Node.js v${major} encontrado — se requiere v${NODE_REQUIRED_MAJOR}+. Actualizando..."
        install_node
    else
        ok "Node.js: $(node --version)  npm: $(npm --version)"
    fi
}

# ── Parchear environment.ts con API_URL ─────────────────────
patch_environment() {
    require_file "$ENV_TS"
    info "Configurando apiUrl → ${API_URL}"
    # Reemplaza el valor de apiUrl sin importar la IP/puerto actual
    sed -i "s|apiUrl:.*|apiUrl: '${API_URL}',|" "$ENV_TS"
    ok "environment.ts actualizado"
}

# ── Compilar el bundle de producción ────────────────────────
build_frontend() {
    section "Compilando Angular (producción)"
    require_file "$FRONTEND_DIR/package.json"

    cd "$FRONTEND_DIR"

    info "Instalando dependencias npm..."
    npm ci --silent

    info "Ejecutando ng build --configuration production..."
    npx ng build --configuration production

    [[ -d "$DIST_DIR" ]] || die "Build fallido: no se encontró $DIST_DIR"
    ok "Build completado → $DIST_DIR"
    cd "$PROJECT_DIR"
}

# ── Desplegar archivos en /var/www ───────────────────────────
deploy_files() {
    section "Desplegando archivos estáticos"

    local webroot="/var/www/${NGINX_SITE_NAME}"
    mkdir -p "$webroot"
    rsync -a --delete "$DIST_DIR/" "$webroot/"
    chown -R www-data:www-data "$webroot"
    ok "Archivos desplegados en $webroot"
    echo "$webroot"
}

# ── Configurar nginx ─────────────────────────────────────────
configure_nginx() {
    local webroot="$1"
    section "Configurando nginx"

    cat > "$NGINX_AVAILABLE" <<NGINX
server {
    listen ${SERVE_PORT};
    server_name ${SERVER_NAME};

    root ${webroot};
    index index.html;

    # Compresión gzip para JS/CSS/HTML
    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1024;

    # Cache para assets con hash en el nombre (Angular los genera con hash)
    location ~* \.(js|css|woff2?|ttf|eot|svg|ico|png|jpg|jpeg|gif|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # index.html sin cache (SPA: siempre debe ser el más reciente)
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        try_files \$uri =404;
    }

    # SPA fallback: todas las rutas sirven index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Logs
    access_log ${NGINX_LOG_DIR}/${NGINX_SITE_NAME}-access.log;
    error_log  ${NGINX_LOG_DIR}/${NGINX_SITE_NAME}-error.log warn;
}
NGINX

    # Habilitar el sitio
    ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"

    # Desactivar el sitio default de nginx para evitar conflictos en el puerto 80
    if [[ -f "/etc/nginx/sites-enabled/default" && "$SERVE_PORT" == "80" ]]; then
        rm -f /etc/nginx/sites-enabled/default
        warn "Sitio 'default' de nginx desactivado (conflicto con puerto 80)"
    fi

    nginx -t || die "Configuración de nginx inválida"
    ok "nginx configurado en $NGINX_AVAILABLE"
}

# ── Subcomandos ──────────────────────────────────────────────

cmd_install() {
    require_root "install"

    section "Verificando requisitos del sistema"

    # Node.js
    check_node

    # nginx
    if ! command -v nginx &>/dev/null; then
        info "Instalando nginx..."
        apt-get install -y nginx > /dev/null
        ok "nginx instalado: $(nginx -v 2>&1)"
    else
        ok "nginx: $(nginx -v 2>&1)"
    fi

    # rsync (para deploy_files)
    if ! command -v rsync &>/dev/null; then
        apt-get install -y rsync > /dev/null
    fi

    # Parchear environment.ts y compilar
    patch_environment
    build_frontend

    # Desplegar y configurar nginx
    WEBROOT=$(deploy_files)
    configure_nginx "$WEBROOT"

    # Habilitar y arrancar nginx
    systemctl enable nginx > /dev/null
    systemctl restart nginx

    section "Instalación completada"
    echo -e "  Frontend : ${BOLD}${WEBROOT}${RESET}"
    echo -e "  Nginx    : ${BOLD}${NGINX_AVAILABLE}${RESET}"
    echo -e "  API URL  : ${BOLD}${API_URL}${RESET}"
    echo -e "  Puerto   : ${BOLD}${SERVE_PORT}${RESET}"
    echo
    local ip
    ip=$(hostname -I | awk '{print $1}')
    if [[ "$SERVE_PORT" == "80" ]]; then
        echo -e "  Accedé desde la red → ${GREEN}http://${ip}${RESET}"
    else
        echo -e "  Accedé desde la red → ${GREEN}http://${ip}:${SERVE_PORT}${RESET}"
    fi
}

cmd_deploy() {
    require_root "deploy"
    section "Redesplegando frontend"

    patch_environment
    build_frontend
    WEBROOT=$(deploy_files)

    # Recargar nginx sin downtime
    systemctl reload nginx
    ok "Redeploy completado → ${WEBROOT}  (API: ${API_URL})"
}

cmd_start() {
    require_root "start"
    systemctl start nginx
    ok "nginx iniciado"
    systemctl --no-pager status nginx | tail -4
}

cmd_stop() {
    require_root "stop"
    systemctl stop nginx
    ok "nginx detenido"
}

cmd_restart() {
    require_root "restart"
    nginx -t || die "Configuración de nginx inválida"
    systemctl restart nginx
    ok "nginx reiniciado"
}

cmd_status() {
    systemctl --no-pager status nginx 2>/dev/null || {
        warn "nginx no está instalado o no está registrado en systemd"
        exit 1
    }
}

cmd_logs() {
    local access="${NGINX_LOG_DIR}/${NGINX_SITE_NAME}-access.log"
    local err="${NGINX_LOG_DIR}/${NGINX_SITE_NAME}-error.log"

    info "Mostrando logs (Ctrl+C para salir)..."

    if [[ -f "$access" || -f "$err" ]]; then
        tail -n 30 -f \
            ${access:+"$access"} \
            ${err:+"$err"} 2>/dev/null
    else
        warn "Logs del sitio no encontrados. Mostrando log de sistema nginx:"
        journalctl -u nginx -n 50 -f
    fi
}

cmd_uninstall() {
    require_root "uninstall"
    warn "Esto eliminará la configuración de nginx del sitio (los archivos del proyecto NO se borran)."
    read -rp "¿Continuar? [s/N] " confirm
    [[ "${confirm,,}" == "s" ]] || { info "Cancelado"; exit 0; }

    rm -f "$NGINX_ENABLED" "$NGINX_AVAILABLE"
    systemctl reload nginx 2>/dev/null || true
    ok "Configuración de nginx eliminada"
    info "Los archivos en /var/www/${NGINX_SITE_NAME} fueron conservados"
}

# ── Punto de entrada ─────────────────────────────────────────
case "${1:-help}" in
    install)   cmd_install   ;;
    deploy)    cmd_deploy    ;;
    start)     cmd_start     ;;
    stop)      cmd_stop      ;;
    restart)   cmd_restart   ;;
    status)    cmd_status    ;;
    logs)      cmd_logs      ;;
    uninstall) cmd_uninstall ;;
    *)
        echo -e "${BOLD}Uso:${RESET} sudo ./frontend.sh <comando>"
        echo
        echo -e "  ${GREEN}install${RESET}    Instala Node, nginx, compila y despliega"
        echo -e "  ${GREEN}deploy${RESET}     Recompila y redespliega sin reinstalar"
        echo -e "  ${GREEN}start${RESET}      Inicia nginx"
        echo -e "  ${GREEN}stop${RESET}       Detiene nginx"
        echo -e "  ${GREEN}restart${RESET}    Reinicia nginx"
        echo -e "  ${GREEN}status${RESET}     Estado de nginx"
        echo -e "  ${GREEN}logs${RESET}       Logs de acceso y error en vivo"
        echo -e "  ${GREEN}uninstall${RESET}  Elimina la config nginx del sitio"
        echo
        echo -e "${BOLD}Variables de entorno:${RESET}"
        echo -e "  ${CYAN}API_URL${RESET}      URL del backend  (actual: ${API_URL})"
        echo -e "  ${CYAN}SERVE_PORT${RESET}   Puerto HTTP       (actual: ${SERVE_PORT})"
        echo -e "  ${CYAN}SERVER_NAME${RESET}  Nombre del host   (actual: ${SERVER_NAME})"
        echo
        echo -e "${BOLD}Ejemplos:${RESET}"
        echo -e "  sudo ./frontend.sh install"
        echo -e "  API_URL=http://192.168.10.20:8008/api sudo ./frontend.sh install"
        echo -e "  SERVE_PORT=8080 SERVER_NAME=192.168.10.12 sudo ./frontend.sh install"
        echo -e "  API_URL=http://nuevo-server:8008/api sudo ./frontend.sh deploy"
        ;;
esac
