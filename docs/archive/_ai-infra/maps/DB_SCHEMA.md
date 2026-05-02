# Database Schema (Auto-generated)

> 259 tables total. Generated from Supabase.

## Core (Orders & Tours)

### customers

- id: text
- code: text
- name: text
- phone: text?
- email: text?
- address: text?
- national_id: text?
- emergency_contact: jsonb?
- total_orders: integer?
- total_spent: numeric?
- notes: text?
- is_active: boolean?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- english_name: text?
- alternative_phone: text?
- city: text?
- country: text?
- passport_number: text?
- birth_date: date?
- gender: text?
- company: text?
- tax_id: text?
- is_vip: boolean?
- vip_level: text?
- source: text?
- referred_by: text?
- last_order_date: timestamp with time zone?
- passport_name: character varying?
- passport_expiry: date?
- workspace_id: uuid?
- created_by: uuid?
- updated_by: uuid?
- verification_status: USER-DEFINED
- passport_image_url: text?
- nationality: text?
- sex: text?
- nickname: text?
- member_type: text
- avatar_url: text?
- total_points: integer?
- dietary_restrictions: text?
- linked_at: timestamp with time zone?
- linked_method: text?
- passport_name_print: text?
- online_user_id: uuid?

### order_members

- id: uuid
- order_id: uuid
- customer_id: uuid?
- member_type: text
- created_at: timestamp with time zone?
- identity: character varying?
- chinese_name: character varying?
- passport_name: character varying?
- birth_date: date?
- age: integer?
- id_number: character varying?
- gender: character varying?
- passport_number: character varying?
- passport_expiry: date?
- special_meal: character varying?
- pnr: character varying?
- flight_cost: numeric?
- hotel_1_name: character varying?
- hotel_1_checkin: date?
- hotel_1_checkout: date?
- hotel_2_name: character varying?
- hotel_2_checkin: date?
- hotel_2_checkout: date?
- transport_cost: numeric?
- misc_cost: numeric?
- total_payable: numeric?
- deposit_amount: numeric?
- balance_amount: numeric?
- deposit_receipt_no: character varying?
- balance_receipt_no: character varying?
- remarks: text?
- cost_price: numeric?
- selling_price: numeric?
- profit: numeric?
- workspace_id: uuid?
- created_by: uuid?
- updated_by: uuid?
- passport_image_url: text?
- ticket_number: character varying?
- ticketing_deadline: date?
- flight_self_arranged: boolean?
- contract_created_at: timestamp with time zone?
- checked_in: boolean?
- checked_in_at: timestamp with time zone?
- passport_name_print: text?
- sort_order: integer?
- custom_costs: jsonb?

### orders

- id: text
- code: text
- tour_id: text?
- customer_id: text?
- contact_person: text
- contact_phone: text?
- contact_email: text?
- adult_count: integer?
- child_count: integer?
- infant_count: integer?
- total_people: integer?
- total_amount: numeric?
- paid_amount: numeric?
- status: text?
- payment_status: text?
- notes: text?
- is_active: boolean?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- tour_name: text?
- sales_person: text?
- assistant: text?
- member_count: integer?
- remaining_amount: numeric?
- order_number: text?
- workspace_id: uuid?
- identity_options: jsonb?
- created_by: uuid?
- updated_by: uuid?

### proposals

- id: uuid
- code: text
- customer_id: text?
- customer_name: text?
- customer_email: text?
- customer_phone: text?
- title: text
- description: text?
- notes: text?
- country_id: text?
- main_city_id: text?
- destination: text?
- expected_start_date: date?
- expected_end_date: date?
- flexible_dates: boolean?
- group_size: integer?
- participant_counts: jsonb?
- status: text
- selected_package_id: uuid?
- converted_tour_id: text?
- converted_at: timestamp with time zone?
- converted_by: text?
- workspace_id: uuid
- created_by: text?
- updated_by: text?
- created_at: timestamp with time zone
- updated_at: timestamp with time zone
- archived_at: timestamp with time zone?
- archive_reason: text?
- \_deleted: boolean?
- \_needs_sync: boolean?
- \_synced_at: timestamp with time zone?

### quote_items

- id: text
- quote_id: text?
- category: text
- description: text
- quantity: integer?
- unit_price: numeric?
- total_price: numeric?
- notes: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- item_type: text?
- is_optional: boolean?
- is_active: boolean?
- display_order: integer?
- created_by: uuid?
- updated_by: uuid?
- workspace_id: uuid?
- resource_type: text?
- resource_id: uuid?
- resource_latitude: numeric?
- resource_longitude: numeric?
- resource_address: text?
- resource_phone: text?
- resource_google_maps_url: text?

### quotes

- id: text
- code: text?
- customer_name: text
- customer_phone: text?
- customer_email: text?
- destination: text?
- start_date: date?
- end_date: date?
- days: integer?
- nights: integer?
- adult_count: integer?
- child_count: integer?
- infant_count: integer?
- total_amount: numeric?
- status: text?
- valid_until: date?
- notes: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- name: text?
- group_size: integer?
- accommodation_days: integer?
- version: integer?
- created_by: text?
- created_by_name: text?
- converted_to_tour: boolean?
- tour_id: text?
- categories: jsonb?
- versions: jsonb?
- is_active: boolean?
- number_of_people: integer?
- customer_id: text?
- participant_counts: jsonb?
- selling_prices: jsonb?
- total_cost: numeric?
- is_pinned: boolean?
- country_id: text?
- main_city_id: text?
- other_city_ids: ARRAY?
- quote_type: text?
- contact_phone: text?
- contact_address: text?
- tour_code: text?
- handler_name: text?
- issue_date: date?
- received_amount: numeric?
- balance_amount: numeric?
- quick_quote_items: jsonb?
- workspace_id: uuid?
- shared_with_workspaces: ARRAY?
- updated_by: uuid?
- current_version_index: integer?
- itinerary_id: text?
- expense_description: text?
- tier_pricings: jsonb?
- confirmation_status: text?
- confirmation_token: text?
- confirmation_token_expires_at: timestamp with time zone?
- confirmed_at: timestamp with time zone?
- confirmed_by_type: text?
- confirmed_by_name: text?
- confirmed_by_email: text?
- confirmed_by_phone: text?
- confirmed_by_staff_id: text?
- confirmed_version: integer?
- confirmation_ip: text?
- confirmation_user_agent: text?
- confirmation_notes: text?
- proposal_package_id: uuid?

### tour_members

- id: uuid
- tour_id: uuid
- customer_id: uuid
- member_type: text
- room_type: text?
- roommate_id: uuid?
- special_requests: text?
- dietary_requirements: text?
- created_at: timestamp with time zone?
- created_by: uuid?
- updated_by: uuid?

### tours

- id: text
- code: text
- name: text
- departure_date: date
- return_date: date
- location: text?
- status: text?
- price: numeric?
- max_participants: integer?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- contract_status: text
- total_revenue: numeric
- total_cost: numeric
- profit: numeric
- quote_id: text?
- quote_cost_structure: jsonb?
- description: text?
- is_active: boolean?
- current_participants: integer?
- contract_template: text?
- contract_content: text?
- contract_created_at: timestamp with time zone?
- contract_notes: text?
- contract_completed: boolean?
- contract_archived_date: timestamp with time zone?
- envelope_records: text?
- \_needs_sync: boolean?
- \_synced_at: timestamp with time zone?
- \_deleted: boolean?
- features: jsonb?
- archived: boolean?
- country_id: text?
- main_city_id: text?
- workspace_id: uuid?
- closing_status: character varying?
- closing_date: date?
- closed_by: uuid?
- created_by: uuid?
- updated_by: uuid?
- enable_checkin: boolean?
- checkin_qrcode: text?
- outbound_flight: jsonb?
- return_flight: jsonb?
- locked_quote_id: text?
- locked_quote_version: integer?
- locked_itinerary_id: text?
- locked_itinerary_version: integer?
- locked_at: timestamp with time zone?
- locked_by: uuid?
- last_unlocked_at: timestamp with time zone?
- last_unlocked_by: uuid?
- modification_reason: text?
- archive_reason: text?
- proposal_id: uuid?
- proposal_package_id: uuid?
- converted_from_proposal: boolean?
- controller_id: uuid?
- confirmed_requirements: jsonb?
- itinerary_id: text?
- custom_cost_fields: jsonb?
- tour_leader_id: uuid?
- selling_price_per_person: numeric?

