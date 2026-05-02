-- ============================================================================
-- RLS Rewrite Preview (DRY-RUN、不要直接 apply)
-- 從 MODULES + capability-derivation.tableToModule 自動推算
-- 產出標準 4-policy（platform_admin_all + tenant_read + tenant_write）
-- William 拍板「跑」之後存成 migration apply
-- ============================================================================

-- accounting_accounts → accounting
DROP POLICY IF EXISTS "platform_admin_all" ON public.accounting_accounts;
DROP POLICY IF EXISTS "tenant_read" ON public.accounting_accounts;
DROP POLICY IF EXISTS "tenant_write" ON public.accounting_accounts;
CREATE POLICY "platform_admin_all" ON public.accounting_accounts FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.accounting_accounts FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.read'));
CREATE POLICY "tenant_write" ON public.accounting_accounts FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.write'));

-- accounting_period_closings → accounting
DROP POLICY IF EXISTS "platform_admin_all" ON public.accounting_period_closings;
DROP POLICY IF EXISTS "tenant_read" ON public.accounting_period_closings;
DROP POLICY IF EXISTS "tenant_write" ON public.accounting_period_closings;
CREATE POLICY "platform_admin_all" ON public.accounting_period_closings FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.accounting_period_closings FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.read'));
CREATE POLICY "tenant_write" ON public.accounting_period_closings FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.write'));

-- accounting_transactions → accounting
DROP POLICY IF EXISTS "platform_admin_all" ON public.accounting_transactions;
DROP POLICY IF EXISTS "tenant_read" ON public.accounting_transactions;
DROP POLICY IF EXISTS "tenant_write" ON public.accounting_transactions;
CREATE POLICY "platform_admin_all" ON public.accounting_transactions FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.accounting_transactions FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.read'));
CREATE POLICY "tenant_write" ON public.accounting_transactions FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.write'));

-- airport_images → database
DROP POLICY IF EXISTS "platform_admin_all" ON public.airport_images;
DROP POLICY IF EXISTS "tenant_read" ON public.airport_images;
DROP POLICY IF EXISTS "tenant_write" ON public.airport_images;
CREATE POLICY "platform_admin_all" ON public.airport_images FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.airport_images FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.read'));
CREATE POLICY "tenant_write" ON public.airport_images FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.write'));

-- attractions → database.attractions
DROP POLICY IF EXISTS "platform_admin_all" ON public.attractions;
DROP POLICY IF EXISTS "tenant_read" ON public.attractions;
DROP POLICY IF EXISTS "tenant_write" ON public.attractions;
CREATE POLICY "platform_admin_all" ON public.attractions FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.attractions FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.attractions.read'));
CREATE POLICY "tenant_write" ON public.attractions FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.attractions.write'));

-- bank_accounts → finance
DROP POLICY IF EXISTS "platform_admin_all" ON public.bank_accounts;
DROP POLICY IF EXISTS "tenant_read" ON public.bank_accounts;
DROP POLICY IF EXISTS "tenant_write" ON public.bank_accounts;
CREATE POLICY "platform_admin_all" ON public.bank_accounts FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.bank_accounts FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.read'));
CREATE POLICY "tenant_write" ON public.bank_accounts FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.write'));

-- bulletins → office
DROP POLICY IF EXISTS "platform_admin_all" ON public.bulletins;
DROP POLICY IF EXISTS "tenant_read" ON public.bulletins;
DROP POLICY IF EXISTS "tenant_write" ON public.bulletins;
CREATE POLICY "platform_admin_all" ON public.bulletins FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.bulletins FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'office.read'));
CREATE POLICY "tenant_write" ON public.bulletins FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'office.write'));

-- calendar_events → calendar
DROP POLICY IF EXISTS "platform_admin_all" ON public.calendar_events;
DROP POLICY IF EXISTS "tenant_read" ON public.calendar_events;
DROP POLICY IF EXISTS "tenant_write" ON public.calendar_events;
CREATE POLICY "platform_admin_all" ON public.calendar_events FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.calendar_events FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'calendar.read'));
CREATE POLICY "tenant_write" ON public.calendar_events FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'calendar.write'));

-- chart_of_accounts → accounting
DROP POLICY IF EXISTS "platform_admin_all" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "tenant_read" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "tenant_write" ON public.chart_of_accounts;
CREATE POLICY "platform_admin_all" ON public.chart_of_accounts FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.chart_of_accounts FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.read'));
CREATE POLICY "tenant_write" ON public.chart_of_accounts FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.write'));

