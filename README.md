# Rukmani Motors NEXA Master Incentive System

This is the next architecture for the Rukmani NEXA incentive calculator.

## What is new
- RM calculator remains a permanent website/PWA.
- Monthly incentives can be centrally published from Admin.
- Admin is protected by Supabase Auth; the public RM page cannot publish data.
- Excel upload reads Model, Variant, Incentive, Spot 1 and Spot 2.
- Step-Up remains per-model: 1st ₹1,000; 2nd ₹1,200; 3rd ₹1,500; 4th ₹1,800; 5th+ ₹2,000.
- Admin can publish announcements that appear as closable popups.
- HR support: 91095 91336.
- September 2026 data is included as the offline fallback.

## One-time setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase-setup.sql`.
3. Create one Auth user for the administrator and set its user metadata to: `{"role":"admin"}`.
4. Copy the Supabase project URL and public anon key into `supabase-config.js`.
5. Upload all files to the GitHub Pages repository.
6. Open `admin.html`, log in, and publish a test month.

Do NOT put a Supabase service-role key in the website. Only the public anon key belongs in `supabase-config.js`.

## Important
The master publishing feature is not active until the Supabase one-time setup is completed. Until then, the calculator uses the included September 2026 data.


## v2 Supabase compatibility
This package is aligned with the existing Rukmani Supabase schema using is_published/incentive and starts_at/ends_at/display_frequency/is_active. Run supabase-setup-migration.sql in SQL Editor, then set the admin Auth user metadata to {"role":"admin"}.
