import { charizard } from './charizard';
import { lucario } from './lucario';
import { gengar } from './gengar';
import type { CharacterDefinition } from './types';

const characters: readonly CharacterDefinition[] = [lucario, charizard, gengar];

export function getCharacters(): readonly CharacterDefinition[] {
  return characters;
}

export function getCharacterById(
  id: string
): CharacterDefinition | undefined {
  return characters.find((character) => character.id === id);
}
