CREATE TABLE expense_categories (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    color TEXT NOT NULL
);

INSERT INTO expense_categories (id, label, color) VALUES
    ('food',          'Jedzenie',         '#F97316'),
    ('transport',     'Transport',        '#3B82F6'),
    ('accommodation', 'Nocleg',           '#8B5CF6'),
    ('entertainment', 'Atrakcje',         '#EC4899'),
    ('shopping',      'Zakupy',           '#10B981'),
    ('other',         'Inne',             '#6B7280'),
    ('refund',        'Zwrot',            '#14B8A6'),
    ('contribution',  'Wkład własny',     '#22C55E'),
    ('other_income',  'Inne przychody',   '#A3E635');
