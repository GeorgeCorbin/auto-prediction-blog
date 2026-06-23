import { mlbModule } from './mlb';
import { worldCupModule } from './world-cup';
import type { SportModule } from './types';

const modules: Record<string, SportModule> = {
  mlb: mlbModule,
  'world-cup': worldCupModule,
};

export function getSportModule(key: string): SportModule {
  const mod = modules[key];
  if (!mod) {
    throw new Error(`No sport module registered for key: "${key}"`);
  }
  return mod;
}

export function getRegisteredSportModules(): SportModule[] {
  return Object.values(modules);
}
