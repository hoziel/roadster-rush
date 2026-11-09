// Everything third-party that ships in the game. Keep in sync with /CREDITS.md
// (that file also lists source files not yet used in the game).
export interface Credit { what: string; who: string; license: string }

export const CREDITS: Credit[] = [
  { what: 'Fredoka font', who: 'The Fredoka Project Authors', license: 'SIL Open Font License 1.1' },
  { what: '3D engine: three.js', who: 'three.js authors', license: 'MIT' },
  { what: 'Music: Pure Raceway (and its climax mix)', who: 'MintoDog', license: 'CC0' },
  { what: 'Music: Title Screen', who: 'Juhani Junkala (SubspaceAudio)', license: 'CC0' },
  { what: 'Bicycle horn sound', who: 'AntumDeluge', license: 'CC0' },
];
