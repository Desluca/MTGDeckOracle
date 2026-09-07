create table if not exists rating_cards (
  id text primary key,
  oracle_id text,
  name text not null,
  type_line text not null,
  mana_value numeric not null,
  image_url text,
  scryfall_uri text,
  rating integer not null default 1500,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rating_comparisons (
  id text primary key,
  winner_card_id text not null references rating_cards(id) on delete restrict,
  loser_card_id text not null references rating_cards(id) on delete restrict,
  winner_rating_before integer not null,
  loser_rating_before integer not null,
  winner_rating_after integer not null,
  loser_rating_after integer not null,
  strategy text not null check (strategy in ('random', 'similar_rating')),
  created_at timestamptz not null default now()
);

create index if not exists rating_cards_rating_idx on rating_cards (rating);
create index if not exists rating_comparisons_created_at_idx on rating_comparisons (created_at);

create or replace function set_rating_cards_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rating_cards_set_updated_at on rating_cards;
create trigger rating_cards_set_updated_at
before update on rating_cards
for each row
execute function set_rating_cards_updated_at();