-- checks → accounting
DROP POLICY IF EXISTS "platform_admin_all" ON public.checks;
DROP POLICY IF EXISTS "tenant_read" ON public.checks;
DROP POLICY IF EXISTS "tenant_write" ON public.checks;
CREATE POLICY "platform_admin_all" ON public.checks FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.checks FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.read'));
CREATE POLICY "tenant_write" ON public.checks FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.write'));

-- cities → database
DROP POLICY IF EXISTS "platform_admin_all" ON public.cities;
DROP POLICY IF EXISTS "tenant_read" ON public.cities;
DROP POLICY IF EXISTS "tenant_write" ON public.cities;
CREATE POLICY "platform_admin_all" ON public.cities FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.cities FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.read'));
CREATE POLICY "tenant_write" ON public.cities FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.write'));

-- contracts → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.contracts;
DROP POLICY IF EXISTS "tenant_read" ON public.contracts;
DROP POLICY IF EXISTS "tenant_write" ON public.contracts;
CREATE POLICY "platform_admin_all" ON public.contracts FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.contracts FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.contracts FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- cost_templates → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.cost_templates;
DROP POLICY IF EXISTS "tenant_read" ON public.cost_templates;
DROP POLICY IF EXISTS "tenant_write" ON public.cost_templates;
CREATE POLICY "platform_admin_all" ON public.cost_templates FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.cost_templates FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.cost_templates FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- countries → database
DROP POLICY IF EXISTS "platform_admin_all" ON public.countries;
DROP POLICY IF EXISTS "tenant_read" ON public.countries;
DROP POLICY IF EXISTS "tenant_write" ON public.countries;
CREATE POLICY "platform_admin_all" ON public.countries FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.countries FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.read'));
CREATE POLICY "tenant_write" ON public.countries FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.write'));

-- customers → database.customers
DROP POLICY IF EXISTS "platform_admin_all" ON public.customers;
DROP POLICY IF EXISTS "tenant_read" ON public.customers;
DROP POLICY IF EXISTS "tenant_write" ON public.customers;
CREATE POLICY "platform_admin_all" ON public.customers FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.customers FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.customers.read'));
CREATE POLICY "tenant_write" ON public.customers FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.customers.write'));

-- disbursement_orders → finance
DROP POLICY IF EXISTS "platform_admin_all" ON public.disbursement_orders;
DROP POLICY IF EXISTS "tenant_read" ON public.disbursement_orders;
DROP POLICY IF EXISTS "tenant_write" ON public.disbursement_orders;
CREATE POLICY "platform_admin_all" ON public.disbursement_orders FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.disbursement_orders FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.read'));
CREATE POLICY "tenant_write" ON public.disbursement_orders FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.write'));

-- employees → hr
DROP POLICY IF EXISTS "platform_admin_all" ON public.employees;
DROP POLICY IF EXISTS "tenant_read" ON public.employees;
DROP POLICY IF EXISTS "tenant_write" ON public.employees;
CREATE POLICY "platform_admin_all" ON public.employees FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.employees FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'hr.read'));
CREATE POLICY "tenant_write" ON public.employees FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'hr.write'));

-- expense_categories → finance
DROP POLICY IF EXISTS "platform_admin_all" ON public.expense_categories;
DROP POLICY IF EXISTS "tenant_read" ON public.expense_categories;
DROP POLICY IF EXISTS "tenant_write" ON public.expense_categories;
CREATE POLICY "platform_admin_all" ON public.expense_categories FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.expense_categories FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.read'));
CREATE POLICY "tenant_write" ON public.expense_categories FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.write'));

-- hotels → database
DROP POLICY IF EXISTS "platform_admin_all" ON public.hotels;
DROP POLICY IF EXISTS "tenant_read" ON public.hotels;
DROP POLICY IF EXISTS "tenant_write" ON public.hotels;
CREATE POLICY "platform_admin_all" ON public.hotels FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.hotels FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.read'));
CREATE POLICY "tenant_write" ON public.hotels FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.write'));

-- image_library → database
DROP POLICY IF EXISTS "platform_admin_all" ON public.image_library;
DROP POLICY IF EXISTS "tenant_read" ON public.image_library;
DROP POLICY IF EXISTS "tenant_write" ON public.image_library;
CREATE POLICY "platform_admin_all" ON public.image_library FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.image_library FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.read'));
CREATE POLICY "tenant_write" ON public.image_library FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.write'));

