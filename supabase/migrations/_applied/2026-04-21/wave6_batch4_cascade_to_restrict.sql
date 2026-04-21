-- ============================================================
-- Wave 6 Batch 4: CASCADE → RESTRICT (24 FKs)
-- Executed via Management API: 2026-04-21
--
-- William decision: all CASCADE → RESTRICT (see BACKLOG Phase A #2).
-- This batch covers three low-risk, single-judgment-rule groups:
--
--   A. suppliers(id) children (7)
--       → supplier delete must not silently drop contracts / price lists / accounts.
--   B. cities(id) children (6) + countries(id) children (5)
--       → reference data; if accidentally deleted, RESTRICT stops propagation.
--   C. ref_airports / ref_countries (2)
--       → same rationale as geography.
--   D. itineraries(id) children (4)
--       → itineraries are design assets; deleting should force explicit cleanup.
--
-- Zero row impact. Schema metadata only.
-- ============================================================

-- ===== A. suppliers(id) → RESTRICT =====
ALTER TABLE public.cost_templates
  DROP CONSTRAINT cost_templates_supplier_id_fkey,
  ADD CONSTRAINT cost_templates_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;

ALTER TABLE public.folders
  DROP CONSTRAINT folders_supplier_id_fkey,
  ADD CONSTRAINT folders_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;

ALTER TABLE public.supplier_payment_accounts
  DROP CONSTRAINT supplier_payment_accounts_supplier_id_fkey,
  ADD CONSTRAINT supplier_payment_accounts_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;

ALTER TABLE public.supplier_price_list
  DROP CONSTRAINT supplier_price_list_supplier_id_fkey,
  ADD CONSTRAINT supplier_price_list_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;

ALTER TABLE public.supplier_request_responses
  DROP CONSTRAINT supplier_request_responses_supplier_id_fkey,
  ADD CONSTRAINT supplier_request_responses_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;

ALTER TABLE public.supplier_service_areas
  DROP CONSTRAINT supplier_cities_supplier_id_fkey,
  ADD CONSTRAINT supplier_cities_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;

ALTER TABLE public.supplier_users
  DROP CONSTRAINT supplier_users_supplier_id_fkey,
  ADD CONSTRAINT supplier_users_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;

-- ===== B. cities(id) → RESTRICT =====
ALTER TABLE public.attractions
  DROP CONSTRAINT attractions_city_id_fkey,
  ADD CONSTRAINT attractions_city_id_fkey
    FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;

ALTER TABLE public.cost_templates
  DROP CONSTRAINT cost_templates_city_id_fkey,
  ADD CONSTRAINT cost_templates_city_id_fkey
    FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;

ALTER TABLE public.michelin_restaurants
  DROP CONSTRAINT michelin_restaurants_city_id_fkey,
  ADD CONSTRAINT michelin_restaurants_city_id_fkey
    FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;

ALTER TABLE public.premium_experiences
  DROP CONSTRAINT premium_experiences_city_id_fkey,
  ADD CONSTRAINT premium_experiences_city_id_fkey
    FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;

ALTER TABLE public.region_stats
  DROP CONSTRAINT region_stats_city_id_fkey,
  ADD CONSTRAINT region_stats_city_id_fkey
    FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;

ALTER TABLE public.supplier_service_areas
  DROP CONSTRAINT supplier_cities_city_id_fkey,
  ADD CONSTRAINT supplier_cities_city_id_fkey
    FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;

-- ===== C. countries(id) → RESTRICT =====
ALTER TABLE public.attractions
  DROP CONSTRAINT attractions_country_id_fkey,
  ADD CONSTRAINT attractions_country_id_fkey
    FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE RESTRICT;

ALTER TABLE public.cities
  DROP CONSTRAINT cities_country_id_fkey,
  ADD CONSTRAINT cities_country_id_fkey
    FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE RESTRICT;

ALTER TABLE public.michelin_restaurants
  DROP CONSTRAINT michelin_restaurants_country_id_fkey,
  ADD CONSTRAINT michelin_restaurants_country_id_fkey
    FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE RESTRICT;

ALTER TABLE public.premium_experiences
  DROP CONSTRAINT premium_experiences_country_id_fkey,
  ADD CONSTRAINT premium_experiences_country_id_fkey
    FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE RESTRICT;

ALTER TABLE public.regions
  DROP CONSTRAINT regions_country_id_fkey,
  ADD CONSTRAINT regions_country_id_fkey
    FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE RESTRICT;

-- ===== D. ref_airports / ref_countries → RESTRICT =====
ALTER TABLE public.airport_images
  DROP CONSTRAINT airport_images_airport_code_fkey,
  ADD CONSTRAINT airport_images_airport_code_fkey
    FOREIGN KEY (airport_code) REFERENCES public.ref_airports(iata_code) ON DELETE RESTRICT;

ALTER TABLE public.workspace_countries
  DROP CONSTRAINT workspace_countries_country_code_fkey,
  ADD CONSTRAINT workspace_countries_country_code_fkey
    FOREIGN KEY (country_code) REFERENCES public.ref_countries(country_code) ON DELETE RESTRICT;

-- ===== E. itineraries(id) → RESTRICT =====
ALTER TABLE public.customer_assigned_itineraries
  DROP CONSTRAINT customer_assigned_itineraries_itinerary_id_fkey,
  ADD CONSTRAINT customer_assigned_itineraries_itinerary_id_fkey
    FOREIGN KEY (itinerary_id) REFERENCES public.itineraries(id) ON DELETE RESTRICT;

ALTER TABLE public.designer_drafts
  DROP CONSTRAINT designer_drafts_itinerary_id_fkey,
  ADD CONSTRAINT designer_drafts_itinerary_id_fkey
    FOREIGN KEY (itinerary_id) REFERENCES public.itineraries(id) ON DELETE RESTRICT;

ALTER TABLE public.itinerary_permissions
  DROP CONSTRAINT "Itinerary_Permissions_itinerary_id_fkey",
  ADD CONSTRAINT "Itinerary_Permissions_itinerary_id_fkey"
    FOREIGN KEY (itinerary_id) REFERENCES public.itineraries(id) ON DELETE RESTRICT;

ALTER TABLE public.tour_expenses
  DROP CONSTRAINT "Tour_Expenses_itinerary_id_fkey",
  ADD CONSTRAINT "Tour_Expenses_itinerary_id_fkey"
    FOREIGN KEY (itinerary_id) REFERENCES public.itineraries(id) ON DELETE RESTRICT;
