package game

// OpCodes match the constants in match_handler (server-authoritative).
// The client uses these same integer values to interpret incoming messages.
const (
	OpCodeMove      int64 = 1 // Client → Server: player move
	OpCodeGameState int64 = 2 // Server → Clients: full board broadcast
	OpCodeGameOver  int64 = 3 // Server → Clients: game end signal
)