-- itineraries → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.itineraries;
DROP POLICY IF EXISTS "tenant_read" ON public.itineraries;
DROP POLICY IF EXISTS "tenant_write" ON public.itineraries;
CREATE POLICY "platform_admin_all" ON public.itineraries FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.itineraries FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.itineraries FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- journal_lines → accounting
DROP POLICY IF EXISTS "platform_admin_all" ON public.journal_lines;
DROP POLICY IF EXISTS "tenant_read" ON public.journal_lines;
DROP POLICY IF EXISTS "tenant_write" ON public.journal_lines;
CREATE POLICY "platform_admin_all" ON public.journal_lines FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.journal_lines FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.read'));
CREATE POLICY "tenant_write" ON public.journal_lines FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.write'));

-- journal_vouchers → accounting
DROP POLICY IF EXISTS "platform_admin_all" ON public.journal_vouchers;
DROP POLICY IF EXISTS "tenant_read" ON public.journal_vouchers;
DROP POLICY IF EXISTS "tenant_write" ON public.journal_vouchers;
CREATE POLICY "platform_admin_all" ON public.journal_vouchers FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.journal_vouchers FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.read'));
CREATE POLICY "tenant_write" ON public.journal_vouchers FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'accounting.write'));

-- knowledge_base → office
DROP POLICY IF EXISTS "platform_admin_all" ON public.knowledge_base;
DROP POLICY IF EXISTS "tenant_read" ON public.knowledge_base;
DROP POLICY IF EXISTS "tenant_write" ON public.knowledge_base;
CREATE POLICY "platform_admin_all" ON public.knowledge_base FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.knowledge_base FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'office.read'));
CREATE POLICY "tenant_write" ON public.knowledge_base FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'office.write'));

-- leader_availability → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.leader_availability;
DROP POLICY IF EXISTS "tenant_read" ON public.leader_availability;
DROP POLICY IF EXISTS "tenant_write" ON public.leader_availability;
CREATE POLICY "platform_admin_all" ON public.leader_availability FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.leader_availability FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.leader_availability FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- linkpay_logs → finance
DROP POLICY IF EXISTS "platform_admin_all" ON public.linkpay_logs;
DROP POLICY IF EXISTS "tenant_read" ON public.linkpay_logs;
DROP POLICY IF EXISTS "tenant_write" ON public.linkpay_logs;
CREATE POLICY "platform_admin_all" ON public.linkpay_logs FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.linkpay_logs FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.read'));
CREATE POLICY "tenant_write" ON public.linkpay_logs FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.write'));

-- michelin_restaurants → database
DROP POLICY IF EXISTS "platform_admin_all" ON public.michelin_restaurants;
DROP POLICY IF EXISTS "tenant_read" ON public.michelin_restaurants;
DROP POLICY IF EXISTS "tenant_write" ON public.michelin_restaurants;
CREATE POLICY "platform_admin_all" ON public.michelin_restaurants FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.michelin_restaurants FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.read'));
CREATE POLICY "tenant_write" ON public.michelin_restaurants FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.write'));

-- notes → office
DROP POLICY IF EXISTS "platform_admin_all" ON public.notes;
DROP POLICY IF EXISTS "tenant_read" ON public.notes;
DROP POLICY IF EXISTS "tenant_write" ON public.notes;
CREATE POLICY "platform_admin_all" ON public.notes FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.notes FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'office.read'));
CREATE POLICY "tenant_write" ON public.notes FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'office.write'));

-- order_members → orders
DROP POLICY IF EXISTS "platform_admin_all" ON public.order_members;
DROP POLICY IF EXISTS "tenant_read" ON public.order_members;
DROP POLICY IF EXISTS "tenant_write" ON public.order_members;
CREATE POLICY "platform_admin_all" ON public.order_members FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.order_members FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'orders.read'));
CREATE POLICY "tenant_write" ON public.order_members FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'orders.write'));

-- orders → orders
DROP POLICY IF EXISTS "platform_admin_all" ON public.orders;
DROP POLICY IF EXISTS "tenant_read" ON public.orders;
DROP POLICY IF EXISTS "tenant_write" ON public.orders;
CREATE POLICY "platform_admin_all" ON public.orders FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.orders FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'orders.read'));
CREATE POLICY "tenant_write" ON public.orders FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'orders.write'));

-- payment_methods → finance
DROP POLICY IF EXISTS "platform_admin_all" ON public.payment_methods;
DROP POLICY IF EXISTS "tenant_read" ON public.payment_methods;
DROP POLICY IF EXISTS "tenant_write" ON public.payment_methods;
CREATE POLICY "platform_admin_all" ON public.payment_methods FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.payment_methods FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.read'));
CREATE POLICY "tenant_write" ON public.payment_methods FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.write'));

