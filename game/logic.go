package game

import (
	"context"
	"encoding/json"

	"github.com/heroiclabs/nakama-common/runtime"
)

// checkWinner returns "X", "O", or "" (no winner yet).
func checkWinner(board [9]string) string {
	lines := [8][3]int{
		{0, 1, 2}, {3, 4, 5}, {6, 7, 8}, // rows
		{0, 3, 6}, {1, 4, 7}, {2, 5, 8}, // columns
		{0, 4, 8}, {2, 4, 6},             // diagonals
	}
	for _, line := range lines {
		a, b, c := line[0], line[1], line[2]
		if board[a] != "" && board[a] == board[b] && board[b] == board[c] {
			return board[a]
		}
	}
	return ""
}

// isBoardFull returns true when no empty cells remain.
func isBoardFull(board [9]string) bool {
	for _, cell := range board {
		if cell == "" {
			return false
		}
	}
	return true
}

// endGame marks the match as finished and records leaderboard scores.
func endGame(
	ctx context.Context,
	s *MatchState,
	winnerID string,
	nk runtime.NakamaModule,
	logger runtime.Logger,
) {
	s.GameOver = true
	s.Winner = winnerID

	loserID := s.PlayerX
	if winnerID == s.PlayerX {
		loserID = s.PlayerO
	}

	logger.Info("Game over — winner: %s", s.Usernames[winnerID])
	recordResult(ctx, nk, winnerID, loserID, "win", logger)
}

// recordResult increments the leaderboard for wins, noops for draws.
func recordResult(
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
	writeScore(ctx, nk, loserID, 0, logger, true)
}

// writeScore submits an incremental score for one player.
// The leaderboard uses "incr" operator so scores accumulate across games.
func writeScore(
	ctx context.Context,
	nk runtime.NakamaModule,
	userID string,
	score int64,
	logger runtime.Logger,
	isLossOrDraw bool,
) {
	// Only increment wins if won
	if score > 0 {
		_, err := nk.LeaderboardRecordWrite(ctx, leaderboardID, userID, "", score, 0, nil, nil)
		if err != nil {
			logger.Error("Failed to write score for %s: %v", userID, err)
		}
	}

	// Always increment matches played for both players unconditionally
	_, err2 := nk.LeaderboardRecordWrite(ctx, matchesLeaderboardID, userID, "", 1, 0, nil, nil)
	if err2 != nil {
		logger.Error("Failed to write matches_played for %s: %v", userID, err2)
	}
}

// broadcastState serialises the full MatchState and pushes it to all match participants.
func broadcastState(dispatcher runtime.MatchDispatcher, s *MatchState) {
	data, _ := json.Marshal(s)
	_ = dispatcher.BroadcastMessage(OpCodeGameState, data, nil, nil, true)
}

// leaderboardID is the shared ID for the wins leaderboard.
// Both game and leaderboard packages use this same board name.
const (
	leaderboardID        = "tictactoe_wins"
	matchesLeaderboardID = "tictactoe_matches_played"
)