## Finance

### accounting_accounts

- id: uuid
- user_id: uuid
- name: text
- type: text
- balance: numeric
- currency: text
- icon: text?
- color: text?
- is_active: boolean?
- description: text?
- credit_limit: numeric?
- available_credit: numeric?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### accounting_categories

- id: uuid
- name: text
- type: text
- icon: text?
- color: text?
- is_system: boolean?
- created_at: timestamp with time zone?

### accounting_entries

- id: uuid
- entry_date: date
- entry_number: text
- category: text
- subcategory: text?
- amount: numeric
- entry_type: text
- tour_id: uuid?
- supplier_id: uuid?
- payment_method: text?
- description: text
- invoice_number: text?
- recorded_by: text
- notes: text?
- deleted_at: timestamp with time zone?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### accounting_events

- id: uuid
- workspace_id: uuid?
- event_type: USER-DEFINED
- source_type: text?
- source_id: uuid?
- group_id: uuid?
- tour_id: text?
- event_date: date
- currency: text?
- meta: jsonb?
- status: USER-DEFINED?
- reversal_event_id: uuid?
- memo: text?
- created_by: uuid?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### accounting_period_closings

- id: uuid
- workspace_id: uuid?
- period_type: character varying
- period_start: date
- period_end: date
- closing_voucher_id: uuid?
- net_income: numeric
- closed_by: uuid?
- closed_at: timestamp with time zone?
- created_at: timestamp with time zone?

### accounting_periods

- id: uuid
- workspace_id: uuid?
- period_name: text
- start_date: date
- end_date: date
- is_closed: boolean?
- closed_at: timestamp with time zone?
- closed_by: uuid?
- created_at: timestamp with time zone?

### accounting_subjects

- id: uuid
- workspace_id: uuid?
- code: character varying
- name: character varying
- type: character varying
- parent_id: uuid?
- level: integer?
- is_system: boolean?
- is_active: boolean?
- description: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### accounting_transactions

- id: uuid
- user_id: uuid
- account_id: uuid
- account_name: text?
- category_id: uuid?
- category_name: text?
- type: text
- amount: numeric
- currency: text
- description: text?
- date: date
- to_account_id: uuid?
- to_account_name: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### disbursement_orders

- id: text
- code: text?
- amount: numeric
- payment_method: text?
- status: text?
- handled_by: text?
- handled_at: timestamp with time zone?
- notes: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- workspace_id: uuid?
- payment_request_ids: ARRAY?
- updated_by: uuid?
- order_number: text?
- disbursement_date: date?
- confirmed_by: uuid?
- confirmed_at: timestamp with time zone?
- created_by: uuid?
- pdf_url: text?
- disbursement_type: character varying?
- refund_id: uuid?

### disbursement_requests

- id: uuid
- disbursement_order_id: uuid
- payment_request_id: uuid
- created_at: timestamp with time zone?

### invoice_orders

- id: uuid
- invoice_id: uuid
- order_id: text
- amount: numeric
- workspace_id: uuid
- created_at: timestamp with time zone
- created_by: text?

### linkpay_logs

- id: uuid
- receipt_number: character varying
- workspace_id: uuid
- linkpay_order_number: character varying?
- price: numeric
- end_date: date?
- link: text?
- status: integer?
- payment_name: character varying?
- created_at: timestamp with time zone?
- created_by: uuid?
- updated_at: timestamp with time zone?
- updated_by: uuid?
- sync_status: text?

### orders_invoice_summary

- order_id: text?
- order_number: text?
- contact_person: text?
- tour_id: text?
- workspace_id: uuid?
- total_amount: numeric?
- paid_amount: numeric?
- invoiced_amount: numeric?
- invoiceable_amount: numeric?

### payment_request_items

- id: uuid
- request_id: uuid?
- description: text
- category: text?
- quantity: integer?
- unitprice: numeric?
- subtotal: numeric?
- notes: text?
- created_at: timestamp with time zone?
- item_number: text?
- supplier_id: uuid?
- supplier_name: text?
- payment_method: text?
- custom_request_date: date?
- sort_order: integer?
- workspace_id: uuid?
- updated_at: timestamp with time zone?
- created_by: uuid?
- updated_by: uuid?
- tour_id: text?
- tour_request_id: uuid?
- confirmation_item_id: uuid?

### payment_requests

- id: uuid
- code: text
- tour_id: uuid?
- request_type: text
- amount: numeric
- supplier_id: uuid?
- supplier_name: text?
- status: text?
- approved_by: uuid?
- approved_at: timestamp with time zone?
- paid_by: uuid?
- paid_at: timestamp with time zone?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- workspace_id: uuid?
- request_date: date?
- total_amount: numeric?
- tour_code: text?
- tour_name: text?
- budget_warning: boolean?
- created_by: uuid?
- updated_by: uuid?
- items: jsonb?
- notes: text?
- order_id: text?
- order_number: text?
- created_by_name: text?
- request_category: character varying?
- expense_type: character varying?
- is_special_billing: boolean?
- request_number: text?
- batch_id: uuid?

### payments

- id: uuid
- payment_number: text
- order_id: uuid?
- tour_id: uuid?
- payment_type: text?
- amount: numeric
- payment_date: date
- payer: text?
- received_by: uuid?
- status: text?
- notes: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- workspace_id: uuid?
- created_by: uuid?
- updated_by: uuid?

### travel_invoices

- id: uuid
- transaction_no: text
- merchant_id: text?
- invoice_number: text?
- invoice_date: date
- total_amount: numeric
- tax_type: text
- buyer_name: text
- buyer_ubn: text?
- buyer_email: text?
- buyer_mobile: text?
- buyer_info: jsonb
- items: jsonb
- status: text
- random_num: text?
- barcode: text?
- qrcode_l: text?
- qrcode_r: text?
- void_date: timestamp with time zone?
- void_reason: text?
- voided_by: uuid?
- allowance_date: timestamp with time zone?
- allowance_amount: numeric?
- allowance_items: jsonb?
- allowance_no: text?
- allowanced_by: uuid?
- order_id: text?
- tour_id: text?
- created_by: uuid
- created_at: timestamp with time zone
- updated_at: timestamp with time zone
- workspace_id: uuid?
- is_batch: boolean?
- updated_by: uuid?

## Supplier & Procurement

### confirmations

- id: uuid
- workspace_id: uuid
- type: USER-DEFINED
- booking_number: text
- confirmation_number: text?
- data: jsonb
- status: text?
- notes: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- created_by: uuid?
- updated_by: uuid?

### hotel_templates

- id: text
- name: text
- description: text?
- preview_image_url: text?
- is_active: boolean?
- sort_order: integer?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### hotels

- id: uuid
- name: text
- english_name: text?
- name_local: text?
- brand: text?
- country_id: text
- region_id: text?
- city_id: text
- address: text?
- address_en: text?
- latitude: numeric?
- longitude: numeric?
- google_maps_url: text?
- star_rating: integer?
- hotel_class: text?
- category: text?
- description: text?
- description_en: text?
- highlights: ARRAY?
- room_types: jsonb?
- price_range: text?
- avg_price_per_night: integer?
- currency: text?
- facilities: jsonb?
- amenities: ARRAY?
- restaurants_count: integer?
- has_michelin_restaurant: boolean?
- dining_options: ARRAY?
- booking_contact: text?
- booking_email: text?
- booking_phone: text?
- website: text?
- group_friendly: boolean?
- min_rooms_for_group: integer?
- max_group_size: integer?
- group_rate_available: boolean?
- commission_rate: numeric?
- airport_transfer: boolean?
- concierge_service: boolean?
- butler_service: boolean?
- best_seasons: ARRAY?
- awards: ARRAY?
- certifications: ARRAY?
- thumbnail: text?
- images: ARRAY?
- notes: text?
- internal_notes: text?
- is_active: boolean?
- is_featured: boolean?
- display_order: integer?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- created_by: uuid?
- updated_by: uuid?

### quote_confirmation_logs

