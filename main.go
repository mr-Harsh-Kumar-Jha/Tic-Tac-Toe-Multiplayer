package main

import (
	"context"
	"database/sql"

	"github.com/heroiclabs/nakama-common/runtime"

	"nakama-tictactoe/challenge"
	"nakama-tictactoe/game"
	"nakama-tictactoe/leaderboard"
	"nakama-tictactoe/matchmaker"
)

// InitModule is the single entry point called by Nakama when the plugin loads.
// It wires together all sub-systems — no business logic lives here.
func InitModule(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	initializer runtime.Initializer,
) error {

	if err := leaderboard.Init(ctx, nk, logger); err != nil {
		logger.Error("Failed to init leaderboard: %v", err)
		return err
	}

	if err := initializer.RegisterMatch("tictactoe", game.NewMatch); err != nil {
		logger.Error("Failed to register match handler: %v", err)
		return err
	}

	if err := initializer.RegisterMatchmakerMatched(matchmaker.MakeMatch); err != nil {
		logger.Error("Failed to register matchmaker: %v", err)
		return err
	}

	if err := initializer.RegisterRpc("get_leaderboard", leaderboard.GetLeaderboard); err != nil {
		logger.Error("Failed to register get_leaderboard RPC: %v", err)
		return err
	}
	
	// Register Challenge RPCs
	if err := initializer.RegisterRpc("get_online_players", challenge.GetOnlinePlayers); err != nil {
		logger.Error("Failed to register get_online_players RPC: %v", err)
		return err
	}
	if err := initializer.RegisterRpc("send_challenge", challenge.SendChallenge); err != nil {
		logger.Error("Failed to register send_challenge RPC: %v", err)
		return err
	}
	if err := initializer.RegisterRpc("get_pending_challenges", challenge.GetPendingChallenges); err != nil {
		logger.Error("Failed to register get_pending_challenges RPC: %v", err)
		return err
	}
	if err := initializer.RegisterRpc("respond_to_challenge", challenge.RespondToChallenge); err != nil {
		logger.Error("Failed to register respond_to_challenge RPC: %v", err)
		return err
	}
	if err := initializer.RegisterRpc("get_profile", challenge.GetProfile); err != nil {
		logger.Error("Failed to register get_profile RPC: %v", err)
		return err
	}

	logger.Info("=== TicTacToe module loaded — all systems go ===")
	return nil
}
