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

# Stage 2 — Final image just holds the compiled .so
FROM alpine:3.18
WORKDIR /modules
COPY --from=builder /backend/modules/tictactoe.so .