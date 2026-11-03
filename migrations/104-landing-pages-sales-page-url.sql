-- Optional address of the live sales page for a landing page (used by the "Vezi LP" button in the admin).
-- The slug of a landing page does not have to match the slug of the sales page, so the address is entered by hand.
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS sales_page_url text;
