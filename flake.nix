{
  description = "Laundry App development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        pgDataDir = ".nix-postgres";
        obsDir = ".nix-observability";
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nodejs_22
            postgresql_16
            opentelemetry-collector-contrib
            prometheus
            grafana-loki
            grafana
            process-compose
          ];

          shellHook = ''
            export PGDATA="$PWD/${pgDataDir}"
            export PGHOST="$PWD/${pgDataDir}"
            export PGPORT="5432"
            export DATABASE_HOST="localhost"
            export DATABASE_PORT="5432"
            export DATABASE_USER="$USER"
            export DATABASE_PASSWORD="postgres_dev_password"
            export DATABASE_NAME="laundry_app_dev"

            export LAUNDRY_REPO_ROOT="$PWD"
            export OBS_DIR="$PWD/${obsDir}"
            export BACKEND_LOG_FILE="$OBS_DIR/logs/backend.log"
            export OTEL_ENABLED="true"
            export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
            export LOG_FORMAT="json"
            export GRAFANA_HOMEPATH="${pkgs.grafana}/share/grafana"

            mkdir -p "$PGDATA" \
                     "$OBS_DIR/prometheus" \
                     "$OBS_DIR/loki/chunks" "$OBS_DIR/loki/rules" \
                     "$OBS_DIR/grafana/logs" "$OBS_DIR/grafana/plugins" \
                     "$OBS_DIR/grafana/provisioning/datasources" \
                     "$OBS_DIR/grafana/provisioning/dashboards" \
                     "$OBS_DIR/logs"
            touch "$BACKEND_LOG_FILE"

            # Stage Grafana provisioning (Grafana needs an absolute provisioning path)
            cp -f observability/nix/grafana-provisioning/datasources/datasources.yml \
                  "$OBS_DIR/grafana/provisioning/datasources/datasources.yml"
            cp -f observability/nix/grafana-provisioning/dashboards/dashboard.yml \
                  "$OBS_DIR/grafana/provisioning/dashboards/dashboard.yml"

            echo ""
            echo "Laundry App dev environment ready!"
            echo "  PostgreSQL: localhost:$PGPORT (database: $DATABASE_NAME)"
            echo "  Grafana:    http://localhost:3001 (admin/admin)"
            echo "  Prometheus: http://localhost:9090"
            echo "  Loki:       http://localhost:3100"
            echo "  OTLP HTTP:  http://localhost:4318"
            echo ""
            echo "  process-compose up              - start all services"
            echo "  process-compose up --detached   - start in background"
            echo "  process-compose attach          - open TUI (if detached)"
            echo "  process-compose process list    - service status"
            echo "  process-compose down            - stop all services"
            echo ""
          '';
        };
      });
}
