# 資料庫使用索引

**掃描時間**: 2026-03-14 10:38

## 資料表使用統計

- `order_members`: 51 次
- `tours`: 46 次
- `orders`: 37 次
- `quotes`: 28 次
- `itineraries`: 24 次
- `tour_itinerary_items`: 21 次
- `tour_requests`: 20 次
- `payment_requests`: 16 次
- `customers`: 14 次
- `tour_rooms`: 12 次
- `tour_room_assignments`: 12 次
- `payroll_periods`: 11 次
- `payment_request_items`: 11 次
- `tour_confirmation_sheets`: 10 次
- `company_assets`: 10 次
- `disbursement_orders`: 9 次
- `workspaces`: 8 次
- `tour_confirmation_items`: 8 次
- `pnrs`: 8 次
- `passport-images`: 8 次
- `company-assets`: 8 次
- `channels`: 8 次
- `workspace-files`: 7 次
- `office_documents`: 7 次
- `leave_requests`: 7 次
- `files`: 7 次
- `employees`: 7 次
- `attendance_records`: 7 次
- `receipts`: 5 次
- `payroll_records`: 5 次
- `leave_types`: 5 次
- `countries`: 5 次
- `brochure_documents`: 5 次
- `tour_destinations`: 4 次
- `leave_balances`: 4 次
- `documents`: 4 次
- `company_asset_folders`: 4 次
- `brochure_versions`: 4 次
- `tour_vehicle_assignments`: 3 次
- `ref_airports`: 3 次
- `online_trips`: 3 次
- `online_trip_members`: 3 次
- `notes`: 3 次
- `michelin_restaurants`: 3 次
- `channel_members`: 3 次
- `user_preferences`: 2 次
- `tour_vehicles_status`: 2 次
- `tour_vehicles`: 2 次
- `tour_rooms_status`: 2 次
- `tour_meal_settings`: 2 次

## 核心表相關

### tour_itinerary_items (21 次使用)

confirmations/services/requestCoreTableSync.ts →
quotes/hooks/useQuoteSave.ts →
quotes/utils/core-table-adapter.ts →
tour-confirmation/services/confirmationCoreTableSync.ts →
tours/components/CoreTableRequestDialog.tsx →
tours/hooks/useCoreRequestItems.ts →
tours/hooks/useTourHealth.ts →
tours/hooks/useTourItineraryItems.ts →
tours/services/tour_dependency.service.ts →

### tours (46 次使用)

confirmations/components/RequirementsList.tsx →
confirmations/components/hooks/useRequirementsData.ts →
design/components/TourItinerarySelector.tsx →
design/hooks/useDesigns.ts →
designer/components/DesignTypeSelector.tsx →
designer/components/TemplateSelector.tsx →
finance/payments/services/expense-core.service.ts →
finance/payments/services/receipt-core.service.ts →
finance/reports/hooks/useUnclosedTours.ts →
game-office/components/LeftPanel.tsx →
game-office/components/RightPanel.tsx →
orders/components/OrderMembersExpandable.tsx →
orders/hooks/useOrderMembers.ts →
orders/hooks/useOrderMembersData.ts →
orders/services/order-stats.service.ts →
tour-confirmation/hooks/useSheetItemActions.ts →
tour-confirmation/services/syncToOnline.ts →
tours/components/TourConfirmationWizard.tsx →
tours/components/assignment-tabs/TourTableTab.tsx →
tours/components/tour-checkin/index.tsx →

### quotes (28 次使用)

confirmations/components/RequirementsList.tsx →
confirmations/components/hooks/useRequirementsData.ts →
quotes/services/quoteItinerarySync.ts →
tour-confirmation/hooks/useTourSheetData.ts →
tour-documents/services/create-request-from-quote.service.ts →
tours/components/LinkDocumentsToTourDialog.tsx →
tours/components/TourConfirmationWizard.tsx →
tours/components/TourFilesManager.tsx →
tours/components/TourFilesTree.tsx →
tours/components/tour-quick-quote-tab.tsx →
tours/components/tour-quote-tab.tsx →
tours/hooks/useQuoteLoader.ts →
tours/services/tour_dependency.service.ts →

### orders (37 次使用)

esims/components/EsimCreateDialog.tsx →
finance/payments/components/AddReceiptDialog.tsx →
finance/payments/services/receipt-core.service.ts →
game-office/components/LeftPanel.tsx →
game-office/components/RightPanel.tsx →
orders/hooks/useOrderMembers.ts →
orders/hooks/useOrderMembersData.ts →
orders/hooks/usePassportUpload.ts →
orders/services/order-stats.service.ts →
tour-confirmation/hooks/useTourSheetData.ts →
tour-confirmation/services/syncToOnline.ts →
tours/components/pnr-tool/TourPnrToolDialog.tsx →
tours/components/tour-checkin/index.tsx →
tours/components/tour-orders.tsx →
tours/hooks/useCoreRequestItems.ts →
tours/hooks/useTourHealth.ts →
tours/hooks/useTourPayments.ts →
tours/hooks/useTours-advanced.ts →
tours/services/tour-stats.service.ts →
tours/services/tour_dependency.service.ts →

### tour_requests (20 次使用)

confirmations/components/RequirementsList.tsx →
confirmations/components/hooks/useRequirementsData.ts →
finance/requests/hooks/useTourRequestItems.ts →
scheduling/components/SchedulingPage.tsx →
supplier/components/SupplierDispatchPage.tsx →
supplier/components/SupplierResponseDialog.tsx →
supplier/hooks/useSupplierRequests.ts →
tour-confirmation/hooks/useTourSheetData.ts →
tours/components/TourFilesManager.tsx →
tours/components/TourFilesTree.tsx →
tours/components/TourRequestFormDialog.tsx →
tours/hooks/useTourHealth.ts →

### confirmations (0 次使用)


### payments (0 次使用)


