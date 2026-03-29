package leaderboard

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/heroiclabs/nakama-common/runtime"
)

const (
	leaderboardID        = "tictactoe_wins"
	matchesLeaderboardID = "tictactoe_matches_played"
)

// Entry is the JSON shape returned by the GetLeaderboard RPC.
type Entry struct {
	Rank     int64  `json:"rank"`
	Username string `json:"username"`
	Wins     int64  `json:"wins"`
	UserID   string `json:"user_id"`
}

// Init creates the leaderboard if it doesn't already exist.
// Called once from InitModule on server startup.
func Init(ctx context.Context, nk runtime.NakamaModule, logger runtime.Logger) error {
	err := nk.LeaderboardCreate(ctx, leaderboardID, false, "desc", "incr", "", nil, false)
	if err != nil {
		logger.Info("Wins leaderboard already exists: %v", err)
	}

	err = nk.LeaderboardCreate(ctx, matchesLeaderboardID, false, "desc", "incr", "", nil, false)
	if err != nil {
		logger.Info("Matches leaderboard already exists: %v", err)
	}
	return nil
}

// GetLeaderboard is the RPC handler registered as "get_leaderboard".
// Returns the top 10 players as a JSON array of Entry.
func GetLeaderboard(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	payload string,
) (string, error) {
	records, _, _, _, err := nk.LeaderboardRecordsList(ctx, leaderboardID, nil, 10, "", 0)
	if err != nil {
		logger.Error("Failed to list leaderboard: %v", err)
		return "", err
	}

	// Fetch all owner IDs
	var userIDs []string
	for _, r := range records {
		userIDs = append(userIDs, r.GetOwnerId())
	}

	// Fetch live usernames from DB dynamically so missing cache strings don't render them blank
	usernameMap := make(map[string]string)
	if len(userIDs) > 0 {
		users, err := nk.UsersGetId(ctx, userIDs, nil)
		if err == nil {
			for _, u := range users {
				if u.DisplayName != "" {
					usernameMap[u.Id] = u.DisplayName
				} else {
					usernameMap[u.Id] = u.Username
				}
			}
		}
	}

	entries := make([]Entry, 0, len(records))
	for _, r := range records {
		uid := r.GetOwnerId()
		
		// Priority: Live DB Name -> Cached Protobuf Name -> Fallback ID
		uName := usernameMap[uid]
		if uName == "" && r.Username != nil && r.Username.Value != "" {
			uName = r.Username.Value
		}
		if uName == "" {
			uName = "Player_" + uid[:4]
		}
		
		entries = append(entries, Entry{
			Rank:     r.GetRank(),
			Username: uName,
			Wins:     r.GetScore(),
			UserID:   uid,
		})
	}

	out, err := json.Marshal(entries)
	if err != nil {
		return "", err
	}
	return string(out), nil
}

// RecordResult writes leaderboard scores for both players after a game ends.
// Called from game logic (game/logic.go).
func RecordResult(
	ctx context.Context,
	nk runtime.NakamaModule,
	winnerID, loserID, result string,
	logger runtime.Logger,
) {
	if result == "draw" {
		writeScore(ctx, nk, winnerID, 0, logger, true)
		writeScore(ctx, nk, loserID, 0, logger, true)
		return
	}
	writeScore(ctx, nk, winnerID, 1, logger, false)
	writeScore(ctx, nk, loserID, 0, logger, true) // Pass true to count it as a "Loss" but still a played match
}

func writeScore(
	ctx context.Context,
	nk runtime.NakamaModule,
	userID string,
	score int64,
	logger runtime.Logger,
	isDrawOrLoss bool,
) {
	// Only increment Wins if score > 0
	if score > 0 {
		_, err := nk.LeaderboardRecordWrite(ctx, leaderboardID, userID, "", score, 0, nil, nil)
		if err != nil {
			logger.Error("Failed to write score for %s: %v", userID, err)
		}
	}

	// ALWAYS increment the Matches Played leaderboard for both players (Score of 1 = 1 Match Played)
	_, err2 := nk.LeaderboardRecordWrite(ctx, matchesLeaderboardID, userID, "", 1, 0, nil, nil)
	if err2 != nil {
		logger.Error("Failed to write matches_played for %s: %v", userID, err2)
	}
}
