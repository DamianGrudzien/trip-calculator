CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE trips (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    destination TEXT,
    started_at  DATE,
    ended_at    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trip_families (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    family_key  TEXT NOT NULL CHECK (family_key IN ('f1', 'f2')),
    name        TEXT NOT NULL,
    UNIQUE (trip_id, family_key)
);

CREATE TABLE family_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id  UUID NOT NULL REFERENCES trip_families(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    sort_order INT  NOT NULL DEFAULT 0
);

CREATE TABLE expenses (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         UUID         NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    family_id       UUID         NOT NULL REFERENCES trip_families(id),
    description     TEXT         NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    currency        TEXT         NOT NULL DEFAULT 'PLN',
    exchange_rate   NUMERIC(8,4) NOT NULL DEFAULT 1.0,
    amount_pln      NUMERIC(12,2) NOT NULL,
    category        TEXT         NOT NULL DEFAULT 'other',
    paid_by_person  TEXT,
    expense_date    DATE         NOT NULL
);

CREATE TABLE incomes (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id             UUID         NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    family_id           UUID         NOT NULL REFERENCES trip_families(id),
    description         TEXT         NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    currency            TEXT         NOT NULL DEFAULT 'PLN',
    exchange_rate       NUMERIC(8,4) NOT NULL DEFAULT 1.0,
    amount_pln          NUMERIC(12,2) NOT NULL,
    category            TEXT         NOT NULL DEFAULT 'other_income',
    received_by_person  TEXT,
    income_date         DATE         NOT NULL
);

CREATE TABLE trip_settings (
    trip_id          UUID         PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
    split_ratio_f1   INT          NOT NULL DEFAULT 50,
    split_ratio_f2   INT          NOT NULL DEFAULT 50,
    default_eur_rate NUMERIC(8,4) NOT NULL DEFAULT 4.25
);
