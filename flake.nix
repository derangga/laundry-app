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
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nodejs_22
            postgresql_16
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

            if [ ! -d "$PGDATA" ]; then
              echo "Initializing PostgreSQL data directory..."
              initdb --auth=trust --no-locale --encoding=UTF8 -D "$PGDATA"
              # Use unix socket in project dir to avoid conflicts
              echo "unix_socket_directories = '$PGDATA'" >> "$PGDATA/postgresql.conf"
              echo "port = $PGPORT" >> "$PGDATA/postgresql.conf"
            fi

            if ! pg_ctl status -D "$PGDATA" > /dev/null 2>&1; then
              echo "Starting PostgreSQL..."
              pg_ctl start -D "$PGDATA" -l "$PGDATA/postgresql.log" -o "-k $PGDATA"
              # Wait for postgres to be ready
              for i in $(seq 1 10); do
                if pg_isready -h "$PGDATA" -p "$PGPORT" > /dev/null 2>&1; then
                  break
                fi
                sleep 0.3
              done

              # Create dev database and user if they don't exist
              if ! psql -h "$PGDATA" -p "$PGPORT" -lqt | cut -d \| -f 1 | grep -qw "$DATABASE_NAME"; then
                echo "Creating development database..."
                createdb -h "$PGDATA" -p "$PGPORT" "$DATABASE_NAME"
              fi
            fi

            echo ""
            echo "Laundry App dev environment ready!"
            echo "  PostgreSQL: localhost:$PGPORT (database: $DATABASE_NAME)"
            echo ""
            echo "  bun install     - install dependencies"
            echo "  bun run dev     - start backend + frontend"
            echo ""
            echo "  pg_ctl stop -D \$PGDATA   - stop PostgreSQL manually"
            echo ""
          '';
        };
      });
}
