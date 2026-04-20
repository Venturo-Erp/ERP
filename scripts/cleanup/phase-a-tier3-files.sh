#!/bin/bash
# ============================================================================
# Venturo Cleanup Phase A · Tier 3 — GitNexus cypher 批次驗證 refs=0
# Generated: 2026-04-18 凌晨
# Source: CLEANUP_TIER3_VERIFIED.md；6 批 cypher query 驗證
# Impact: ~140 dead files（扣除 Tier 1+2 已處理的、扣除 refs>0 的）
# Risk: 中-低（GitNexus 0 inbound refs 驗證過、但數量大）
# Prerequisite: 建議先跑完 tier1 + tier2 + type-check 綠燈 + 手動驗核心 3 頁
# ============================================================================

set -e
cd "$(dirname "$0")/../.."
pwd

echo ""
echo "=== Phase A Tier 3: GitNexus 驗證 refs=0 檔案刪除 ==="
echo ""
echo "⚠️ 前提：Tier 1 + Tier 2 已完成 + commit + 系統穩定"
read -p "前提滿足？(yes/no) " ans
[ "$ans" != "yes" ] && { echo "取消"; exit 1; }

# ------------------------------------------
# Section 1: src/hooks/ 下 dead hooks
# ------------------------------------------
echo ""
echo "--- hooks/ (7 檔 refs=0) ---"
git rm -f src/hooks/pnrCloudHooks.ts || true
git rm -f src/hooks/useAccountingModule.ts || true
git rm -f src/hooks/useDataTable.tsx || true
git rm -f src/hooks/useLogan.ts || true
git rm -f src/hooks/useSupplierWorkspaces.ts || true
# useGlobalData、useMemberActions、useMembers 有 1-2 refs、先留

# ------------------------------------------
# Section 2: src/lib/ 下
# ------------------------------------------
echo ""
echo "--- lib/ (17 檔 refs=0) ---"
git rm -f src/lib/api-utils.ts || true
git rm -f src/lib/auth-guard.tsx || true
git rm -f src/lib/form-utils.ts || true
git rm -f src/lib/request-dedup.ts || true
git rm -f src/lib/task-templates.ts || true
git rm -f src/lib/api/fetch-helper.ts || true
git rm -f src/lib/api/with-auth.ts || true
git rm -rf src/lib/data || true   # customers/tours/orders/quotes/messages/index 等都 0 ref
git rm -f src/lib/constants/airline-baggage.ts || true
git rm -f src/lib/constants/labels.ts || true
git rm -f src/lib/db/seed-regions.ts || true
git rm -rf src/lib/design-tokens || true
git rm -f src/lib/excel/receipt-excel.ts || true
git rm -f src/lib/i18n/server.ts || true
git rm -f src/lib/linkpay/index.ts || true
git rm -f src/lib/meeting/ai-endpoints.ts || true
git rm -f src/lib/navigation/index.ts || true
git rm -f src/lib/pdf/receipt-pdf.ts || true
git rm -f src/lib/storage/bucket-config.ts || true
git rm -rf src/lib/ui || true
git rm -f src/lib/utils/employee-filters.ts || true
git rm -f src/lib/utils/send-notification.ts || true
git rm -f src/lib/utils/tour-file-save.ts || true
git rm -f src/lib/utils/tour-folders.ts || true
git rm -f src/lib/utils/tour-status-updater.ts || true
# lib/monitoring/error-tracker.ts 有 10 refs、先留待人工確認
# lib/plugins/types.ts 有 2 refs、先留
git rm -f src/lib/plugins/plugin-manager.ts || true
git rm -f src/lib/plugins/plugin-registry.ts || true
git rm -f src/lib/plugins/index.ts || true

# ------------------------------------------
# Section 3: src/components/ 下
# ------------------------------------------
echo ""
echo "--- components/ (≈18 檔) ---"
git rm -rf src/components/designer || true  # CollapsiblePanel/DesignerSidebar/UnifiedImageEditor/index 全 0 ref
git rm -f src/components/customers/customer-search-dialog.tsx || true
git rm -f src/components/customers/constants/labels.ts || true
git rm -f src/components/designer/constants/labels.ts || true
git rm -f src/components/documents/TimelineItineraryPreview.tsx || true
git rm -f src/components/editor/ImageLibrarySelector.tsx || true
git rm -f src/components/mobile/index.ts || true
git rm -f src/components/print/PrintButton.tsx || true
git rm -f src/components/resource-panel/MapExplorerDialog.tsx || true
git rm -f src/components/resource-panel/QuickAddResource.tsx || true
git rm -f src/components/shared/passport-upload-zone.tsx || true
git rm -f src/components/shared/constants/labels.ts || true
git rm -f src/components/ui/orb-loader.tsx || true
git rm -f src/components/ui/radio-group.tsx || true

