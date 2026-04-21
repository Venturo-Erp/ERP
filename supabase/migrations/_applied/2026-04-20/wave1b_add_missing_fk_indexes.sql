-- ========================================================================
-- Add missing FK indexes (only for non-empty tables)
-- Generated: 2026-04-17
-- Reason: FK 缺 index 會讓 JOIN 走 Seq Scan（database-optimizer 診斷）
-- Effect: 純優化，UI 零感知；CREATE INDEX IF NOT EXISTS 是 idempotent 安全
-- NOTE: 空表的 FK 不加 index（反正要搬到 _archive）
-- ========================================================================

-- NOTE: CREATE INDEX CONCURRENTLY 會在背景建，不鎖表——線上安全
-- 但 CONCURRENTLY 必須逐條執行，不能 wrap transaction

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_accounting_events_reversal_event_id" ON public."accounting_events" ("reversal_event_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_bots_workspace_id" ON public."ai_bots" ("workspace_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ai_settings_updated_by" ON public."ai_settings" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_airport_images_uploaded_by" ON public."airport_images" ("uploaded_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_attendance_records_leave_request_id" ON public."attendance_records" ("leave_request_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_attendance_records_updated_by" ON public."attendance_records" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_attendance_records_created_by" ON public."attendance_records" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_attractions_updated_by" ON public."attractions" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_attractions_created_by" ON public."attractions" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_attractions_country_code" ON public."attractions" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bank_accounts_account_id" ON public."bank_accounts" ("account_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_channels_dm_target_id" ON public."channels" ("dm_target_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_channels_created_by" ON public."channels" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cities_country_code" ON public."cities" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_company_asset_folders_created_by" ON public."company_asset_folders" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_company_asset_folders_updated_by" ON public."company_asset_folders" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_company_assets_updated_by" ON public."company_assets" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_company_assets_created_by" ON public."company_assets" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_confirmations_created_by" ON public."confirmations" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_confirmations_updated_by" ON public."confirmations" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_customer_service_conversations_workspace_id" ON public."customer_service_conversations" ("workspace_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_disbursement_orders_bank_account_id" ON public."disbursement_orders" ("bank_account_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_employees_role_id" ON public."employees" ("role_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_employees_created_by" ON public."employees" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_employees_supabase_user_id" ON public."employees" ("supabase_user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_employees_updated_by" ON public."employees" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_expense_categories_credit_account_id" ON public."expense_categories" ("credit_account_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_expense_categories_debit_account_id" ON public."expense_categories" ("debit_account_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_files_updated_by" ON public."files" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_files_order_id" ON public."files" ("order_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_files_previous_version_id" ON public."files" ("previous_version_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_files_created_by" ON public."files" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_folders_created_by" ON public."folders" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_game_office_rooms_updated_by" ON public."game_office_rooms" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_hotels_region_id" ON public."hotels" ("region_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_hotels_country_code" ON public."hotels" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_hotels_updated_by" ON public."hotels" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_hotels_created_by" ON public."hotels" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_itineraries_creator_user_id" ON public."itineraries" ("creator_user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_itineraries_created_by_legacy_user_id" ON public."itineraries" ("created_by_legacy_user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_luxury_hotels_region_id" ON public."luxury_hotels" ("region_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_luxury_hotels_created_by" ON public."luxury_hotels" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_luxury_hotels_updated_by" ON public."luxury_hotels" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_luxury_hotels_country_code" ON public."luxury_hotels" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_meeting_rooms_workspace_id" ON public."meeting_rooms" ("workspace_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_michelin_restaurants_workspace_id" ON public."michelin_restaurants" ("workspace_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_michelin_restaurants_country_code" ON public."michelin_restaurants" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_michelin_restaurants_created_by" ON public."michelin_restaurants" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_michelin_restaurants_region_id" ON public."michelin_restaurants" ("region_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_michelin_restaurants_updated_by" ON public."michelin_restaurants" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notes_created_by" ON public."notes" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notes_updated_by" ON public."notes" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_orders_updated_by" ON public."orders" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_orders_created_by" ON public."orders" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_methods_debit_account_id" ON public."payment_methods" ("debit_account_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_methods_credit_account_id" ON public."payment_methods" ("credit_account_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_request_items_confirmation_item_id" ON public."payment_request_items" ("confirmation_item_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_requests_accounting_subject_id" ON public."payment_requests" ("accounting_subject_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_requests_updated_by" ON public."payment_requests" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_pnrs_updated_by" ON public."pnrs" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_pnrs_created_by" ON public."pnrs" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_premium_experiences_workspace_id" ON public."premium_experiences" ("workspace_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_premium_experiences_created_by" ON public."premium_experiences" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_premium_experiences_region_id" ON public."premium_experiences" ("region_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_premium_experiences_updated_by" ON public."premium_experiences" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_premium_experiences_country_code" ON public."premium_experiences" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quotes_workspace_id" ON public."quotes" ("workspace_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quotes_country_code" ON public."quotes" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quotes_updated_by" ON public."quotes" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_receipts_payment_method_id" ON public."receipts" ("payment_method_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_receipts_accounting_subject_id" ON public."receipts" ("accounting_subject_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_receipts_payment_method_id" ON public."receipts" ("payment_method_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ref_destinations_parent_code" ON public."ref_destinations" ("parent_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_regions_country_code" ON public."regions" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_restaurants_created_by" ON public."restaurants" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_restaurants_updated_by" ON public."restaurants" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_restaurants_region_id" ON public."restaurants" ("region_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_restaurants_country_code" ON public."restaurants" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_suppliers_created_by" ON public."suppliers" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_suppliers_country_code" ON public."suppliers" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_suppliers_updated_by" ON public."suppliers" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tour_documents_uploaded_by" ON public."tour_documents" ("uploaded_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tour_documents_updated_by" ON public."tour_documents" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tour_documents_created_by" ON public."tour_documents" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tour_folder_templates_workspace_id" ON public."tour_folder_templates" ("workspace_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tour_itinerary_items_override_by" ON public."tour_itinerary_items" ("override_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tour_itinerary_items_assigned_by" ON public."tour_itinerary_items" ("assigned_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tour_itinerary_items_assignee_id" ON public."tour_itinerary_items" ("assignee_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tour_itinerary_items_updated_by" ON public."tour_itinerary_items" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tour_members_updated_by" ON public."tour_members" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tour_members_created_by" ON public."tour_members" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tours_updated_by" ON public."tours" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tours_deleted_by" ON public."tours" ("deleted_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tours_country_code" ON public."tours" ("country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tours_last_unlocked_by" ON public."tours" ("last_unlocked_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tours_locked_by" ON public."tours" ("locked_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tours_tour_leader_id" ON public."tours" ("tour_leader_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tours_closed_by" ON public."tours" ("closed_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tours_created_by" ON public."tours" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_traveler_conversations_last_message_id" ON public."traveler_conversations" ("last_message_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_traveler_conversations_created_by" ON public."traveler_conversations" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_wishlist_templates_created_by" ON public."wishlist_templates" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workspace_roles_workspace_id" ON public."workspace_roles" ("workspace_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workspaces_updated_by" ON public."workspaces" ("updated_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workspaces_home_country_code" ON public."workspaces" ("home_country_code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workspaces_created_by" ON public."workspaces" ("created_by");
