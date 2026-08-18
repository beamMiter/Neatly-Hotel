-- Add hotel_information only. Do not recreate rooms or other existing tables.

create table if not exists hotel_information (
  id text primary key,
  name text not null,
  description text not null,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into hotel_information (id, name, description, logo_url)
values (
  'default',
  'Neatly Hotel',
  'Set in Bangkok, Thailand. Neatly Hotel offers 5-star accommodation with an outdoor pool, kids'' club, sports facilities and a fitness centre. There is also a spa, an indoor pool and saunas. All units at the hotel are equipped with a seating area, a flat-screen TV with satellite channels, a dining area and a private bathroom with free toiletries, a hairdryer and shower. Every room at Neatly Hotel offers air conditioning and a desk.',
  '/images/logo-neatly.png'
)
on conflict (id) do nothing;
