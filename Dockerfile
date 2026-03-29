# Stage 1 — Build Go plugin using Heroic Labs' official builder
# This guarantees the EXACT same Go toolchain as the Nakama runtime
FROM heroiclabs/nakama-pluginbuilder:3.38.0 AS builder

WORKDIR /backend

COPY go.mod go.sum ./
COPY *.go ./
COPY game/ game/
COPY leaderboard/ leaderboard/
COPY matchmaker/ matchmaker/
COPY challenge/ challenge/

RUN go mod tidy && \
    go build \
    --buildmode=plugin \
    -trimpath \
    -o /backend/modules/tictactoe.so \
    .

# Stage 2 — Production image containing Nakama and the compiled plugin natively!
FROM heroiclabs/nakama:3.38.0

# Securely move the plugin right into the engine
COPY --from=builder /backend/modules/tictactoe.so /nakama/data/modules/tictactoe.so

# Ensure the exposed ports match Koyeb's expectations natively
EXPOSE 8000 7351

# Hardcode the exact deployment startup sequence so Koyeb doesn't have to guess
ENTRYPOINT ["/bin/sh", "-c", "/nakama/nakama migrate up --database.address $DB_URL && exec /nakama/nakama --name nakama-tictactoe --database.address $DB_URL --logger.level INFO --session.encryption_key s3cr3tsession --session.refresh_encryption_key s3cr3trefresh --console.signing_key s3cr3tsigning --socket.server_key defaultkey --runtime.path /nakama/data/modules --socket.port 8000"]