- id: uuid
- quote_id: text
- workspace_id: uuid?
- action: text
- confirmed_by_type: text?
- confirmed_by_name: text?
- confirmed_by_email: text?
- confirmed_by_phone: text?
- confirmed_by_staff_id: uuid?
- confirmed_version: integer?
- ip_address: text?
- user_agent: text?
- notes: text?
- created_at: timestamp with time zone?

### supplier_categories

- id: uuid
- name: text
- icon: text?
- color: text?
- display_order: integer?
- is_active: boolean?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### supplier_employees

- id: uuid
- supplier_id: uuid
- code: character varying?
- name: character varying
- phone: character varying?
- email: character varying?
- line_id: character varying?
- app_user_id: uuid?
- role: character varying?
- vehicle_type: character varying?
- vehicle_plate: character varying?
- vehicle_capacity: integer?
- is_active: boolean?
- workspace_id: uuid
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### supplier_payment_accounts

- id: text
- supplier_id: text
- account_name: text
- account_holder: text
- bank_name: text
- bank_code: text?
- bank_branch: text?
- account_number: text
- swift_code: text?
- currency: text?
- account_type: text?
- is_default: boolean?
- is_active: boolean?
- note: text?
- created_at: timestamp with time zone
- created_by: text?
- updated_at: timestamp with time zone
- updated_by: text?

### supplier_price_list

- id: text
- supplier_id: text
- item_name: text
- category: text
- unit_price: numeric
- unit: text
- seasonality: text?
- valid_from: date?
- valid_to: date?
- note: text?
- created_at: timestamp with time zone
- created_by: text?
- updated_at: timestamp with time zone
- updated_by: text?

### supplier_request_responses

- id: uuid
- request_id: uuid
- supplier_id: text
- responded_by: uuid?
- response_type: text
- quoted_price: numeric?
- currency: text?
- notes: text?
- attachments: jsonb?
- created_at: timestamp with time zone?

### supplier_service_areas

- id: text
- supplier_id: text
- city_id: text
- created_at: timestamp with time zone
- created_by: text?
- updated_by: uuid?

### supplier_users

- id: uuid
- supplier_id: text
- user_id: uuid?
- name: text
- email: text
- phone: text?
- role: text?
- is_active: boolean?
- last_login_at: timestamp with time zone?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### suppliers

- id: text
- code: text
- name: text
- contact_person: text?
- phone: text?
- email: text?
- address: text?
- total_orders: integer?
- total_spent: numeric?
- notes: text?
- is_active: boolean?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- english_name: character varying?
- type: character varying?
- country_id: character varying?
- bank_name: character varying?
- bank_account: character varying?
- tax_id: character varying?
- payment_terms: character varying?
- currency: character varying?
- rating: integer?
- is_preferred: boolean?
- display_order: integer?
- created_by: uuid?
- updated_by: uuid?
- website: text?
- bank_branch: text?
- contact: jsonb?
- country: text?
- region: text?
- status: text?
- category_id: uuid?
- \_deleted: boolean?
- \_needs_sync: boolean?
- \_synced_at: timestamp with time zone?
- bank_code_legacy: text?
- workspace_id: uuid?
- fax: character varying?

### tour_confirmation_items

- id: uuid
- sheet_id: uuid
- category: text
- service_date: date
- service_date_end: date?
- day_label: text?
- supplier_name: text
- supplier_id: uuid?
- title: text
- description: text?
- unit_price: numeric?
- currency: text?
- quantity: integer?
- subtotal: numeric?
- expected_cost: numeric?
- actual_cost: numeric?
- contact_info: jsonb?
- booking_reference: text?
- booking_status: text?
- type_data: jsonb?
- sort_order: integer?
- notes: text?
- workspace_id: uuid?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- request_id: uuid?
- resource_type: text?
- resource_id: uuid?
- latitude: numeric?
- longitude: numeric?
- google_maps_url: text?
- leader_expense: numeric?
- leader_expense_note: text?
- leader_expense_at: timestamp with time zone?
- receipt_images: ARRAY?
- itinerary_item_id: uuid?
- created_by: uuid?
- updated_by: uuid?

### tour_confirmation_sheets

- id: uuid
- tour_id: text
- tour_code: text
- tour_name: text
- departure_date: date?
- return_date: date?
- tour_leader_name: text?
- tour_leader_id: uuid?
- sales_person: text?
- assistant: text?
- pax: integer?
- flight_info: text?
- status: text
- total_expected_cost: numeric?
- total_actual_cost: numeric?
- itinerary_id: text?
- itinerary_version: integer?
- notes: text?
- workspace_id: uuid
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- created_by: text?
- updated_by: text?
- foreign_currency: text?
- exchange_rate: numeric?

## Travel (Itinerary, Flights, Visa)

### assigned_itineraries

- id: uuid
- itinerary_id: text
- assigned_date: date
- end_date: date
- status: text
- created_by: uuid?
- created_at: timestamp with time zone
- updated_at: timestamp with time zone
- updated_by: uuid?

### attractions

- id: uuid
- name: text
- english_name: text?
- description: text?
- country_id: text
- region_id: text?
- city_id: text?
- category: text?
- tags: ARRAY?
- opening_hours: jsonb?
- duration_minutes: integer?
- address: text?
- phone: text?
- website: text?
- latitude: numeric?
- longitude: numeric?
- google_maps_url: text?
- images: ARRAY?
- thumbnail: text?
- is_active: boolean?
- display_order: integer?
- notes: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- workspace_id: uuid?
- type: text?
- ticket_price: text?
- data_verified: boolean?
- created_by: uuid?
- updated_by: uuid?

### customer_assigned_itineraries

- id: uuid
- customer_id: text
- itinerary_id: text
- order_id: text?
- assigned_date: date
- status: text
- notes: text?
- workspace_id: uuid?
- created_at: timestamp with time zone
- updated_at: timestamp with time zone
- visa_status: text?
- esim_url: text?
- payment_details: jsonb?
- room_allocation: jsonb?

### esims

- id: uuid
- workspace_id: uuid
- esim_number: text
- group_code: text
- order_number: text?
- supplier_order_number: text?
- status: integer
- product_id: text?
- quantity: integer
- price: numeric?
- email: text?
- note: text?
- created_at: timestamp with time zone?
- created_by: uuid?
- updated_at: timestamp with time zone?
- updated_by: uuid?

### flight_status_subscriptions

- id: uuid
- workspace_id: uuid
- pnr_id: uuid?
- segment_id: uuid?
- airline_code: character varying
- flight_number: character varying
- flight_date: date
- notify_on: ARRAY?
- notify_channel_id: uuid?
- notify_employee_ids: ARRAY?
- external_provider: text?
- external_subscription_id: text?
- is_active: boolean?
- last_checked_at: timestamp with time zone?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### flight_templates

- id: text
- name: text
- description: text?
- preview_image_url: text?
- component_name: text
- sort_order: integer?
- is_active: boolean?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### itineraries

- id: text
- tour_id: text?
- description: text?
- created_at: timestamp with time zone
- updated_at: timestamp with time zone
- \_deleted: boolean?
- \_needs_sync: boolean?
- \_synced_at: timestamp with time zone?
- created_by: uuid?
- author_name: text?
- code: text?
- workspace_id: uuid
- updated_by: uuid?
- tagline: text?
- title: text?
- subtitle: text?
- country: text?
- city: text?
- status: text?
- features: jsonb?
- leader: jsonb?
- departure_date: text?
- tour_code: text?
- cover_image: text?
- outbound_flight: jsonb?
- return_flight: jsonb?
- focus_cards: jsonb?
- meeting_info: jsonb?
- itinerary_subtitle: text?
- daily_itinerary: jsonb?
- show_features: boolean?
- hotels: jsonb?
- show_leader_meeting: boolean?
- show_hotels: boolean?
- version: integer?
- parent_id: text?
- is_latest: boolean?
- version_records: jsonb?
- archived_at: timestamp with time zone?
- is_template: boolean?
- closed_at: timestamp with time zone?
- cover_style: text?
- price: text?
- price_note: text?
- show_pricing_details: boolean?
- pricing_details: jsonb?
- price_tiers: jsonb?
- show_price_tiers: boolean?
- faqs: jsonb?
- show_faqs: boolean?
- notices: ARRAY?
- show_notices: boolean?
- cancellation_policy: ARRAY?
- show_cancellation_policy: boolean?
- erp_itinerary_id: text?
- summary: text?
- duration_days: integer?
- flight_style: text?
- itinerary_style: text?
- cover_template_id: text?
- daily_template_id: text?
- flight_template_id: text?
- leader_style: text?
- hotel_style: text?
- pricing_style: text?
- features_style: text?
- created_by_legacy_user_id: uuid?
- proposal_package_id: uuid?

