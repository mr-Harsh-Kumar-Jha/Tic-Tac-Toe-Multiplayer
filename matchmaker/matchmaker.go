package matchmaker

import (
	"context"
	"database/sql"

	"github.com/heroiclabs/nakama-common/runtime"
)

// MakeMatch is called by Nakama when it finds compatible players in the queue.
// It creates an authoritative match and returns its ID so clients can join.
func MakeMatch(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	entries []runtime.MatchmakerEntry,
) (string, error) {
	for _, e := range entries {
		logger.Info("Pairing player: %s", e.GetPresence().GetUsername())
	}

	matchID, err := nk.MatchCreate(ctx, "tictactoe", map[string]interface{}{})
	if err != nil {
		logger.Error("Failed to create match: %v", err)
		return "", err
	}

	logger.Info("Authoritative match created: %s", matchID)
	return matchID, nil
}
