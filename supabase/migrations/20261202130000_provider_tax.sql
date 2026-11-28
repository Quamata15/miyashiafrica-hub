-- Provider invoicing by country: tax number and country on the provider profile.
-- With a tax number, new invoices take the country's standard VAT rate by default.
ALTER TABLE public.provider_profiles ADD COLUMN IF NOT EXISTS tax_number text CHECK (tax_number IS NULL OR char_length(tax_number) <= 40);
ALTER TABLE public.provider_profiles ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'TG' CHECK (country ~ '^[A-Z]{2}$');
