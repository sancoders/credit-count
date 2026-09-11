-- ===========================================================================
-- Credit Count v1 - catalogue seed
--
-- The SOW puts a live RCDB integration out of scope for v1 and asks for the
-- catalogue to be "seeded with enough real coasters (roughly 30 to 50, across
-- several countries, manufacturers, and types) for the stats and leaderboard
-- to be meaningful when demonstrated".
--
-- 46 operating coasters: 15 countries, 11 manufacturers, all three types.
-- Every entry is a real ride, not filler, so the country and manufacturer
-- breakdowns on the dashboard mean something.
--
-- ON CONFLICT DO NOTHING on (name, park) makes this migration re-runnable and
-- makes it safe to replay over a catalogue an admin has since edited.
-- ===========================================================================

insert into public.coasters (name, park, country, manufacturer, type) values
  -- United Kingdom
  ('The Smiler',              'Alton Towers',              'United Kingdom', 'Gerstlauer',                   'Steel'),
  ('Wicker Man',              'Alton Towers',              'United Kingdom', 'Great Coasters International', 'Wooden'),
  ('Stealth',                 'Thorpe Park',               'United Kingdom', 'Intamin',                      'Steel'),
  ('Icon',                    'Blackpool Pleasure Beach',  'United Kingdom', 'Mack Rides',                   'Steel'),
  ('The Big One',             'Blackpool Pleasure Beach',  'United Kingdom', 'Arrow Dynamics',               'Steel'),
  ('Megafobia',               'Oakwood Theme Park',        'United Kingdom', 'Custom Coasters International','Wooden'),

  -- Germany
  ('Taron',                   'Phantasialand',             'Germany',        'Intamin',                      'Steel'),
  ('F.L.Y.',                  'Phantasialand',             'Germany',        'Vekoma',                       'Steel'),
  ('Silver Star',             'Europa-Park',               'Germany',        'Bolliger & Mabillard',         'Steel'),
  ('Wodan Timbur Coaster',    'Europa-Park',               'Germany',        'Great Coasters International', 'Wooden'),
  ('Blue Fire Megacoaster',   'Europa-Park',               'Germany',        'Mack Rides',                   'Steel'),
  ('Voltron Nevera',          'Europa-Park',               'Germany',        'Mack Rides',                   'Steel'),
  ('Colossos',                'Heide Park',                'Germany',        'Intamin',                      'Wooden'),
  ('Karacho',                 'Erlebnispark Tripsdrill',   'Germany',        'Gerstlauer',                   'Steel'),

  -- Spain
  ('Shambhala',               'PortAventura Park',         'Spain',          'Bolliger & Mabillard',         'Steel'),
  ('Dragon Khan',             'PortAventura Park',         'Spain',          'Bolliger & Mabillard',         'Steel'),
  ('Red Force',               'Ferrari Land',              'Spain',          'Intamin',                      'Steel'),

  -- Netherlands
  ('Baron 1898',              'Efteling',                  'Netherlands',    'Bolliger & Mabillard',         'Steel'),
  ('Joris en de Draak',       'Efteling',                  'Netherlands',    'Great Coasters International', 'Wooden'),
  ('Untamed',                 'Walibi Holland',            'Netherlands',    'Rocky Mountain Construction',  'Hybrid'),
  ('Troy',                    'Toverland',                 'Netherlands',    'Great Coasters International', 'Wooden'),
  ('Fenix',                   'Toverland',                 'Netherlands',    'Bolliger & Mabillard',         'Steel'),

  -- Poland
  ('Zadra',                   'Energylandia',              'Poland',         'Rocky Mountain Construction',  'Hybrid'),
  ('Hyperion',                'Energylandia',              'Poland',         'Intamin',                      'Steel'),

  -- Belgium
  ('Kondaa',                  'Walibi Belgium',            'Belgium',        'Intamin',                      'Steel'),

  -- Sweden
  ('Helix',                   'Liseberg',                  'Sweden',         'Mack Rides',                   'Steel'),
  ('Balder',                  'Liseberg',                  'Sweden',         'Intamin',                      'Wooden'),

  -- France
  ('Toutatis',                'Parc Asterix',              'France',         'Intamin',                      'Steel'),

  -- Italy
  ('iSpeed',                  'Mirabilandia',              'Italy',          'Intamin',                      'Steel'),

  -- Denmark
  ('Piraten',                 'Djurs Sommerland',          'Denmark',        'Intamin',                      'Steel'),

  -- Ireland
  ('Cu Chulainn Coaster',     'Emerald Park',              'Ireland',        'Great Coasters International', 'Wooden'),

  -- United States
  ('Steel Vengeance',         'Cedar Point',               'United States',  'Rocky Mountain Construction',  'Hybrid'),
  ('Millennium Force',        'Cedar Point',               'United States',  'Intamin',                      'Steel'),
  ('Maverick',                'Cedar Point',               'United States',  'Intamin',                      'Steel'),
  ('Fury 325',                'Carowinds',                 'United States',  'Bolliger & Mabillard',         'Steel'),
  ('VelociCoaster',           'Universal Islands of Adventure', 'United States', 'Intamin',                   'Steel'),
  ('Iron Gwazi',              'Busch Gardens Tampa Bay',   'United States',  'Rocky Mountain Construction',  'Hybrid'),
  ('Twisted Colossus',        'Six Flags Magic Mountain',  'United States',  'Rocky Mountain Construction',  'Hybrid'),
  ('Steel Curtain',           'Kennywood',                 'United States',  'S&S Worldwide',                'Steel'),

  -- Canada
  ('Leviathan',               'Canada''s Wonderland',      'Canada',         'Bolliger & Mabillard',         'Steel'),
  ('Yukon Striker',           'Canada''s Wonderland',      'Canada',         'Bolliger & Mabillard',         'Steel'),

  -- Japan
  ('Steel Dragon 2000',       'Nagashima Spa Land',        'Japan',          'D. H. Morgan Manufacturing',   'Steel'),
  ('Hakugei',                 'Nagashima Spa Land',        'Japan',          'Rocky Mountain Construction',  'Hybrid'),
  ('Eejanaika',               'Fuji-Q Highland',           'Japan',          'S&S Worldwide',                'Steel'),
  ('Takabisha',               'Fuji-Q Highland',           'Japan',          'Vekoma',                       'Steel'),

  -- Australia
  ('DC Rivals HyperCoaster',  'Warner Bros. Movie World',  'Australia',      'Mack Rides',                   'Steel')
on conflict (name, park) do nothing;