-- payment_request_items → finance
DROP POLICY IF EXISTS "platform_admin_all" ON public.payment_request_items;
DROP POLICY IF EXISTS "tenant_read" ON public.payment_request_items;
DROP POLICY IF EXISTS "tenant_write" ON public.payment_request_items;
CREATE POLICY "platform_admin_all" ON public.payment_request_items FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.payment_request_items FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.read'));
CREATE POLICY "tenant_write" ON public.payment_request_items FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.write'));

-- payment_requests → finance
DROP POLICY IF EXISTS "platform_admin_all" ON public.payment_requests;
DROP POLICY IF EXISTS "tenant_read" ON public.payment_requests;
DROP POLICY IF EXISTS "tenant_write" ON public.payment_requests;
CREATE POLICY "platform_admin_all" ON public.payment_requests FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.payment_requests FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.read'));
CREATE POLICY "tenant_write" ON public.payment_requests FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.write'));

-- premium_experiences → database
DROP POLICY IF EXISTS "platform_admin_all" ON public.premium_experiences;
DROP POLICY IF EXISTS "tenant_read" ON public.premium_experiences;
DROP POLICY IF EXISTS "tenant_write" ON public.premium_experiences;
CREATE POLICY "platform_admin_all" ON public.premium_experiences FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.premium_experiences FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.read'));
CREATE POLICY "tenant_write" ON public.premium_experiences FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.write'));

-- quotes → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.quotes;
DROP POLICY IF EXISTS "tenant_read" ON public.quotes;
DROP POLICY IF EXISTS "tenant_write" ON public.quotes;
CREATE POLICY "platform_admin_all" ON public.quotes FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.quotes FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.quotes FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- receipts → finance
DROP POLICY IF EXISTS "platform_admin_all" ON public.receipts;
DROP POLICY IF EXISTS "tenant_read" ON public.receipts;
DROP POLICY IF EXISTS "tenant_write" ON public.receipts;
CREATE POLICY "platform_admin_all" ON public.receipts FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.receipts FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.read'));
CREATE POLICY "tenant_write" ON public.receipts FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.write'));

-- regions → database
DROP POLICY IF EXISTS "platform_admin_all" ON public.regions;
DROP POLICY IF EXISTS "tenant_read" ON public.regions;
DROP POLICY IF EXISTS "tenant_write" ON public.regions;
CREATE POLICY "platform_admin_all" ON public.regions FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.regions FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.read'));
CREATE POLICY "tenant_write" ON public.regions FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.write'));

-- restaurants → database
DROP POLICY IF EXISTS "platform_admin_all" ON public.restaurants;
DROP POLICY IF EXISTS "tenant_read" ON public.restaurants;
DROP POLICY IF EXISTS "tenant_write" ON public.restaurants;
CREATE POLICY "platform_admin_all" ON public.restaurants FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.restaurants FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.read'));
CREATE POLICY "tenant_write" ON public.restaurants FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.write'));

-- rich_documents → office
DROP POLICY IF EXISTS "platform_admin_all" ON public.rich_documents;
DROP POLICY IF EXISTS "tenant_read" ON public.rich_documents;
DROP POLICY IF EXISTS "tenant_write" ON public.rich_documents;
CREATE POLICY "platform_admin_all" ON public.rich_documents FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.rich_documents FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'office.read'));
CREATE POLICY "tenant_write" ON public.rich_documents FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'office.write'));

-- supplier_categories → database.suppliers
DROP POLICY IF EXISTS "platform_admin_all" ON public.supplier_categories;
DROP POLICY IF EXISTS "tenant_read" ON public.supplier_categories;
DROP POLICY IF EXISTS "tenant_write" ON public.supplier_categories;
CREATE POLICY "platform_admin_all" ON public.supplier_categories FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.supplier_categories FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.suppliers.read'));
CREATE POLICY "tenant_write" ON public.supplier_categories FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.suppliers.write'));

-- suppliers → database.suppliers
DROP POLICY IF EXISTS "platform_admin_all" ON public.suppliers;
DROP POLICY IF EXISTS "tenant_read" ON public.suppliers;
DROP POLICY IF EXISTS "tenant_write" ON public.suppliers;
CREATE POLICY "platform_admin_all" ON public.suppliers FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.suppliers FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.suppliers.read'));
CREATE POLICY "tenant_write" ON public.suppliers FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.suppliers.write'));

