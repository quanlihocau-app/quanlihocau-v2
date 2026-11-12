# Được source bởi script deploy. Không chạy trực tiếp.
# Gốc repo là thư mục có deploy/docker-compose.yml, không phụ thuộc cwd.
qlhc_repo_root() {
    local dir
    dir="$(cd -P "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    while [[ "$dir" != "/" ]]; do
        if [[ -f "$dir/deploy/docker-compose.yml" && -f "$dir/package.json" ]]; then
            printf '%s\n' "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    echo "Không thấy gốc repo từ script $(basename "${BASH_SOURCE[1]}")." >&2
    return 1
}

# COMPOSE_FILES là danh sách file -f, ngăn bởi dấu hai chấm.
# Nếu không đặt, và cũng không có COMPOSE_FILE của Docker, dùng deploy/docker-compose.yml.
# Cùng bộ file với stack đang chạy thì `up -d db` không tạo lại container với cấu hình khác.
qlhc_compose_array() {
    local root="$1"
    local part
    COMPOSE=(docker compose)
    if [[ -n "${COMPOSE_FILES:-}" ]]; then
        local IFS=':'
        for part in $COMPOSE_FILES; do
            [[ -n "$part" ]] || continue
            if [[ "$part" != /* ]]; then
                part="${root}/${part}"
            fi
            COMPOSE+=(-f "$part")
        done
    elif [[ -z "${COMPOSE_FILE:-}" ]]; then
        COMPOSE+=(-f "${root}/deploy/docker-compose.yml")
    fi
    if [[ -n "${COMPOSE_ENV_FILE:-}" ]]; then
        COMPOSE+=(--env-file "$COMPOSE_ENV_FILE")
    elif [[ -f "${root}/.env" ]]; then
        COMPOSE+=(--env-file "${root}/.env")
    fi
}