# ------------------------------------------
# Section 4: src/features/ 下
# ------------------------------------------
echo ""
echo "--- features/ tours/components dead (≈20 檔) ---"
git rm -f src/features/tours/components/TourConfirmationDialog.tsx || true
git rm -f src/features/tours/components/TourFilesTree.tsx || true
git rm -f src/features/tours/components/tour-confirmation-sheet.tsx || true
git rm -f src/features/tours/components/tour-quote-tab.tsx || true
git rm -rf src/features/tours/components/tour-tracking || true
git rm -rf src/features/tours/components/assignment-tabs || true
git rm -f src/features/tours/components/edit-dialog/FlightInfoSection.tsx || true
git rm -rf src/features/tours/components/itinerary || true
git rm -rf src/features/tours/components/sections/flight || true
git rm -f src/features/tours/hooks/useTourDailyData.ts || true
git rm -f src/features/tours/hooks/useTourDestinations.ts || true
git rm -f src/features/tours/types/index.ts || true
git rm -f src/features/tours/utils/room-utils.ts || true
git rm -f src/features/tours/utils/vehicle-utils.ts || true

echo ""
echo "--- features/ hr (integer tabs 大部分) ---"
git rm -rf src/features/hr/components/tabs/basic-info || true
git rm -f src/features/hr/components/TeamSettingsTab.tsx || true
git rm -f src/features/hr/components/salary-payment-dialog.tsx || true
git rm -f src/features/hr/components/tabs/permissions-tab-new.tsx || true
git rm -f src/features/hr/components/tabs/salary-tab.tsx || true
git rm -f src/features/hr/components/tabs/constants/labels.ts || true

echo ""
echo "--- features/ finance / orders / quotes dead ---"
git rm -rf src/features/finance/travel-invoice/components || true  # 4 檔全 0 ref
git rm -f src/features/finance/requests/components/QuickRequestFromItemDialog.tsx || true
git rm -f src/features/finance/requests/hooks/index.ts || true
git rm -f src/features/finance/requests/utils.ts || true
git rm -f src/features/orders/hooks/useOrders.ts || true
git rm -f src/features/orders/components/member-edit/index.ts || true
git rm -f src/features/todos/components/todo-card.tsx || true
git rm -f src/features/todos/components/quick-actions/quick-group.tsx || true
git rm -f src/features/todos/components/quick-actions/pnr/index.ts || true

echo ""
echo "--- features/ attractions / designer / itinerary / office / supplier / visas ---"
git rm -f src/features/attractions/components/attraction-dialog/AttractionPreview.tsx || true
git rm -f src/features/attractions/components/tabs/MichelinRestaurantsTab.tsx || true
git rm -f src/features/attractions/components/tabs/PremiumExperiencesTab.tsx || true
git rm -f src/features/designer/components/ImageAdjustmentsPanel.tsx || true
git rm -f src/features/designer/components/ImageFilters.tsx || true
git rm -f src/features/designer/components/index.ts || true
git rm -f src/features/designer/components/core/illustration-library.ts || true
git rm -f src/features/designer/hooks/index.ts || true
git rm -f src/features/itinerary/components/GeminiItineraryForm.tsx || true
git rm -f src/features/itinerary/hooks/useQuoteImport.ts || true
git rm -rf src/features/office || true
git rm -f src/features/supplier/constants/labels.ts || true
git rm -f src/features/visas/constants/usa-esta-info.ts || true

echo ""
echo "--- features/ confirmations / tour-documents ---"
git rm -f src/features/confirmations/components/hooks/index.ts || true
git rm -f src/features/confirmations/components/hooks/useRequirementsData.ts || true
git rm -f src/features/confirmations/services/requestCoreTableSync.ts || true
git rm -f src/features/tour-documents/components/RequestTimeline.tsx || true
git rm -f src/features/tour-documents/services/request-document.service.ts || true
git rm -f src/features/tour-documents/services/tour-file.service.ts || true
git rm -f src/features/tour-documents/services/tour-request.service.ts || true