### itinerary_days

- id: uuid
- itinerary_id: text
- day_number: integer
- title: text?
- description: text?
- created_at: timestamp with time zone
- updated_at: timestamp with time zone

### itinerary_documents

- id: uuid
- tour_id: text?
- workspace_id: uuid
- name: text
- current_version_id: uuid?
- created_at: timestamp with time zone
- updated_at: timestamp with time zone
- created_by: text?
- updated_by: text?

### itinerary_items

- id: uuid
- itinerary_day_id: uuid
- item_order: integer
- item_type: text
- name: text
- description: text?
- location: text?
- latitude: double precision?
- longitude: double precision?
- start_time: time without time zone?
- end_time: time without time zone?
- duration_minutes: integer?
- image_url: text?
- booking_details: jsonb?
- attraction_id: uuid?
- created_at: timestamp with time zone
- updated_at: timestamp with time zone

### itinerary_permissions

- id: bigint
- itinerary_id: text
- user_id: uuid
- permission_level: text
- created_at: timestamp with time zone?

### itinerary_versions

- id: uuid
- document_id: uuid
- version_number: integer
- data: jsonb
- thumbnail_url: text?
- restored_from: uuid?
- created_at: timestamp with time zone
- created_by: text?

### pnr_flight_status_history

- id: uuid
- workspace_id: uuid
- pnr_id: uuid
- segment_id: uuid?
- airline_code: character varying
- flight_number: character varying
- flight_date: date
- booking_status: text?
- operational_status: text?
- delay_minutes: integer?
- new_departure_time: time without time zone?
- new_arrival_time: time without time zone?
- gate_info: character varying?
- remarks: text?
- source: text?
- external_data: jsonb?
- recorded_at: timestamp with time zone?

### tour_itinerary_items

- id: uuid
- tour_id: text?
- itinerary_id: text?
- workspace_id: uuid
- day_number: integer?
- sort_order: integer?
- category: text?
- sub_category: text?
- title: text?
- description: text?
- service_date: date?
- service_date_end: date?
- resource_type: text?
- resource_id: uuid?
- resource_name: text?
- latitude: numeric?
- longitude: numeric?
- google_maps_url: text?
- unit_price: numeric?
- quantity: numeric?
- total_cost: numeric?
- currency: text?
- pricing_type: text?
- adult_price: numeric?
- child_price: numeric?
- infant_price: numeric?
- quote_note: text?
- quote_item_id: text?
- supplier_id: uuid?
- supplier_name: text?
- request_id: uuid?
- request_status: text?
- request_sent_at: timestamp with time zone?
- request_reply_at: timestamp with time zone?
- reply_content: jsonb?
- reply_cost: numeric?
- estimated_cost: numeric?
- quoted_cost: numeric?
- confirmation_item_id: uuid?
- confirmed_cost: numeric?
- booking_reference: text?
- booking_status: text?
- confirmation_date: timestamp with time zone?
- confirmation_note: text?
- actual_expense: numeric?
- expense_note: text?
- expense_at: timestamp with time zone?
- receipt_images: ARRAY?
- quote_status: text?
- confirmation_status: text?
- leader_status: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- created_by: uuid?
- show_on_web: boolean
- show_on_brochure: boolean
- updated_by: uuid?

### transportation_rates

- id: uuid
- workspace_id: uuid?
- country_id: text?
- country_name: text
- vehicle_type: text
- category: text?
- supplier: text?
- route: text?
- trip_type: text?
- cost_vnd: numeric?
- price_twd: numeric?
- price: numeric
- currency: text
- unit: text
- kkday_selling_price: numeric?
- kkday_cost: numeric?
- kkday_profit: numeric?
- is_backup: boolean?
- is_active: boolean
- display_order: integer
- notes: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- created_by: uuid?
- updated_by: uuid?
- deleted_at: timestamp with time zone?
- deleted_by: uuid?

### traveler_trip_flights

- id: uuid
- trip_id: uuid
- flight_type: text?
- airline: text?
- flight_no: text?
- departure_date: date?
- departure_time: time without time zone?
- departure_airport: text?
- departure_airport_code: text?
- arrival_date: date?
- arrival_time: time without time zone?
- arrival_airport: text?
- arrival_airport_code: text?
- pnr: text?
- ticket_number: text?
- cabin_class: text?
- meeting_time: time without time zone?
- meeting_location: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### traveler_trip_itinerary_items

- id: uuid
- trip_id: uuid
- day_number: integer?
- item_date: date?
- start_time: time without time zone?
- end_time: time without time zone?
- title: text
- description: text?
- category: text?
- icon: text?
- location_name: text?
- location_address: text?
- location_url: text?
- latitude: numeric?
- longitude: numeric?
- currency: text?
- estimated_cost: numeric?
- notes: text?
- sort_order: integer?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### visas

- id: uuid
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- applicant_name: character varying
- contact_person: character varying
- contact_phone: character varying
- visa_type: character varying
- country: character varying
- status: character varying?
- submission_date: date?
- received_date: date?
- pickup_date: date?
- order_id: text
- order_number: character varying
- tour_id: text
- code: character varying
- fee: numeric?
- cost: numeric?
- notes: text?
- created_by: text?
- \_needs_sync: boolean?
- \_synced_at: timestamp with time zone?
- is_active: boolean?
- workspace_id: uuid
- updated_by: uuid?
- vendor: text?
- documents_returned_date: date?
- expected_issue_date: date?
- actual_submission_date: date?
- is_urgent: boolean?

## Workspace & Auth

### employees

- employee_number: text
- english_name: text?
- chinese_name: text?
- password_hash: text?
- personal_info: jsonb?
- job_info: jsonb?
- salary_info: jsonb?
- permissions: ARRAY?
- attendance: jsonb?
- contracts: jsonb?
- status: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- avatar: text?
- is_active: boolean?
- last_login_at: timestamp with time zone?
- email: text?
- display_name: text?
- roles: ARRAY?
- id: uuid
- avatar_url: text?
- workspace_id: uuid?
- hidden_menu_items: ARRAY?
- user_id: uuid?
- monthly_salary: numeric?
- preferred_features: jsonb?
- supabase_user_id: uuid?
- updated_by: uuid?
- must_change_password: boolean?
- employee_type: text?
- id_number: text?
- birth_date: date?
- pinyin: text?

### supplier_employees

- id: uuid
- supplier_id: uuid
- code: character varying?
- name: character varying
- phone: character varying?
- email: character varying?
- line_id: character varying?
- app_user_id: uuid?
- role: character varying?
- vehicle_type: character varying?
- vehicle_plate: character varying?
- vehicle_capacity: integer?
- is_active: boolean?
- workspace_id: uuid
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### workspace_bonus_defaults

- id: uuid
- workspace_id: uuid
- type: smallint
- bonus: numeric
- bonus_type: smallint
- employee_id: uuid?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### workspace_items

- id: uuid
- owner: text
- title: text
- description: text?
- item_type: text
- content: jsonb?
- tags: ARRAY?
- priority: integer?
- is_pinned: boolean?
- deleted_at: timestamp with time zone?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### workspace_modules

- id: uuid
- workspace_id: uuid
- module_name: character varying
- is_enabled: boolean?
- enabled_at: timestamp with time zone?
- expires_at: timestamp with time zone?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### workspaces

- id: uuid
- name: text
- description: text?
- icon: text?
- is_active: boolean?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- \_needs_sync: boolean?
- \_synced_at: timestamp with time zone?
- \_deleted: boolean?
- created_by: uuid?
- payment_config: jsonb?
- code: text
- type: text?
- employee_number_prefix: character varying?
- default_password: character varying?
- logo_url: text?
- address: text?
- phone: text?
- fax: text?
- tax_id: text?
- bank_name: text?
- bank_branch: text?
- bank_account: text?
- bank_account_name: text?
- seal_image_url: text?
- email: text?
- website: text?
- invoice_seal_image_url: text?
- updated_by: uuid?

