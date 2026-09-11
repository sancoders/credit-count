/**
 * The demo dataset.
 *
 * Kept separate from the script that loads it so the shape of the demo is
 * readable on its own: who exists, who opted in, and what they rode.
 *
 * Dates are relative to the day the seed runs. Several rides land today and in
 * the last few days on purpose - the leaderboard has Today and This week
 * windows, and a reviewer clicking those should not find them empty.
 */

export type DemoRide = {
  /** Coaster name, matched against the seeded catalogue together with `park`. */
  coaster: string
  park: string
  daysAgo: number
  note?: string
}

export type DemoAccount = {
  key: 'rider' | 'rival' | 'admin' | string
  email: string
  password: string
  displayName: string
  showOnLeaderboard: boolean
  rides: DemoRide[]
}

/** The three accounts whose credentials come from the environment. */
export const NAMED_ACCOUNTS = ['rider', 'rival', 'admin'] as const

/**
 * Filler riders, so the leaderboard looks like a leaderboard rather than a
 * two-row table. Their passwords are generated and never handed out.
 */
export const FILLER_ACCOUNTS: Omit<DemoAccount, 'password'>[] = [
  {
    key: 'nina',
    email: 'nina@creditcount.app',
    displayName: 'Nina',
    showOnLeaderboard: true,
    rides: [
      { coaster: 'Taron', park: 'Phantasialand', daysAgo: 40 },
      { coaster: 'F.L.Y.', park: 'Phantasialand', daysAgo: 40 },
      { coaster: 'Silver Star', park: 'Europa-Park', daysAgo: 39 },
      { coaster: 'Voltron Nevera', park: 'Europa-Park', daysAgo: 39 },
      { coaster: 'Wodan Timbur Coaster', park: 'Europa-Park', daysAgo: 38 },
      { coaster: 'Blue Fire Megacoaster', park: 'Europa-Park', daysAgo: 38 },
      { coaster: 'Zadra', park: 'Energylandia', daysAgo: 12 },
      { coaster: 'Hyperion', park: 'Energylandia', daysAgo: 12 },
      { coaster: 'Kondaa', park: 'Walibi Belgium', daysAgo: 4 },
      { coaster: 'Untamed', park: 'Walibi Holland', daysAgo: 3 },
    ],
  },
  {
    key: 'omar',
    email: 'omar@creditcount.app',
    displayName: 'Omar',
    showOnLeaderboard: true,
    rides: [
      { coaster: 'Steel Vengeance', park: 'Cedar Point', daysAgo: 60 },
      { coaster: 'Millennium Force', park: 'Cedar Point', daysAgo: 60 },
      { coaster: 'Maverick', park: 'Cedar Point', daysAgo: 59 },
      { coaster: 'Fury 325', park: 'Carowinds', daysAgo: 55 },
      { coaster: 'Iron Gwazi', park: 'Busch Gardens Tampa Bay', daysAgo: 50 },
      { coaster: 'VelociCoaster', park: 'Universal Islands of Adventure', daysAgo: 49 },
      { coaster: 'Twisted Colossus', park: 'Six Flags Magic Mountain', daysAgo: 20 },
      { coaster: 'Steel Curtain', park: 'Kennywood', daysAgo: 6 },
    ],
  },
  {
    key: 'pia',
    email: 'pia@creditcount.app',
    displayName: 'Pia',
    showOnLeaderboard: true,
    rides: [
      { coaster: 'Helix', park: 'Liseberg', daysAgo: 25 },
      { coaster: 'Balder', park: 'Liseberg', daysAgo: 25 },
      { coaster: 'Piraten', park: 'Djurs Sommerland', daysAgo: 24 },
      { coaster: 'Troy', park: 'Toverland', daysAgo: 9 },
      { coaster: 'Fenix', park: 'Toverland', daysAgo: 9 },
      { coaster: 'Baron 1898', park: 'Efteling', daysAgo: 1 },
    ],
  },
  {
    key: 'theo',
    email: 'theo@creditcount.app',
    displayName: 'Theo',
    showOnLeaderboard: true,
    rides: [
      { coaster: 'The Smiler', park: 'Alton Towers', daysAgo: 70 },
      { coaster: 'Wicker Man', park: 'Alton Towers', daysAgo: 70 },
      { coaster: 'Stealth', park: 'Thorpe Park', daysAgo: 15 },
      { coaster: 'Icon', park: 'Blackpool Pleasure Beach', daysAgo: 0 },
    ],
  },
]

/**
 * The account handed to the reviewer. 14 rides across 11 coasters, 6 countries
 * and 7 manufacturers, with three repeats so the difference between credits
 * and rides is visible the moment the dashboard loads.
 */
export const RIDER_RIDES: DemoRide[] = [
  { coaster: 'Megafobia', park: 'Oakwood Theme Park', daysAgo: 95 },
  { coaster: 'The Smiler', park: 'Alton Towers', daysAgo: 95, note: 'Fourteen inversions. Once was enough.' },
  { coaster: 'Wicker Man', park: 'Alton Towers', daysAgo: 94 },
  { coaster: 'Stealth', park: 'Thorpe Park', daysAgo: 80, note: 'Launch still gets me every time.' },
  { coaster: 'Shambhala', park: 'PortAventura Park', daysAgo: 62, note: 'Back row, airtime hill four.' },
  { coaster: 'Dragon Khan', park: 'PortAventura Park', daysAgo: 62 },
  { coaster: 'Shambhala', park: 'PortAventura Park', daysAgo: 61, note: 'Went back for a night ride.' },
  { coaster: 'Taron', park: 'Phantasialand', daysAgo: 34, note: 'Best layout in Europe, no argument.' },
  { coaster: 'Taron', park: 'Phantasialand', daysAgo: 34 },
  { coaster: 'Steel Vengeance', park: 'Cedar Point', daysAgo: 21, note: 'Worth the flight on its own.' },
  { coaster: 'Hakugei', park: 'Nagashima Spa Land', daysAgo: 11 },
  { coaster: 'Steel Vengeance', park: 'Cedar Point', daysAgo: 5, note: 'Second lap, front row this time.' },
  { coaster: 'Untamed', park: 'Walibi Holland', daysAgo: 2, note: 'That first drop.' },
  { coaster: 'Voltron Nevera', park: 'Europa-Park', daysAgo: 0, note: 'Opening ride of the day.' },
]

/** The attacker account used in the security demo. Deliberately opted out. */
export const RIVAL_RIDES: DemoRide[] = [
  { coaster: 'Toutatis', park: 'Parc Asterix', daysAgo: 30 },
  { coaster: 'iSpeed', park: 'Mirabilandia', daysAgo: 18 },
  { coaster: 'Karacho', park: 'Erlebnispark Tripsdrill', daysAgo: 7, note: 'Private note. Nobody else should ever read this.' },
]
