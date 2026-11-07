-- A custom event can carry revenue: an amount in an ISO 4217 currency, both
-- set or both null. A goal with a currency sums its matched events' amounts
-- in that currency; amounts in other currencies aren't converted or counted.
ALTER TABLE custom_events ADD COLUMN revenue_amount REAL;
ALTER TABLE custom_events ADD COLUMN revenue_currency TEXT;
