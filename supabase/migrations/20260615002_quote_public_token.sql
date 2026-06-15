-- Public approval of quotes (Revenue Inc 4)
--
-- Adds a high-entropy, non-enumerable token used to expose a single quote on a
-- public, no-login page (/q/[token]) where the client approves/rejects. Reads
-- and the status update are done server-side with the service-role client,
-- strictly scoped to the matching token.
-- State: Additive + idempotent.

alter table public.quotes
  add column if not exists public_token text;

create unique index if not exists quotes_public_token_key
  on public.quotes (public_token)
  where public_token is not null;