-- tasks → todos
DROP POLICY IF EXISTS "platform_admin_all" ON public.tasks;
DROP POLICY IF EXISTS "tenant_read" ON public.tasks;
DROP POLICY IF EXISTS "tenant_write" ON public.tasks;
CREATE POLICY "platform_admin_all" ON public.tasks FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tasks FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'todos.read'));
CREATE POLICY "tenant_write" ON public.tasks FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'todos.write'));

-- todo_columns → todos
DROP POLICY IF EXISTS "platform_admin_all" ON public.todo_columns;
DROP POLICY IF EXISTS "tenant_read" ON public.todo_columns;
DROP POLICY IF EXISTS "tenant_write" ON public.todo_columns;
CREATE POLICY "platform_admin_all" ON public.todo_columns FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.todo_columns FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'todos.read'));
CREATE POLICY "tenant_write" ON public.todo_columns FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'todos.write'));

-- todos → todos
DROP POLICY IF EXISTS "platform_admin_all" ON public.todos;
DROP POLICY IF EXISTS "tenant_read" ON public.todos;
DROP POLICY IF EXISTS "tenant_write" ON public.todos;
CREATE POLICY "platform_admin_all" ON public.todos FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.todos FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'todos.read'));
CREATE POLICY "tenant_write" ON public.todos FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'todos.write'));

-- tour_custom_cost_fields → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.tour_custom_cost_fields;
DROP POLICY IF EXISTS "tenant_read" ON public.tour_custom_cost_fields;
DROP POLICY IF EXISTS "tenant_write" ON public.tour_custom_cost_fields;
CREATE POLICY "platform_admin_all" ON public.tour_custom_cost_fields FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tour_custom_cost_fields FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.tour_custom_cost_fields FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- tour_departure_data → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.tour_departure_data;
DROP POLICY IF EXISTS "tenant_read" ON public.tour_departure_data;
DROP POLICY IF EXISTS "tenant_write" ON public.tour_departure_data;
CREATE POLICY "platform_admin_all" ON public.tour_departure_data FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tour_departure_data FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.tour_departure_data FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- tour_destinations → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.tour_destinations;
DROP POLICY IF EXISTS "tenant_read" ON public.tour_destinations;
DROP POLICY IF EXISTS "tenant_write" ON public.tour_destinations;
CREATE POLICY "platform_admin_all" ON public.tour_destinations FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tour_destinations FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.tour_destinations FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- tour_documents → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.tour_documents;
DROP POLICY IF EXISTS "tenant_read" ON public.tour_documents;
DROP POLICY IF EXISTS "tenant_write" ON public.tour_documents;
CREATE POLICY "platform_admin_all" ON public.tour_documents FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tour_documents FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.tour_documents FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- tour_itinerary_items → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.tour_itinerary_items;
DROP POLICY IF EXISTS "tenant_read" ON public.tour_itinerary_items;
DROP POLICY IF EXISTS "tenant_write" ON public.tour_itinerary_items;
CREATE POLICY "platform_admin_all" ON public.tour_itinerary_items FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tour_itinerary_items FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.tour_itinerary_items FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- tour_leaders → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.tour_leaders;
DROP POLICY IF EXISTS "tenant_read" ON public.tour_leaders;
DROP POLICY IF EXISTS "tenant_write" ON public.tour_leaders;
CREATE POLICY "platform_admin_all" ON public.tour_leaders FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tour_leaders FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.tour_leaders FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- tour_meal_settings → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "tenant_read" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "tenant_write" ON public.tour_meal_settings;
CREATE POLICY "platform_admin_all" ON public.tour_meal_settings FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tour_meal_settings FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.tour_meal_settings FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- tour_member_fields → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.tour_member_fields;
DROP POLICY IF EXISTS "tenant_read" ON public.tour_member_fields;
DROP POLICY IF EXISTS "tenant_write" ON public.tour_member_fields;
CREATE POLICY "platform_admin_all" ON public.tour_member_fields FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tour_member_fields FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.tour_member_fields FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- tour_role_assignments → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.tour_role_assignments;
DROP POLICY IF EXISTS "tenant_read" ON public.tour_role_assignments;
DROP POLICY IF EXISTS "tenant_write" ON public.tour_role_assignments;
CREATE POLICY "platform_admin_all" ON public.tour_role_assignments FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tour_role_assignments FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.tour_role_assignments FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- tours → tours
DROP POLICY IF EXISTS "platform_admin_all" ON public.tours;
DROP POLICY IF EXISTS "tenant_read" ON public.tours;
DROP POLICY IF EXISTS "tenant_write" ON public.tours;
CREATE POLICY "platform_admin_all" ON public.tours FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.tours FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.read'));
CREATE POLICY "tenant_write" ON public.tours FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'tours.write'));

