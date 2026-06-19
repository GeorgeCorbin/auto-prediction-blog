import { TheOddsApiProvider } from './the-odds-api';

// To swap providers: change this one import and instantiation
export const oddsProvider = new TheOddsApiProvider();

export type { OddsProvider, GameOdds } from './provider';