## Other (197 tables)

### \_migrations

- id: integer
- name: text
- executed_at: timestamp with time zone?

### accounts

- id: uuid
- account_code: text
- account_name: text
- account_type: text
- parent_code: text?
- level: integer?
- ... (10 columns)

### activities

- id: uuid
- activity_code: text
- activity_name: text
- activity_type: text
- region_id: uuid?
- supplier_id: uuid?
- ... (19 columns)

### advance_items

- id: uuid
- advance_list_id: uuid
- name: character varying
- description: text?
- amount: numeric
- advance_person: character varying
- ... (15 columns)

### advance_lists

- id: uuid
- channel_id: uuid
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- \_needs_sync: boolean?
- \_synced_at: timestamp with time zone?
- ... (9 columns)

### ai_conversations

- id: uuid
- workspace_id: uuid?
- employee_id: uuid?
- messages: jsonb
- summary: text?
- learned_memory_ids: ARRAY?
- ... (9 columns)

### ai_memories

- id: uuid
- workspace_id: uuid?
- category: text
- title: text?
- content: text
- context: text?
- ... (15 columns)

### ai_messages

- id: uuid
- from_agent: text
- to_agent: text
- message: text
- message_type: text?
- metadata: jsonb?
- ... (8 columns)

### ai_settings

- id: uuid
- workspace_id: uuid?
- name: text?
- avatar_url: text?
- provider: text?
- model: text?
- ... (15 columns)

### airport_images

- id: uuid
- airport_code: text
- image_url: text
- label: text?
- season: text?
- is_default: boolean?
- ... (11 columns)

### api_usage

- id: uuid
- api_name: text
- month: text
- usage_count: integer?
- updated_at: timestamp with time zone?

### api_usage_log

- id: bigint
- created_at: timestamp with time zone
- api_service: text
- notes: text?

### attendance_records

- id: uuid
- workspace_id: uuid
- employee_id: uuid
- date: date
- clock_in: time without time zone?
- clock_out: time without time zone?
- ... (15 columns)

### background_tasks

- id: uuid
- type: character varying
- payload: jsonb
- status: USER-DEFINED
- priority: USER-DEFINED
- workspace_id: uuid
- ... (16 columns)

### badge_definitions

- id: text
- name: text
- description: text
- icon_url: text?
- category: text?
- points_reward: integer?
- ... (11 columns)

### badges

- id: uuid
- code: text
- name: text
- description: text?
- icon: text?
- color: text?
- ... (8 columns)

### body_measurements

- id: uuid
- user_id: uuid
- workspace_id: uuid?
- date: date
- weight: numeric?
- body_fat_percentage: numeric?
- ... (20 columns)

### brochure_documents

- id: uuid
- tour_id: text?
- workspace_id: uuid?
- name: text
- type: text
- current_version_id: uuid?
- ... (17 columns)

### brochure_versions

- id: uuid
- document_id: uuid
- version_number: integer
- data: jsonb
- thumbnail_url: text?
- restored_from: uuid?
- ... (8 columns)

### budgets

- id: uuid
- category_id: uuid
- period: character varying
- amount: numeric
- spent: numeric?
- notes: text?
- ... (9 columns)

### bulletins

- id: uuid
- workspace_id: uuid
- title: text
- content: text
- type: text?
- priority: integer?
- ... (14 columns)

### calendar_events

- id: uuid
- title: text
- description: text?
- start: timestamp with time zone
- end: timestamp with time zone
- all_day: boolean?
- ... (21 columns)

### casual_trips

- id: uuid
- user_id: uuid?
- title: text
- description: text?
- destination: text?
- start_date: date?
- ... (14 columns)

### categories

- id: uuid
- name: character varying
- type: character varying
- parent_id: uuid?
- icon: character varying?
- color: character varying?
- ... (9 columns)

### channel_groups

- id: uuid
- workspace_id: uuid
- name: character varying
- is_collapsed: boolean?
- order: integer?
- created_at: timestamp with time zone?
- ... (12 columns)

### channel_members

- id: uuid
- workspace_id: uuid
- channel_id: uuid
- employee_id: uuid
- role: text
- status: text
- ... (8 columns)

### channel_threads

- id: uuid
- channel_id: uuid
- name: text
- created_by: uuid
- is_archived: boolean?
- created_at: timestamp with time zone?
- ... (12 columns)

### channels

- id: uuid
- workspace_id: uuid
- name: text
- description: text?
- type: text?
- created_at: timestamp with time zone?
- ... (25 columns)

### chart_of_accounts

- id: uuid
- workspace_id: uuid?
- code: text
- name: text
- account_type: text
- parent_id: uuid?
- ... (11 columns)

### cities

- id: text
- country_id: text
- region_id: text?
- name: text
- name_en: text?
- description: text?
- ... (19 columns)

### companies

- id: uuid
- code: text?
- workspace_id: uuid?
- name: text
- english_name: text?
- tax_id: text?
- ... (30 columns)

### company_announcements

- id: uuid
- workspace_id: uuid?
- title: text
- content: text?
- type: text?
- is_pinned: boolean?
- ... (21 columns)

### company_asset_folders

- id: uuid
- workspace_id: uuid
- name: text
- parent_id: uuid?
- icon: text?
- color: text?
- ... (11 columns)

### company_assets

- id: uuid
- name: text
- file_path: text
- file_size: integer?
- mime_type: text?
- description: text?
- ... (16 columns)

### company_contacts

- id: uuid
- workspace_id: uuid?
- company_id: uuid?
- name: text
- english_name: text?
- title: text?
- ... (21 columns)

### cost_templates

- id: uuid
- supplier_id: text
- city_id: text
- attraction_id: uuid?
- category: text
- item_name: text
- ... (34 columns)

### countries

- id: text
- name: text
- name_en: text
- emoji: text?
- code: text?
- has_regions: boolean?
- ... (13 columns)

### cover_templates

- id: text
- name: text
- description: text?
- preview_image_url: text?
- component_name: text
- sort_order: integer?
- ... (9 columns)

### cron_execution_logs

- id: uuid
- job_name: text
- executed_at: timestamp with time zone?
- result: jsonb?
- success: boolean?
- error_message: text?

### customer_badges

- id: uuid
- customer_id: text
- badge_id: text
- earned_at: timestamp with time zone?

### customer_group_members

- id: uuid
- group_id: uuid
- customer_id: text
- role: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### customer_groups

- id: uuid
- workspace_id: uuid
- name: text
- type: text
- notes: text?
- created_by: uuid?
- ... (9 columns)

### customer_travel_cards

- id: uuid
- customer_id: text
- template_id: uuid?
- icon: text?
- label_zh: text?
- translations: jsonb?
- ... (10 columns)

### customization_requests

- id: uuid
- customer_id: text
- assigned_itinerary_id: uuid
- request_text: text
- status: text
- response_text: text?
- ... (11 columns)

### daily_templates

- id: text
- name: text
- description: text?
- preview_image_url: text?
- component_name: text
- sort_order: integer?
- ... (9 columns)

### design_templates

- id: uuid
- workspace_id: uuid?
- name: text
- description: text?
- type: text
- category: text?
- ... (16 columns)

### designer_drafts

- id: uuid
- workspace_id: uuid
- user_id: uuid
- tour_id: text?
- proposal_id: uuid?
- itinerary_id: text?
- ... (18 columns)

### driver_tasks

- id: uuid
- task_code: character varying
- tour_request_id: uuid?
- tour_id: uuid?
- tour_code: character varying?
- tour_name: character varying?
- ... (49 columns)

### email_accounts

- id: uuid
- workspace_id: uuid
- email_address: text
- display_name: text?
- account_type: text
- owner_id: uuid?
- ... (15 columns)

### email_attachments

- id: uuid
- email_id: uuid
- workspace_id: uuid
- filename: text
- content_type: text?
- size_bytes: bigint?
- ... (11 columns)

