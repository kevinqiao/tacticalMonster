/**
 * Legacy module path: some clients still call `service/casualTournamentService:*`
 * (e.g. cached bundles). Real implementations live in `./tournament/casualTournamentService`.
 */
export * from "./tournament/casualTournamentService";
