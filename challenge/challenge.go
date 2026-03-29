package challenge

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/heroiclabs/nakama-common/runtime"
)

// ─── Global State ─────────────────────────────────────────────────────────────

var (
	lobbyMap sync.Map // Map of string (userID) to int64 (Unix timestamp of last ping)
)

// ─── Types ────────────────────────────────────────────────────────────────────

// OnlinePlayer represents a user who is currently connected via WebSocket.
type OnlinePlayer struct {
	UserID      string `json:"user_id"`
	Username    string `json:"username"`
	AvatarColor string `json:"avatar_color"` // hex color derived from userID
}

// ChallengeRecord is stored in Nakama Storage under the target player's userID.
type ChallengeRecord struct {
	ChallengeID   string `json:"challenge_id"`
	FromUserID    string `json:"from_user_id"`
	FromUsername  string `json:"from_username"`
	AvatarColor   string `json:"avatar_color"`
	CreatedAtUnix int64  `json:"created_at_unix"`
	Status        string `json:"status"` // "pending" | "accepted" | "declined"
}

// ─── RPC: get_online_players ──────────────────────────────────────────────────

// GetOnlinePlayers returns a list of users with active socket sessions.
// Implements an aggressive 15-second heartbeat since clients poll every 5s.
func GetOnlinePlayers(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	payload string,
) (string, error) {
	callerID, ok := ctx.Value(runtime.RUNTIME_CTX_USER_ID).(string)
	if !ok {
		callerID = ""
	}

	now := time.Now().Unix()
	if callerID != "" {
		lobbyMap.Store(callerID, now)
	}

	var activeIDs []string
	lobbyMap.Range(func(key, value interface{}) bool {
		uid := key.(string)
		lastSeen := value.(int64)
		if now-lastSeen > 15 {
			lobbyMap.Delete(key) // Auto-prune offline players
		} else if uid != callerID {
			activeIDs = append(activeIDs, uid)
		}
		return true
	})

	players := make([]OnlinePlayer, 0)
	if len(activeIDs) > 0 {
		users, err := nk.UsersGetId(ctx, activeIDs, nil)
		if err == nil {
			for _, u := range users {
				players = append(players, OnlinePlayer{
					UserID:      u.Id,
					Username:    u.Username,
					AvatarColor: userColor(u.Id),
				})
			}
		}
	}

	out, err := json.Marshal(players)
	if err != nil {
		return "", err
	}
	return string(out), nil
}

// ─── RPC: send_challenge ──────────────────────────────────────────────────────

type sendChallengePayload struct {
	TargetUserID string `json:"target_user_id"`
}

// SendChallenge stores a challenge notification for the target player.
// The target polls for this via get_pending_challenges.
func SendChallenge(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	payload string,
) (string, error) {
	callerID, _ := ctx.Value(runtime.RUNTIME_CTX_USER_ID).(string)
	callerUsername, _ := ctx.Value(runtime.RUNTIME_CTX_USERNAME).(string)

	var req sendChallengePayload
	if err := json.Unmarshal([]byte(payload), &req); err != nil || req.TargetUserID == "" {
		return "", runtime.NewError("invalid payload: need target_user_id", 3)
	}

	if req.TargetUserID == callerID {
		return "", runtime.NewError("cannot challenge yourself", 3)
	}

	challenge := ChallengeRecord{
		ChallengeID:   fmt.Sprintf("%s-%d", callerID[:8], time.Now().UnixMilli()),
		FromUserID:    callerID,
		FromUsername:  callerUsername,
		AvatarColor:   userColor(callerID),
		CreatedAtUnix: time.Now().Unix(),
		Status:        "pending",
	}

	data, err := json.Marshal(challenge)
	if err != nil {
		return "", err
	}

	writes := []*runtime.StorageWrite{
		{
			Collection:      "challenges",
			Key:             challenge.ChallengeID,
			UserID:          req.TargetUserID,
			Value:           string(data),
			PermissionRead:  1,
			PermissionWrite: 0,
		},
	}

	if _, err := nk.StorageWrite(ctx, writes); err != nil {
		logger.Error("Failed to write challenge: %v", err)
		return "", err
	}

	logger.Info("Challenge sent from %s to %s", callerUsername, req.TargetUserID)
	out, _ := json.Marshal(map[string]string{"status": "sent", "challenge_id": challenge.ChallengeID})
	return string(out), nil
}

// ─── RPC: get_pending_challenges ─────────────────────────────────────────────

// GetPendingChallenges returns all pending incoming challenges for the caller.
func GetPendingChallenges(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	payload string,
) (string, error) {
	callerID, _ := ctx.Value(runtime.RUNTIME_CTX_USER_ID).(string)

	objects, _, err := nk.StorageList(ctx, "", callerID, "challenges", 20, "")
	if err != nil {
		logger.Error("Failed to list challenges: %v", err)
		out, _ := json.Marshal([]ChallengeRecord{})
		return string(out), nil
	}

	challenges := make([]ChallengeRecord, 0)
	for _, obj := range objects {
		var c ChallengeRecord
		if err := json.Unmarshal([]byte(obj.Value), &c); err != nil {
			continue
		}
		// Only return pending challenges from the last 5 minutes
		if c.Status == "pending" && time.Now().Unix()-c.CreatedAtUnix < 300 {
			challenges = append(challenges, c)
		}
	}

	out, err := json.Marshal(challenges)
	if err != nil {
		return "", err
	}
	return string(out), nil
}

// ─── RPC: respond_to_challenge ────────────────────────────────────────────────

type respondChallengePayload struct {
	ChallengeID  string `json:"challenge_id"`
	FromUserID   string `json:"from_user_id"`
	Accept       bool   `json:"accept"`
}

