/**
 * store/types.ts — Forward declaration of RootStore type.
 *
 * Solves the circular import issue: slices need RootStore type,
 * but store/index.ts needs to import slices.
 *
 * Solution: declare RootStore here, import it in both slices and index.
 */
import type { AuthSlice } from "./slices/auth.slice";
import type { MatchSlice } from "./slices/match.slice";
import type { GameSlice } from "./slices/game.slice";
import type { ProfileSlice } from "./slices/profile.slice";
import type { SocialSlice } from "./slices/social.slice";

export type RootStore = AuthSlice & MatchSlice & GameSlice & ProfileSlice & SocialSlice;
