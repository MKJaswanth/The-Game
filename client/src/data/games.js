export const GAMES_CATALOG = [
  {
    id: 'snake',
    title: 'Snake',
    description: 'Classic arcade survival. Eat food, grow longer, avoid collisions, and aim for the top high score.',
    playerCount: '1 Player (Solo)',
    category: 'SOLO ARCADE',
    badgeVariant: 'primary',
    isAvailable: true,
    supportsSolo: true,
    minPlayers: 1,
    maxPlayers: 1
  },
  {
    id: 'trivia',
    title: 'Trivia Battle',
    description: 'Fast-paced multiplayer quiz showdown. Answer correctly and rapidly to rack up speed bonuses.',
    playerCount: 'Solo or 2–8 Players',
    category: 'MULTIPLAYER QUIZ',
    badgeVariant: 'accent',
    isAvailable: true,
    supportsSolo: true,
    minPlayers: 1,
    maxPlayers: 8
  },
  {
    id: 'wordscramble',
    title: 'Word Scramble',
    description: 'Race against friends or play solo to unscramble letters into words before the timer runs out.',
    playerCount: 'Solo or 2–6 Players',
    category: 'SPEED PUZZLE',
    badgeVariant: 'success',
    isAvailable: true,
    supportsSolo: true,
    minPlayers: 2,
    maxPlayers: 6
  },
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    description: 'Head-to-head tactical duel. Outsmart your teammate or practice vs CyberBot with instant rematch.',
    playerCount: 'Solo or 2 Players',
    category: '1V1 BATTLE',
    badgeVariant: 'warning',
    isAvailable: true,
    supportsSolo: true,
    minPlayers: 1,
    maxPlayers: 2
  },
  {
    id: 'uno',
    title: 'UNO',
    description: 'The beloved card game of colors, skips, reverses, and wild draws — call UNO to win.',
    playerCount: '2–6 Players',
    category: 'CARD GAME',
    badgeVariant: 'success',
    isAvailable: true,
    supportsSolo: false,
    minPlayers: 2,
    maxPlayers: 6
  },
  {
    id: 'flappy',
    title: 'Flappy Race',
    description: 'Server-synced neon survival race. Flap through the pipe course — last bird flying takes the win.',
    playerCount: 'Solo or 1–4 Players',
    category: 'ARCADE RACE',
    badgeVariant: 'primary',
    isAvailable: true,
    supportsSolo: true,
    minPlayers: 1,
    maxPlayers: 4
  },
  {
    id: 'chess',
    title: 'Chess',
    description: 'Full-rules 1v1 chess — legal moves highlighted, check and mate called by the server, draw offers and rematch.',
    playerCount: '2 Players',
    category: 'STRATEGY',
    badgeVariant: 'warning',
    isAvailable: true,
    supportsSolo: false,
    minPlayers: 2,
    maxPlayers: 2
  },
  {
    id: 'emoji',
    title: 'Emoji Guessing',
    description: 'One player turns a secret phrase into emoji, everyone else races to decode it. Five rounds, rotating clue-giver.',
    playerCount: '2–8 Players',
    category: 'PARTY GAME',
    badgeVariant: 'accent',
    isAvailable: true,
    supportsSolo: false,
    minPlayers: 2,
    maxPlayers: 8
  }
];