// RespondToChallenge marks a challenge as accepted or declined.
// If accepted, creates an authoritative match and returns the match ID.
func RespondToChallenge(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	payload string,
) (string, error) {
	callerID, _ := ctx.Value(runtime.RUNTIME_CTX_USER_ID).(string)

	var req respondChallengePayload
	if err := json.Unmarshal([]byte(payload), &req); err != nil {
		return "", runtime.NewError("invalid payload", 3)
	}

	// Update the challenge status
	reads := []*runtime.StorageRead{
		{Collection: "challenges", Key: req.ChallengeID, UserID: callerID},
	}
	records, err := nk.StorageRead(ctx, reads)
	if err != nil || len(records) == 0 {
		return "", runtime.NewError("challenge not found", 5)
	}

	var challenge ChallengeRecord
	if err := json.Unmarshal([]byte(records[0].Value), &challenge); err != nil {
		return "", err
	}

	if !req.Accept {
		challenge.Status = "declined"
		data, _ := json.Marshal(challenge)
		nk.StorageWrite(ctx, []*runtime.StorageWrite{{
			Collection: "challenges", Key: req.ChallengeID,
			UserID: callerID, Value: string(data),
			PermissionRead: 1, PermissionWrite: 0,
		}})
		out, _ := json.Marshal(map[string]string{"status": "declined"})
		return string(out), nil
	}

	// Accept: create an authoritative match for these two players
	matchID, err := nk.MatchCreate(ctx, "tictactoe", map[string]interface{}{
		"challenged_by": req.FromUserID,
		"challenged":    callerID,
	})
	if err != nil {
		logger.Error("Failed to create challenge match: %v", err)
		return "", err
	}

	challenge.Status = "accepted"
	data, _ := json.Marshal(challenge)
	nk.StorageWrite(ctx, []*runtime.StorageWrite{{
		Collection: "challenges", Key: req.ChallengeID,
		UserID: callerID, Value: string(data),
		PermissionRead: 1, PermissionWrite: 0,
	}})

	// Send a real-time Notification back to the Challenger (Player A) so they can automatically jump into the GameScreen
	err = nk.NotificationSend(ctx, req.FromUserID, "Challenge Accepted", map[string]interface{}{
		"match_id": matchID,
		"accepted": true,
	}, 101, callerID, false)
	
	if err != nil {
		logger.Error("Failed to send acceptance notification: %v", err)
	}

	logger.Info("Challenge accepted — match created: %s", matchID)
	out, _ := json.Marshal(map[string]string{"status": "accepted", "match_id": matchID})
	return string(out), nil
}

// ─── RPC: get_profile ─────────────────────────────────────────────────────────

// PlayerProfile is returned by get_profile and sent to the frontend ProfileScreen.
type PlayerProfile struct {
	UserID      string `json:"user_id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarColor string `json:"avatar_color"`
	Wins        int64  `json:"wins"`
	GamesPlayed int64  `json:"games_played"`
	WinRate     int    `json:"win_rate"` // 0–100 percent
}

type getProfilePayload struct {
	UserID string `json:"user_id"` // empty = self
}

// GetProfile returns profile and stats for a given user (or self if no userID given).
func GetProfile(
	ctx context.Context,
	logger runtime.Logger,
	db *sql.DB,
	nk runtime.NakamaModule,
	payload string,
) (string, error) {
	callerID, _ := ctx.Value(runtime.RUNTIME_CTX_USER_ID).(string)

	var req getProfilePayload
	json.Unmarshal([]byte(payload), &req)

	targetID := req.UserID
	if targetID == "" {
		targetID = callerID
	}

	users, err := nk.UsersGetId(ctx, []string{targetID}, nil)
	if err != nil || len(users) == 0 {
		return "", runtime.NewError("user not found", 5)
	}
	u := users[0]

	// Fetch leaderboard record for win count explicitly from the ownerRecords (second return value)
	_, ownerRecords, _, _, err := nk.LeaderboardRecordsList(ctx, "tictactoe_wins", []string{targetID}, 1, "", 0)
	var wins, gamesPlayed int64
	var winRate int
	if err == nil && len(ownerRecords) > 0 {
		wins = ownerRecords[0].GetScore()
	}

	// Fetch matches played heavily from the secondary Analytics leaderboard
	_, matchesOwnerRecords, _, _, err2 := nk.LeaderboardRecordsList(ctx, "tictactoe_matches_played", []string{targetID}, 1, "", 0)
	if err2 == nil && len(matchesOwnerRecords) > 0 {
		gamesPlayed = matchesOwnerRecords[0].GetScore()
	}

	if gamesPlayed > 0 {
		winRate = int(wins * 100 / gamesPlayed)
	}

	displayName := u.DisplayName
	if displayName == "" {
		displayName = u.Username
	}

	profile := PlayerProfile{
		UserID:      u.Id,
		Username:    u.Username,
		DisplayName: displayName,
		AvatarColor: userColor(u.Id),
		Wins:        wins,
		GamesPlayed: gamesPlayed,
		WinRate:     winRate,
	}

	out, err := json.Marshal(profile)
	if err != nil {
		return "", err
	}
	return string(out), nil
}

// ─── Helper ───────────────────────────────────────────────────────────────────

// userColor derives a deterministic hex avatar color from a userID.
var palette = []string{
	"#6c63ff", "#ff6b9d", "#ffa502", "#2ed573", "#1e90ff",
	"#ff4757", "#eccc68", "#a29bfe", "#fd79a8", "#55efc4",
}

func userColor(userID string) string {
	if len(userID) == 0 {
		return palette[0]
	}
	var sum int
	for _, c := range userID {
		sum += int(c)
	}
	return palette[sum%len(palette)]
}
