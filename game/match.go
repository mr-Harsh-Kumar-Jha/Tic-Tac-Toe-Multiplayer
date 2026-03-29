package game

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/heroiclabs/nakama-common/runtime"
)

const TurnDuration = 30 * time.Second

// MatchState is the authoritative server-side game state.
// It is serialised and broadcast to all clients on every change.
// The client never mutates this — it only renders what the server sends.
type MatchState struct {
	Board       [9]string         `json:"board"`
	PlayerX     string            `json:"player_x"`
	PlayerO     string            `json:"player_o"`
	Usernames   map[string]string `json:"usernames"`
	CurrentTurn string            `json:"current_turn"`
	GameOver    bool              `json:"game_over"`
	Winner      string            `json:"winner"`
	TimerExpiry int64             `json:"timer_expiry"` // Unix ms
}

// MoveMessage is the payload sent by the client for OpCodeMove.
type MoveMessage struct {
	Position int `json:"position"`
}

// Match implements runtime.Match — Nakama calls these hooks on each game lifecycle event.
type Match struct{}

// NewMatch is the factory registered with Nakama's initializer.
func NewMatch(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule) (runtime.Match, error) {
	return &Match{}, nil
}

// MatchInit sets up initial state, tick rate, and the match label.
func (m *Match) MatchInit(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	params map[string]interface{},
) (interface{}, int, string) {
	state := &MatchState{
		Board:     [9]string{},
		Usernames: make(map[string]string),
	}
	tickRate := 10
	label := `{"mode":"tictactoe"}`
	logger.Info("Match initialised")
	return state, tickRate, label
}

// MatchJoinAttempt rejects any join once both seats are filled.
func (m *Match) MatchJoinAttempt(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	dispatcher runtime.MatchDispatcher,
	tick int64,
	state interface{},
	presence runtime.Presence,
	metadata map[string]string,
) (interface{}, bool, string) {
	s := state.(*MatchState)
	if s.PlayerX != "" && s.PlayerO != "" {
		return s, false, "match is full"
	}
	return s, true, ""
}

// MatchJoin assigns roles (X / O) and starts the clock when both players are present.
func (m *Match) MatchJoin(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	dispatcher runtime.MatchDispatcher,
	tick int64,
	state interface{},
	presences []runtime.Presence,
) interface{} {
	s := state.(*MatchState)
	for _, p := range presences {
		uid := p.GetUserId()
		username := p.GetUsername()
		s.Usernames[uid] = username
		if s.PlayerX == "" {
			s.PlayerX = uid
			logger.Info("Player X joined: %s", username)
		} else if s.PlayerO == "" {
			s.PlayerO = uid
			logger.Info("Player O joined: %s", username)
		}
	}
	if s.PlayerX != "" && s.PlayerO != "" {
		s.CurrentTurn = s.PlayerX
		s.TimerExpiry = time.Now().Add(TurnDuration).UnixMilli()
		broadcastState(dispatcher, s)
		logger.Info("Game started — X: %s vs O: %s", s.Usernames[s.PlayerX], s.Usernames[s.PlayerO])
	}
	return s
}

// MatchLeave handles disconnections mid-game by awarding victory to the remaining player.
func (m *Match) MatchLeave(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	dispatcher runtime.MatchDispatcher,
	tick int64,
	state interface{},
	presences []runtime.Presence,
) interface{} {
	s := state.(*MatchState)
	for _, p := range presences {
		uid := p.GetUserId()
		logger.Info("Player disconnected: %s", s.Usernames[uid])
		if !s.GameOver && s.PlayerX != "" && s.PlayerO != "" {
			winnerID := s.PlayerO
			if uid == s.PlayerO {
				winnerID = s.PlayerX
			}
			endGame(ctx, s, winnerID, nk, logger)
			broadcastState(dispatcher, s)
		}
	}
	return s
}

// MatchLoop runs every server tick.
// It checks the turn timer and processes move messages from clients.
func (m *Match) MatchLoop(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	dispatcher runtime.MatchDispatcher,
	tick int64,
	state interface{},
	messages []runtime.MatchData,
) interface{} {
	s := state.(*MatchState)

	if s.GameOver {
		return nil // Signal Nakama to terminate the match
	}

	if s.PlayerX == "" || s.PlayerO == "" {
		return s // Still waiting for both players
	}

	// Server-authoritative timer: forfeit if the active player runs out of time.
	if time.Now().UnixMilli() > s.TimerExpiry {
		logger.Info("Timer expired for: %s", s.Usernames[s.CurrentTurn])
		winnerID := s.PlayerO
		if s.CurrentTurn == s.PlayerO {
			winnerID = s.PlayerX
		}
		endGame(ctx, s, winnerID, nk, logger)
		broadcastState(dispatcher, s)
		return s
	}

	for _, msg := range messages {
		if msg.GetOpCode() != OpCodeMove {
			continue
		}

		senderID := msg.GetUserId()

		if senderID != s.CurrentTurn {
			logger.Warn("Out-of-turn move rejected from: %s", s.Usernames[senderID])
			continue
		}

		var move MoveMessage
		if err := json.Unmarshal(msg.GetData(), &move); err != nil {
			logger.Warn("Malformed move from %s: %v", senderID, err)
			continue
		}

		if move.Position < 0 || move.Position > 8 {
			logger.Warn("Invalid position %d from %s", move.Position, senderID)
			continue
		}

		if s.Board[move.Position] != "" {
			logger.Warn("Cell %d already occupied", move.Position)
			continue
		}

		mark := "X"
		if senderID == s.PlayerO {
			mark = "O"
		}
		s.Board[move.Position] = mark
		logger.Info("%s placed %s at cell %d", s.Usernames[senderID], mark, move.Position)

		if winner := checkWinner(s.Board); winner != "" {
			winnerID := s.PlayerX
			if winner == "O" {
				winnerID = s.PlayerO
			}
			endGame(ctx, s, winnerID, nk, logger)
		} else if isBoardFull(s.Board) {
			s.GameOver = true
			s.Winner = "draw"
			recordResult(ctx, nk, s.PlayerX, s.PlayerO, "draw", logger)
		} else {
			// Swap turn and reset the clock
			if s.CurrentTurn == s.PlayerX {
				s.CurrentTurn = s.PlayerO
			} else {
				s.CurrentTurn = s.PlayerX
			}
			s.TimerExpiry = time.Now().Add(TurnDuration).UnixMilli()
		}

		broadcastState(dispatcher, s)
	}

	return s
}

// MatchTerminate is called when Nakama shuts down the match gracefully.
func (m *Match) MatchTerminate(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	dispatcher runtime.MatchDispatcher,
	tick int64,
	state interface{},
	graceSeconds int,
) interface{} {
	logger.Info("Match terminating gracefully")
	return state
}

// MatchSignal handles server-side signals (unused, required by the interface).
func (m *Match) MatchSignal(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	dispatcher runtime.MatchDispatcher,
	tick int64,
	state interface{},
	data string,
) (interface{}, string) {
	return state, ""
}