-- transportation_rates → database
DROP POLICY IF EXISTS "platform_admin_all" ON public.transportation_rates;
DROP POLICY IF EXISTS "tenant_read" ON public.transportation_rates;
DROP POLICY IF EXISTS "tenant_write" ON public.transportation_rates;
CREATE POLICY "platform_admin_all" ON public.transportation_rates FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.transportation_rates FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.read'));
CREATE POLICY "tenant_write" ON public.transportation_rates FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'database.write'));

-- travel_invoices → finance
DROP POLICY IF EXISTS "platform_admin_all" ON public.travel_invoices;
DROP POLICY IF EXISTS "tenant_read" ON public.travel_invoices;
DROP POLICY IF EXISTS "tenant_write" ON public.travel_invoices;
CREATE POLICY "platform_admin_all" ON public.travel_invoices FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.travel_invoices FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.read'));
CREATE POLICY "tenant_write" ON public.travel_invoices FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.write'));

-- vendor_costs → finance
DROP POLICY IF EXISTS "platform_admin_all" ON public.vendor_costs;
DROP POLICY IF EXISTS "tenant_read" ON public.vendor_costs;
DROP POLICY IF EXISTS "tenant_write" ON public.vendor_costs;
CREATE POLICY "platform_admin_all" ON public.vendor_costs FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.vendor_costs FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.read'));
CREATE POLICY "tenant_write" ON public.vendor_costs FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'finance.write'));

-- visas → visas
DROP POLICY IF EXISTS "platform_admin_all" ON public.visas;
DROP POLICY IF EXISTS "tenant_read" ON public.visas;
DROP POLICY IF EXISTS "tenant_write" ON public.visas;
CREATE POLICY "platform_admin_all" ON public.visas FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.visas FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'visas.read'));
CREATE POLICY "tenant_write" ON public.visas FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'visas.write'));

-- workspace_attendance_settings → hr
DROP POLICY IF EXISTS "platform_admin_all" ON public.workspace_attendance_settings;
DROP POLICY IF EXISTS "tenant_read" ON public.workspace_attendance_settings;
DROP POLICY IF EXISTS "tenant_write" ON public.workspace_attendance_settings;
CREATE POLICY "platform_admin_all" ON public.workspace_attendance_settings FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.workspace_attendance_settings FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'hr.read'));
CREATE POLICY "tenant_write" ON public.workspace_attendance_settings FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'hr.write'));

-- workspace_roles → hr
DROP POLICY IF EXISTS "platform_admin_all" ON public.workspace_roles;
DROP POLICY IF EXISTS "tenant_read" ON public.workspace_roles;
DROP POLICY IF EXISTS "tenant_write" ON public.workspace_roles;
CREATE POLICY "platform_admin_all" ON public.workspace_roles FOR ALL TO authenticated USING (is_super_admin());
CREATE POLICY "tenant_read" ON public.workspace_roles FOR SELECT TO authenticated USING (has_capability_for_workspace(workspace_id, 'hr.read'));
CREATE POLICY "tenant_write" ON public.workspace_roles FOR ALL TO authenticated USING (has_capability_for_workspace(workspace_id, 'hr.write'));

-- ============================================================================
-- 統計：96 張表 RLS 開、60 對應到業務 module、36 未對應
-- 未對應（系統 / 平台 / 模糊、保持現狀不重寫）：
--   ai_conversations
--   ai_memories
--   ai_settings
--   api_usage
--   background_tasks
--   companies
--   company_announcements
--   company_contacts
--   cron_execution_logs
--   cron_heartbeats
--   customer_service_conversations
--   flight_status_subscriptions
--   line_conversations
--   line_groups
--   line_messages
--   line_users
--   notifications
--   pnr_records
--   profiles
--   quote_confirmation_logs
--   rate_limits
--   ref_cities
--   ref_countries
--   ref_destinations
--   request_response_items
--   request_responses
--   role_capabilities
--   selector_field_roles
--   user_preferences
--   webhook_idempotency_keys
--   workspace_countries
--   workspace_features
--   workspace_line_config
--   workspace_meta_config
--   workspace_selector_fields
--   workspaces
-- ============================================================================