### emails

- id: uuid
- workspace_id: uuid
- message_id: text?
- thread_id: text?
- in_reply_to: text?
- direction: text
- ... (37 columns)

### erp_bank_accounts

- id: uuid
- workspace_id: uuid?
- name: text
- bank_name: text?
- account_number: text?
- account_id: uuid?
- ... (9 columns)

### expense_categories

- id: uuid
- user_id: uuid?
- name: text
- icon: text
- color: text
- type: text
- ... (11 columns)

### expense_monthly_stats

- id: uuid
- user_id: uuid
- year_month: text
- total_expense: numeric?
- total_income: numeric?
- total_split_paid: numeric?
- ... (9 columns)

### expense_streaks

- id: uuid
- user_id: uuid
- current_streak: integer?
- longest_streak: integer?
- last_record_date: date?
- total_records: integer?
- ... (11 columns)

### eyeline_submissions

- id: uuid
- user_id: text
- submission_type: text
- target_entity_info: jsonb
- submission_content: jsonb
- status: text
- ... (13 columns)

### features_templates

- id: text
- name: text
- description: text?
- preview_image_url: text?
- is_active: boolean?
- sort_order: integer?
- ... (8 columns)

### files

- id: uuid
- workspace_id: uuid
- folder_id: uuid?
- filename: text
- original_filename: text
- content_type: text?
- ... (34 columns)

### fleet_drivers

- id: uuid
- workspace_id: uuid
- employee_id: uuid?
- name: character varying
- phone: character varying?
- id_number: character varying?
- ... (20 columns)

### fleet_schedules

- id: uuid
- workspace_id: uuid
- vehicle_id: uuid
- start_date: date
- end_date: date
- client_name: character varying?
- ... (24 columns)

### fleet_schedules_with_vehicle

- id: uuid?
- workspace_id: uuid?
- vehicle_id: uuid?
- start_date: date?
- end_date: date?
- client_name: character varying?
- ... (30 columns)

### fleet_vehicle_logs

- id: uuid
- workspace_id: uuid
- vehicle_id: uuid
- log_type: character varying
- log_date: date
- description: text?
- ... (16 columns)

### fleet_vehicles

- id: uuid
- workspace_id: uuid
- license_plate: character varying
- vehicle_name: character varying?
- vehicle_type: character varying
- capacity: integer
- ... (28 columns)

### folders

- id: uuid
- workspace_id: uuid
- name: text
- folder_type: USER-DEFINED
- icon: text?
- color: text?
- ... (18 columns)

### friends

- id: uuid
- user_id: uuid
- friend_id: uuid
- status: text
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### game_office_rooms

- id: uuid
- workspace_id: uuid
- room_data: jsonb
- updated_by: uuid?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- ... (7 columns)

### general_ledger

- id: uuid
- workspace_id: uuid
- subject_id: uuid
- year: integer
- month: integer
- opening_balance: numeric?
- ... (11 columns)

### image_library

- id: uuid
- workspace_id: uuid
- name: text
- description: text?
- file_path: text
- public_url: text
- ... (18 columns)

### journal_lines

- id: uuid
- voucher_id: uuid?
- line_no: integer
- account_id: uuid?
- subledger_type: USER-DEFINED?
- subledger_id: uuid?
- ... (10 columns)

### journal_vouchers

- id: uuid
- workspace_id: uuid?
- voucher_no: text
- voucher_date: date
- memo: text?
- company_unit: text?
- ... (13 columns)

### leader_availability

- id: uuid
- workspace_id: uuid
- leader_id: uuid
- available_start_date: date
- available_end_date: date
- status: text?
- ... (9 columns)

### leader_schedules

- id: uuid
- workspace_id: uuid
- leader_id: uuid
- start_date: date
- end_date: date
- tour_id: text?
- ... (14 columns)

### leader_schedules_with_leader

- id: uuid?
- workspace_id: uuid?
- leader_id: uuid?
- start_date: date?
- end_date: date?
- tour_id: text?
- ... (18 columns)

### leader_templates

- id: text
- name: text
- description: text?
- preview_image_url: text?
- is_active: boolean?
- sort_order: integer?
- ... (8 columns)

### leave_balances

- id: uuid
- workspace_id: uuid
- employee_id: uuid
- leave_type_id: uuid
- year: integer
- entitled_days: numeric
- ... (12 columns)

### leave_requests

- id: uuid
- workspace_id: uuid
- employee_id: uuid
- leave_type_id: uuid
- start_date: date
- end_date: date
- ... (19 columns)

### leave_types

- id: uuid
- workspace_id: uuid
- name: character varying
- code: character varying
- days_per_year: numeric?
- is_paid: boolean?
- ... (12 columns)

### manifestation_records

- id: uuid
- user_id: uuid
- record_date: date
- content: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### members

- id: text
- order_id: text?
- tour_id: text?
- chinese_name: text
- english_name: text?
- gender: text?
- ... (40 columns)

### messages

- id: uuid
- channel_id: uuid
- content: text
- reactions: jsonb?
- created_at: timestamp with time zone?
- edited_at: timestamp with time zone?
- ... (21 columns)

### michelin_restaurants

- id: uuid
- name: text
- english_name: text?
- name_local: text?
- michelin_stars: integer?
- michelin_guide_year: integer?
- ... (59 columns)

### my_erp_tours

- id: text?
- tour_code: text?
- title: text?
- start_date: date?
- end_date: date?
- status: text?
- ... (16 columns)

### my_tours

- id: uuid?
- tour_code: text?
- title: text?
- start_date: date?
- end_date: date?
- status: text?
- ... (18 columns)

### notes

- id: uuid
- user_id: uuid
- tab_id: text
- tab_name: text
- content: text
- tab_order: integer
- ... (11 columns)

### office_documents

- id: uuid
- workspace_id: uuid?
- name: text
- type: text
- data: jsonb
- created_at: timestamp with time zone
- ... (10 columns)

### online_trip_members

- id: uuid
- trip_id: uuid
- role: text
- name: text?
- phone: text?
- erp_employee_id: text?
- ... (21 columns)

### online_trips

- id: uuid
- erp_tour_id: text?
- erp_itinerary_id: text?
- code: text
- name: text
- departure_date: date
- ... (18 columns)

### payroll_periods

- id: uuid
- workspace_id: uuid
- year: integer
- month: integer
- start_date: date
- end_date: date
- ... (13 columns)

### payroll_records

- id: uuid
- workspace_id: uuid
- payroll_period_id: uuid
- employee_id: uuid
- base_salary: numeric
- overtime_pay: numeric
- ... (29 columns)

### personal_canvases

- id: uuid
- employee_id: uuid
- workspace_id: uuid
- canvas_number: integer
- title: text
- type: text?
- ... (10 columns)

### personal_expenses

- id: uuid
- user_id: uuid
- amount: numeric
- type: text
- title: text
- description: text?
- ... (26 columns)

### personal_records

- id: uuid
- user_id: uuid
- workspace_id: uuid?
- exercise_id: integer
- exercise_name: text
- max_weight: numeric?
- ... (12 columns)

### pnr_ai_queries

- id: uuid
- workspace_id: uuid
- pnr_id: uuid?
- query_text: text
- query_context: jsonb?
- response_text: text?
- ... (9 columns)

### pnr_fare_alerts

- id: uuid
- workspace_id: uuid
- pnr_id: uuid
- alert_type: text
- threshold_amount: numeric?
- threshold_percent: numeric?
- ... (13 columns)

### pnr_fare_history

- id: uuid
- workspace_id: uuid
- pnr_id: uuid
- fare_basis: text?
- currency: character?
- base_fare: numeric?
- ... (13 columns)

### pnr_passengers

- id: uuid
- pnr_id: uuid
- sequence_number: integer?
- surname: character varying
- given_name: character varying?
- title: character varying?
- ... (11 columns)

### pnr_queue_items

- id: uuid
- workspace_id: uuid
- pnr_id: uuid
- queue_type: text
- priority: integer?
- due_date: timestamp with time zone?
- ... (18 columns)

### pnr_records

- id: uuid
- record_locator: character varying
- raw_content: text?
- office_id: character varying?
- created_date: date?
- ticketing_status: character varying?
- ... (20 columns)

