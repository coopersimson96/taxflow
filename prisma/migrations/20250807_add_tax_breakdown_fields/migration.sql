-- Add detailed tax breakdown fields to transactions table
-- This migration enhances tax tracking for compliance reporting

-- Add new columns for detailed tax analysis
ALTER TABLE "transactions" ADD COLUMN "gstAmount" INTEGER DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN "pstAmount" INTEGER DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN "hstAmount" INTEGER DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN "qstAmount" INTEGER DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN "stateTaxAmount" INTEGER DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN "localTaxAmount" INTEGER DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN "otherTaxAmount" INTEGER DEFAULT 0;

-- Add tax breakdown details as structured JSON
ALTER TABLE "transactions" ADD COLUMN "taxBreakdown" JSONB DEFAULT '[]'::jsonb;

-- Add tax jurisdiction information
ALTER TABLE "transactions" ADD COLUMN "taxCountry" VARCHAR(3);
ALTER TABLE "transactions" ADD COLUMN "taxProvince" VARCHAR(10);
ALTER TABLE "transactions" ADD COLUMN "taxCity" VARCHAR(100);
ALTER TABLE "transactions" ADD COLUMN "taxPostalCode" VARCHAR(20);

-- Add indexes for tax reporting queries
CREATE INDEX "idx_transactions_tax_country_province" ON "transactions" ("organizationId", "taxCountry", "taxProvince", "transactionDate");
CREATE INDEX "idx_transactions_gst_amount" ON "transactions" ("organizationId", "gstAmount") WHERE "gstAmount" > 0;
CREATE INDEX "idx_transactions_pst_amount" ON "transactions" ("organizationId", "pstAmount") WHERE "pstAmount" > 0;
CREATE INDEX "idx_transactions_tax_breakdown" ON "transactions" USING GIN ("taxBreakdown");

-- Add comments for documentation
COMMENT ON COLUMN "transactions"."gstAmount" IS 'GST amount in cents (Canadian Goods and Services Tax)';
COMMENT ON COLUMN "transactions"."pstAmount" IS 'PST amount in cents (Provincial Sales Tax)';
COMMENT ON COLUMN "transactions"."hstAmount" IS 'HST amount in cents (Harmonized Sales Tax)';
COMMENT ON COLUMN "transactions"."qstAmount" IS 'QST amount in cents (Quebec Sales Tax)';
COMMENT ON COLUMN "transactions"."stateTaxAmount" IS 'State tax amount in cents (US state taxes)';
COMMENT ON COLUMN "transactions"."localTaxAmount" IS 'Local tax amount in cents (municipal/county taxes)';
COMMENT ON COLUMN "transactions"."otherTaxAmount" IS 'Other tax amount in cents (VAT, customs, etc.)';
COMMENT ON COLUMN "transactions"."taxBreakdown" IS 'Detailed tax breakdown with rates, jurisdictions, and amounts';
COMMENT ON COLUMN "transactions"."taxCountry" IS 'Tax jurisdiction country (ISO 3166-1 alpha-3)';
COMMENT ON COLUMN "transactions"."taxProvince" IS 'Tax jurisdiction province/state code';
COMMENT ON COLUMN "transactions"."taxCity" IS 'Tax jurisdiction city name';
COMMENT ON COLUMN "transactions"."taxPostalCode" IS 'Tax jurisdiction postal/zip code';