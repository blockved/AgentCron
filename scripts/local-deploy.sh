#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"
ACTION="${1:-up}"

cd "$ROOT_DIR"

log() {
  printf '[agentcron] %s\n' "$*"
}

die() {
  printf '[agentcron] ERROR: %s\n' "$*" >&2
  exit 1
}

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    printf 'docker compose'
  elif have_cmd docker-compose; then
    printf 'docker-compose'
  else
    die "Docker Compose not found. Install Docker Compose v2 or docker-compose."
  fi
}

random_hex() {
  local bytes="$1"
  if have_cmd openssl; then
    openssl rand -hex "$bytes"
  elif have_cmd node; then
    node -e "console.log(require('node:crypto').randomBytes($bytes).toString('hex'))"
  else
    die "openssl or node is required to generate local secrets."
  fi
}

port_in_use() {
  local port="$1"
  if have_cmd ss; then
    ss -ltn "( sport = :$port )" | grep -q ":$port"
  elif have_cmd lsof; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}

choose_mysql_port() {
  local port
  for port in 3306 3307 3308 13306; do
    if ! port_in_use "$port"; then
      printf '%s\n' "$port"
      return 0
    fi
  done
  die "No free MySQL port found among 3306, 3307, 3308, 13306."
}

ensure_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$ENV_EXAMPLE" ]]; then
      cp "$ENV_EXAMPLE" "$ENV_FILE"
      log "Created .env from .env.example"
    else
      touch "$ENV_FILE"
      log "Created .env"
    fi
  fi

  if ! grep -q '^MYSQL_ROOT_PASSWORD=' "$ENV_FILE"; then
    printf '\nMYSQL_ROOT_PASSWORD=password\n' >> "$ENV_FILE"
  fi

  if ! grep -q '^MYSQL_PORT=' "$ENV_FILE"; then
    printf 'MYSQL_PORT=%s\n' "$(choose_mysql_port)" >> "$ENV_FILE"
  fi

  if ! grep -q '^MASTER_KEY=' "$ENV_FILE"; then
    printf 'MASTER_KEY="%s"\n' "$(random_hex 32)" >> "$ENV_FILE"
  elif grep -q '^MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"$' "$ENV_FILE"; then
    sed -i.bak "s/^MASTER_KEY=.*/MASTER_KEY=\"$(random_hex 32)\"/" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
  fi

  if ! grep -q '^JWT_SECRET=' "$ENV_FILE"; then
    printf 'JWT_SECRET="%s"\n' "$(random_hex 32)" >> "$ENV_FILE"
  elif grep -q '^JWT_SECRET="your-jwt-secret-here"$' "$ENV_FILE"; then
    sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=\"$(random_hex 32)\"/" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
  fi
}

wait_for_http() {
  local url="$1"
  local name="$2"
  local max_attempts="${3:-60}"
  local attempt=1

  if ! have_cmd curl; then
    log "curl not found; skipped waiting for $name"
    return 0
  fi

  while (( attempt <= max_attempts )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "$name is reachable"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  log "$name did not respond within $((max_attempts * 2))s; check logs with: $0 logs"
}

usage() {
  cat <<'EOF'
Usage: ./scripts/local-deploy.sh [command]

Commands:
  up        Create .env if needed, build images, and start local services
  down      Stop local services
  restart   Restart local services
  logs      Follow service logs
  status    Show service status

Local URLs:
  Web: http://localhost:3001
  API: http://localhost:3000

Default login after seed:
  admin / admin123
EOF
}

require_docker() {
  have_cmd docker || die "Docker is not installed or not in PATH."
  docker info >/dev/null 2>&1 || die "Docker daemon is not running or current user cannot access it."
}

export_compose_defaults() {
  export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-password}"
  export MASTER_KEY="${MASTER_KEY:-0000000000000000000000000000000000000000000000000000000000000000}"
  export JWT_SECRET="${JWT_SECRET:-local-placeholder-secret}"
}

main() {
  local compose
  compose="$(compose_cmd)"

  case "$ACTION" in
    up)
      require_docker
      ensure_env_file
      log "Building and starting local services..."
      $compose up -d --build
      log "Services started."
      $compose ps
      wait_for_http "http://localhost:3001" "Web"
      log "Open: http://localhost:3001"
      log "API:  http://localhost:3000"
      log "Login: admin / admin123"
      log "Logs: $0 logs"
      ;;
    down)
      require_docker
      export_compose_defaults
      $compose down
      ;;
    restart)
      require_docker
      "$0" down
      "$0" up
      ;;
    logs)
      require_docker
      export_compose_defaults
      $compose logs -f --tail=200
      ;;
    status|ps)
      require_docker
      export_compose_defaults
      $compose ps
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      usage
      die "Unknown command: $ACTION"
      ;;
  esac
}

main "$@"