### pnr_remarks

- id: uuid
- pnr_id: uuid
- remark_type: character varying?
- content: text
- created_at: timestamp with time zone?

### pnr_schedule_changes

- id: uuid
- workspace_id: uuid
- pnr_id: uuid
- segment_id: uuid?
- change_type: text
- original_flight_number: character varying?
- ... (23 columns)

### pnr_segments

- id: uuid
- pnr_id: uuid
- segment_number: integer?
- airline_code: character varying
- flight_number: character varying
- booking_class: character varying?
- ... (17 columns)

### pnr_ssr_elements

- id: uuid
- pnr_id: uuid
- passenger_id: uuid?
- segment_id: uuid?
- ssr_code: character varying
- airline_code: character varying?
- ... (9 columns)

### pnrs

- id: uuid
- record_locator: text
- workspace_id: uuid
- employee_id: uuid?
- raw_pnr: text
- passenger_names: ARRAY
- ... (18 columns)

### posting_rules

- id: uuid
- workspace_id: uuid?
- event_type: USER-DEFINED
- rule_name: text
- rule_config: jsonb
- is_active: boolean?
- ... (8 columns)

### premium_experiences

- id: uuid
- name: text
- english_name: text?
- name_local: text?
- tagline: text?
- country_id: text
- ... (75 columns)

### price_list_items

- id: uuid
- supplier_id: uuid?
- item_code: text
- item_name: text
- category: text?
- unit: text?
- ... (14 columns)

### pricing_templates

- id: text
- name: text
- description: text?
- preview_image_url: text?
- is_active: boolean?
- sort_order: integer?
- ... (8 columns)

### private_messages

- id: uuid
- sender_id: uuid
- receiver_id: uuid
- content: text
- read_at: timestamp with time zone?
- created_at: timestamp with time zone?

### profiles

- id: uuid
- name: text?
- nickname: text?
- avatar_url: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- ... (17 columns)

### progress_photos

- id: uuid
- user_id: uuid
- workspace_id: uuid?
- date: date
- photo_type: text
- photo_url: text
- ... (10 columns)

### proposal_packages

- id: uuid
- proposal_id: uuid?
- version_name: text
- version_number: integer
- country_id: text?
- main_city_id: text?
- ... (27 columns)

### quote_categories

- id: uuid
- quote_id: uuid?
- name: text
- items: jsonb?
- subtotal: numeric?
- created_at: timestamp with time zone?
- ... (7 columns)

### quote_regions

- id: uuid
- quote_id: text
- country: text
- country_name: text
- region: text?
- region_name: text?
- ... (11 columns)

### quote_versions

- id: uuid
- quote_id: uuid?
- version: integer
- data: jsonb
- change_note: text?
- created_by: uuid?
- ... (7 columns)

### receipt_items

- id: uuid
- receipt_id: uuid
- tour_id: text?
- order_id: text?
- customer_id: text?
- amount: numeric
- ... (31 columns)

### receipt_orders

- id: text
- code: text
- order_id: text?
- amount: numeric
- payment_method: text
- receipt_date: date
- ... (13 columns)

### receipt_payment_items

- id: uuid
- receipt_id: uuid?
- item_name: text
- amount: numeric
- notes: text?
- created_at: timestamp with time zone?

### receipts

- id: uuid
- receipt_number: text
- order_id: uuid
- customer_id: uuid?
- amount: numeric
- payment_method: text
- ... (44 columns)

### ref_airlines

- iata_code: character varying
- icao_code: character varying?
- english_name: character varying?
- name_zh: character varying?
- country: character varying?
- alliance: character varying?
- ... (8 columns)

### ref_airports

- iata_code: character varying
- icao_code: character varying?
- english_name: character varying?
- name_zh: character varying?
- city_code: character varying?
- city_name_en: character varying?
- ... (15 columns)

### ref_airports_backup

- iata_code: character varying?
- icao_code: character varying?
- english_name: character varying?
- name_zh: character varying?
- city_code: character varying?
- city_name_en: character varying?
- ... (15 columns)

### ref_booking_classes

- code: character varying
- cabin_type: character varying?
- description: character varying?
- priority: integer?
- created_at: timestamp with time zone?

### ref_ssr_codes

- code: character varying
- category: character varying?
- description_en: character varying?
- description_zh: character varying?
- created_at: timestamp with time zone?

### ref_status_codes

- code: character varying
- category: character varying?
- description_en: character varying?
- description_zh: character varying?
- created_at: timestamp with time zone?

### refunds

- id: uuid
- workspace_id: uuid
- refund_number: character varying
- refund_type: integer
- refund_amount: numeric
- refund_date: date
- ... (20 columns)

### region_stats

- city_id: text
- attractions_count: integer?
- cost_templates_count: integer?
- quotes_count: integer?
- tours_count: integer?
- updated_at: timestamp with time zone?

### regions

- id: text
- country_id: text
- name: text
- name_en: text?
- description: text?
- display_order: integer?
- ... (10 columns)

### request_response_items

- id: uuid
- response_id: uuid
- resource_type: text
- resource_id: uuid?
- resource_name: text?
- license_plate: text?
- ... (16 columns)

### request_responses

- id: uuid
- request_id: uuid
- responder_workspace_id: uuid
- response_date: timestamp with time zone?
- status: text?
- total_amount: numeric?
- ... (9 columns)

### restaurants

- id: uuid
- name: text
- english_name: text?
- name_local: text?
- country_id: text
- region_id: text?
- ... (57 columns)

### rich_documents

- id: uuid
- canvas_id: uuid
- title: text
- content: text
- format_data: jsonb?
- tags: ARRAY?
- ... (12 columns)

### shared_order_lists

- id: uuid
- channel_id: uuid
- order_ids: jsonb
- created_by: text
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- ... (11 columns)

### social_group_members

- id: uuid
- group_id: uuid
- user_id: uuid
- role: text?
- status: text?
- applied_at: timestamp with time zone?
- ... (7 columns)

### social_group_tags

- id: uuid
- group_id: uuid
- tag: text

### social_groups

- id: uuid
- title: text
- description: text?
- cover_image: text?
- category: text?
- location_name: text?
- ... (22 columns)

### syncqueue

- id: uuid
- table_name: character varying
- operation: character varying
- data: jsonb
- status: character varying?
- retry_count: integer?
- ... (9 columns)

### system_settings

- id: uuid
- category: text
- settings: jsonb
- description: text?
- is_active: boolean
- created_at: timestamp with time zone
- ... (8 columns)

### templates

- id: uuid
- name: character varying
- type: character varying
- category: character varying
- content: jsonb?
- preview: text?
- ... (9 columns)

### todos

- id: uuid
- title: text
- priority: integer
- deadline: timestamp with time zone?
- status: text
- completed: boolean?
- ... (20 columns)

### tour_addons

- id: text
- tour_id: text?
- name: text
- description: text?
- price: numeric?
- quantity: integer?
- ... (11 columns)

### tour_bonus_settings

- id: uuid
- workspace_id: uuid
- tour_id: text
- type: smallint
- bonus: numeric
- bonus_type: smallint
- ... (9 columns)

### tour_control_forms

- id: uuid
- package_id: uuid
- workspace_id: uuid
- form_data: jsonb
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?
- ... (8 columns)

### tour_custom_cost_fields

- id: uuid
- tour_id: text
- field_name: text
- display_order: integer?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### tour_custom_cost_values

- id: uuid
- field_id: uuid
- member_id: uuid
- value: text?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### tour_departure_data

- id: uuid
- tour_id: text
- flight_info: jsonb?
- hotel_info: jsonb?
- bus_info: jsonb?
- guide_info: jsonb?
- ... (12 columns)

### tour_destinations

- id: uuid
- country: text
- city: text
- airport_code: text
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### tour_documents

- id: uuid
- tour_id: text
- workspace_id: uuid
- name: text
- description: text?
- file_path: text
- ... (15 columns)

### tour_expenses

- expense_id: bigint
- itinerary_id: text
- leader_id: uuid
- actual_amount: numeric
- notes: text?
- created_at: timestamp with time zone?

### tour_folder_templates