# ------------------------------------------
# Section 5: src/app/ 下
# ------------------------------------------
echo ""
echo "--- app/ (settings / ai-bot / customers / finance reports 等) ---"
git rm -rf src/app/\(main\)/settings/components || true  # 12 檔全 0 ref
git rm -rf src/app/\(main\)/ai-bot/components || true
git rm -f src/app/\(main\)/channel/constants/labels.ts || true
git rm -rf src/app/\(main\)/customers/hooks || true
git rm -f src/app/\(main\)/customers/types/customer-page.types.ts || true
git rm -f src/app/\(main\)/design/constants/labels.ts || true
git rm -f src/app/\(main\)/hr/components/MyHrTabs.tsx || true
git rm -f src/app/\(main\)/tools/constants/labels.ts || true
git rm -f src/app/\(main\)/finance/reports/constants/labels.ts || true
git rm -f src/app/\(main\)/finance/reports/monthly-disbursement/constants/labels.ts || true
git rm -f src/app/\(main\)/finance/reports/monthly-income/constants/labels.ts || true
git rm -f src/app/\(public\)/p/customized/\[slug\]/customized-selector.tsx || true
git rm -f src/app/public/_components/QuotePageLayout.tsx || true

# ------------------------------------------
# Section 6: 其他
# ------------------------------------------
echo ""
echo "--- data / i18n / stores / types ---"
git rm -rf src/data/core || true
git rm -f src/data/entities/files.ts || true
git rm -f src/data/entities/folders.ts || true
git rm -f src/data/entities/michelin-restaurants.ts || true
git rm -f src/data/entities/premium-experiences.ts || true
git rm -f src/data/entities/tour-addons.ts || true
git rm -f src/data/entities/tour-documents.ts || true
git rm -f src/data/entities/tour-room-assignments.ts || true
git rm -f src/data/hooks/useEnabledCountries.ts || true
git rm -f src/i18n/config.ts || true
git rm -f src/i18n/index.ts || true
git rm -f src/stores/agent-status-store.ts || true
git rm -f src/stores/tour-request-store.ts || true
git rm -f src/types/tour-confirmation-sheet.types.ts || true
git rm -f src/types/tour-documents.types.ts || true
git rm -f src/types/tour-request.types.ts || true
git rm -f src/types/vehicle.types.ts || true
git rm -f src/components/editor/tour-form/sections/daily-itinerary/AutoGenerateDialog.tsx || true

echo ""
echo "=== 刪除完成 ==="
git diff --cached --stat | tail -10
echo ""
echo "Total removed:"
git diff --cached --stat | tail -1

echo ""
echo "=== 必做下一步 ==="
echo "1. npm run type-check                # type error 會指出漏的依賴"
echo "2. 有 error 就 cat /tmp/errors.log 修掉（少數檔可能還被偷偷 import）"
echo "3. npm run dev 手動點報價/行程/請款收款"
echo "4. OK → git commit -m 'cleanup(tier3): ~140 dead files, gitnexus-verified'"
echo ""
echo "⚠️ 剩下未處理的 refs≥1 檔案（要人工判斷）："
echo "  - src/lib/monitoring/error-tracker.ts (refs=10, 最可疑)"
echo "  - src/lib/plugins/types.ts (refs=2)"
echo "  - src/hooks/useGlobalData|useMemberActions|useMembers (refs 1-2)"
echo "  - src/features/quotes/hooks/useQuickQuoteForm.ts (refs=1, 報價頁相關)"
echo "  - src/features/tours/hooks/useTourRequests.ts (refs=1)"
echo "  - src/features/tour-confirmation/hooks/*.ts (5 個 refs=1, 被同 feature 內的 dead page 調用)"
echo "  - src/features/hr/components/tabs/basic-info/useBasicInfoForm.ts (refs=1)"
echo "  - src/components/shared/destination-selector.tsx (refs=2)"
echo "  - src/components/editor/block-editor/ 內的幾個 refs=1-4"
echo "  - src/components/editor/hotel-selector/hooks/useHotelSearch.ts (refs=1)"
echo "  - src/components/editor/tour-form/sections/CountriesSection.tsx (refs=2)"
echo "  - src/features/designer/hooks/useImageAdjustments.ts (refs=1)"
echo "  - src/components/shared/react-datasheet-wrapper/useDatasheetHandlers|useDatasheetState (refs=1)"