- id: uuid
- workspace_id: uuid?
- name: text
- icon: text?
- default_category: USER-DEFINED?
- sort_order: integer?
- ... (8 columns)

### tour_leaders

- id: uuid
- code: character varying?
- name: character varying
- english_name: character varying?
- phone: character varying?
- email: character varying?
- ... (21 columns)

### tour_meal_settings

- id: uuid
- tour_id: text
- day_number: integer
- meal_type: text
- restaurant_name: text?
- enabled: boolean?
- ... (10 columns)

### tour_member_fields

- id: uuid
- tour_id: text
- order_member_id: uuid
- field_name: character varying
- field_value: text?
- display_order: integer?
- ... (8 columns)

### tour_refunds

- id: uuid
- tour_id: uuid?
- order_id: uuid?
- member_id: uuid?
- refund_reason: text
- refund_amount: numeric
- ... (12 columns)

### tour_request_items

- id: uuid
- request_id: uuid
- item_type: character varying
- day_number: integer?
- description: character varying
- quantity: integer?
- ... (15 columns)

### tour_request_member_vouchers

- id: uuid
- request_id: uuid
- member_id: uuid
- member_name: character varying?
- voucher_type: character varying
- voucher_code: character varying?
- ... (12 columns)

### tour_request_messages

- id: uuid
- request_id: uuid
- sender_type: character varying
- sender_id: uuid
- sender_name: character varying?
- content: text
- ... (17 columns)

### tour_request_payment_summary

- tour_request_id: uuid?
- tour_id: uuid?
- supplier_id: uuid?
- supplier_name: character varying?
- category: character varying?
- title: character varying?
- ... (10 columns)

### tour_requests

- id: uuid
- code: character varying
- tour_id: uuid?
- tour_code: character varying?
- tour_name: character varying?
- order_id: uuid?
- ... (67 columns)

### tour_requests_progress

- tour_id: uuid?
- tour_code: character varying?
- tour_name: character varying?
- workspace_id: uuid?
- total_requests: bigint?
- completed_requests: bigint?
- ... (10 columns)

### tour_room_assignments

- id: uuid
- room_id: uuid
- order_member_id: uuid
- bed_number: integer?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### tour_rooms

- id: uuid
- tour_id: text
- hotel_name: text?
- room_type: text
- room_number: text?
- capacity: integer
- ... (13 columns)

### tour_rooms_status

- id: uuid?
- tour_id: text?
- hotel_name: text?
- room_type: text?
- room_number: text?
- capacity: integer?
- ... (12 columns)

### tour_table_assignments

- id: uuid
- table_id: uuid
- order_member_id: uuid
- created_at: timestamp with time zone?

### tour_tables

- id: uuid
- tour_id: text
- meal_setting_id: uuid
- table_number: integer
- capacity: integer
- display_order: integer?
- ... (9 columns)

### tour_tables_status

- id: uuid?
- tour_id: text?
- meal_setting_id: uuid?
- table_number: integer?
- capacity: integer?
- display_order: integer?
- ... (12 columns)

### tour_vehicle_assignments

- id: uuid
- vehicle_id: uuid
- order_member_id: uuid
- seat_number: integer?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### tour_vehicles

- id: uuid
- tour_id: text
- vehicle_name: text
- vehicle_type: text?
- capacity: integer
- driver_name: text?
- ... (12 columns)

### tour_vehicles_status

- id: uuid?
- tour_id: text?
- vehicle_name: text?
- vehicle_type: text?
- capacity: integer?
- driver_name: text?
- ... (13 columns)

### transactions

- id: text
- type: text
- order_id: text?
- tour_id: text?
- amount: numeric
- description: text?
- ... (11 columns)

### travel_card_templates

- id: uuid
- category: text
- code: text
- icon: text
- label_zh: text
- translations: jsonb
- ... (9 columns)

### traveler_badges

- id: uuid
- user_id: uuid
- badge_type: text
- metadata: jsonb?
- earned_at: timestamp with time zone?

### traveler_conversation_members

- id: uuid
- conversation_id: uuid
- user_id: uuid
- role: text
- last_read_message_id: uuid?
- last_read_at: timestamp with time zone?
- ... (11 columns)

### traveler_conversations

- id: uuid
- type: text
- name: text?
- avatar_url: text?
- trip_id: uuid?
- split_group_id: uuid?
- ... (18 columns)

### traveler_expense_splits

- id: uuid
- expense_id: uuid
- user_id: uuid
- amount: numeric
- is_settled: boolean?
- settled_at: timestamp with time zone?

### traveler_expenses

- id: uuid
- trip_id: uuid?
- split_group_id: uuid?
- title: text
- description: text?
- category: text?
- ... (13 columns)

### traveler_friends

- id: uuid
- user_id: uuid
- friend_id: uuid
- status: text?
- invite_code: text?
- invite_message: text?
- ... (9 columns)

### traveler_messages

- id: uuid
- conversation_id: uuid
- sender_id: uuid
- content: text?
- type: text
- attachments: jsonb?
- ... (12 columns)

### traveler_profiles

- id: uuid
- full_name: text?
- display_name: text?
- username: text?
- avatar_url: text?
- phone: text?
- ... (22 columns)

### traveler_settlements

- id: uuid
- trip_id: uuid?
- split_group_id: uuid?
- from_user: uuid
- to_user: uuid
- amount: numeric
- ... (11 columns)

### traveler_split_group_members

- id: uuid
- group_id: uuid
- user_id: uuid?
- role: text?
- display_name: text?
- nickname: text?
- ... (8 columns)

### traveler_split_groups

- id: uuid
- name: text
- description: text?
- cover_image: text?
- trip_id: uuid?
- default_currency: text?
- ... (9 columns)

### traveler_tour_cache

- id: uuid
- traveler_id: uuid
- id_number: text
- tour_id: text
- tour_code: text
- tour_name: text?
- ... (26 columns)

### traveler_trip_accommodations

- id: uuid
- trip_id: uuid
- name: text
- address: text?
- phone: text?
- check_in_date: date?
- ... (15 columns)

### traveler_trip_briefings

- id: uuid
- trip_id: uuid
- title: text
- content: text?
- category: text?
- sort_order: integer?
- ... (8 columns)

### traveler_trip_invitations

- id: uuid
- trip_id: uuid
- inviter_id: uuid
- invitee_id: uuid?
- invite_code: text
- status: text?
- ... (9 columns)

### traveler_trip_members

- id: uuid
- trip_id: uuid
- user_id: uuid
- role: text?
- nickname: text?
- joined_at: timestamp with time zone?

### traveler_trips

- id: uuid
- title: text
- description: text?
- cover_image: text?
- start_date: date?
- end_date: date?
- ... (14 columns)

### trip_members

- id: uuid
- assigned_itinerary_id: uuid
- customer_id: text?
- app_user_id: text?
- name: text
- email: text?
- ... (12 columns)

### trip_members_v2

- id: uuid
- assigned_itinerary_id: uuid
- customer_id: uuid
- role: text
- joined_at: timestamp with time zone
- visa_status: text?
- ... (25 columns)

### usa_esta

- id: uuid
- workspace_id: uuid
- tour_id: text?
- order_id: text?
- customer_id: text?
- application_code: text
- ... (100 columns)

### user_badges

- id: uuid
- user_id: uuid
- badge_id: uuid
- awarded_at: timestamp with time zone?

### user_points_transactions

- id: uuid
- user_id: text
- points_change: integer
- transaction_type: text
- description: text?
- reference_id: uuid?
- ... (7 columns)

### user_preferences

- id: uuid
- user_id: uuid
- preference_key: text
- preference_value: jsonb
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### user_roles

- id: uuid
- user_id: uuid
- role: text
- permissions: ARRAY?
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### vendor_costs

- id: uuid
- vendor_name: text
- visa_type: text
- cost: numeric
- created_at: timestamp with time zone?
- updated_at: timestamp with time zone?

### voucher_entries

- id: uuid
- voucher_id: uuid
- entry_no: integer
- subject_id: uuid
- debit: numeric?
- credit: numeric?
- ... (8 columns)

### vouchers

- id: uuid
- workspace_id: uuid
- voucher_no: character varying
- voucher_date: date
- type: character varying
- source_type: character varying?
- ... (20 columns)
