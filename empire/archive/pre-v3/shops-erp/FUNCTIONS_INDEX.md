# 關鍵函數索引

**掃描時間**: 2026-03-14 10:38

## tours

### `tours/types/tour-itinerary-item.types.ts`
```typescript
9:export const ITINERARY_ITEM_CATEGORIES = {
23:export const MEAL_SUB_CATEGORIES = {
32:export const ITEM_QUOTE_STATUS = {
38:export const ITEM_CONFIRMATION_STATUS = {
44:export const ITEM_LEADER_STATUS = {
50:export const ITEM_REQUEST_STATUS = {
```

### `tours/constants/bonus-labels.ts`
```typescript
4:export const BONUS_TYPE_LABELS: Record<BonusSettingType, string> = {
13:export const BONUS_CALCULATION_LABELS: Record<BonusCalculationType, string> = {
21:export const BONUS_TYPE_COLORS: Record<BonusSettingType, string> = {
30:export const BONUS_TYPE_BADGE_VARIANTS: Record<BonusSettingType, string> = {
39:export const PROFIT_TABLE_LABELS = {
52:export const BONUS_TAB_LABELS = {
70:export const PROFIT_TAB_LABELS = {
```

### `tours/constants/labels.ts`
```typescript
3:export const COMP_TOURS_LABELS = {
598:export const CHECKIN_SETTINGS_LABELS = {
609:export const CHECKIN_MEMBER_LIST_LABELS = {
621:export const CHECKIN_QR_CODE_LABELS = {
636:export const BASIC_INFO_SECTION_LABELS = {
648:export const TOUR_ORDERS_LABELS = {
657:export const TOUR_PRINT_DIALOG_LABELS = {
704:export const TOUR_PNR_TOOL_DIALOG_LABELS = {
767:export const TOUR_ITINERARY_TAB_LABELS = {
886:export const TOUR_COSTS_LABELS = {
954:export const FLIGHT_INFO_SECTION_LABELS = {
976:export const INVOICE_LABELS = {
1000:export const ADD_PAYMENT_LABELS = {
1020:export const FLIGHT_SECTION_LABELS = {
1034:export const TOUR_SERVICE_LABELS = {
1060:export const TOUR_PAYMENTS_LABELS = {
1080:export const TOUR_OPERATIONS_LABELS = {
1097:export const TOURS_ADVANCED_LABELS = {
1105:export const TOUR_FORM_LABELS = {
1115:export const TOUR_CLOSING_LABELS = {
```

### `tours/utils/vehicle-utils.ts`
```typescript
6:export const getVehicleTypeLabel = (vehicleType: string | null): string => {
```

### `tours/utils/room-utils.ts`
```typescript
6:export const getRoomTypeLabel = (roomType: string): string => {
```

### `tours/components/JapanEntryCardPrint.tsx`
```typescript
43:export const JapanEntryCardPrint = forwardRef<HTMLDivElement, JapanEntryCardPrintProps>(
```

### `tours/components/CoreTableRequestDialog.tsx`
```typescript
49:export function CoreTableRequestDialog({
```

### `tours/components/TourTable.tsx`
```typescript
23:export const TourTable: React.FC<TourTableProps> = ({
```

### `tours/components/ArchiveReasonDialog.tsx`
```typescript
14:export const ARCHIVE_REASONS = [
41:export function ArchiveReasonDialog({
```

### `tours/components/tour-orders.tsx`
```typescript
38:export function TourOrders({ tour, onChildDialogChange }: TourOrdersProps) {
```

### `tours/components/sections/DailyImageCarousel.tsx`
```typescript
31:export function DailyImageCarousel({ images, title, allTourImages = [] }: DailyImageCarouselProps) {
```

### `tours/components/sections/TourFeaturesSectionArt.tsx`
```typescript
12:export function TourFeaturesSectionArt({ data, viewMode }: TourFeaturesSectionArtProps) {
```

### `tours/components/sections/TourItinerarySectionLuxury.tsx`
```typescript
29:export function TourItinerarySectionLuxury({
```

### `tours/components/sections/TourFeaturesSection.tsx`
```typescript
35:export function TourFeaturesSection({
```

### `tours/components/sections/TourHeroCollage.tsx`
```typescript
77:export function TourHeroCollage({ data, viewMode }: TourHeroCollageProps) {
```

### `tours/components/sections/TourHeroGemini.tsx`
```typescript
26:export function TourHeroGemini({ data, viewMode }: TourHeroGeminiProps) {
```

### `tours/components/sections/TourPriceTiersSection.tsx`
```typescript
41:export function TourPriceTiersSection({
```

### `tours/components/sections/TourFlightSection.tsx`
```typescript
27:export function TourFlightSection({ data, viewMode }: TourFlightSectionProps) {
```

### `tours/components/sections/TourFeaturesSectionLuxury.tsx`
```typescript
53:export function TourFeaturesSectionLuxury({ data, viewMode }: TourFeaturesSectionLuxuryProps) {
```

### `tours/components/sections/constants/labels.ts`
```typescript
1:export const TOURS_LABELS = {
```

### `tours/components/sections/flight/LuxuryFlightSection.tsx`
```typescript
79:export function LuxuryFlightSection({
```

### `tours/components/sections/flight/constants/labels.ts`
```typescript
1:export const FLIGHT_LABELS = {
```

### `tours/components/sections/flight/TourFlightSectionUnified.tsx`
```typescript
60:export function TourFlightSectionUnified({
```

### `tours/components/sections/flight/DreamscapeFlightSection.tsx`
```typescript
185:export function DreamscapeFlightSection({
```

### `tours/components/sections/flight/UnifiedFlightCard.tsx`
```typescript
122:export function UnifiedFlightCard({
```

### `tours/components/sections/flight/CollageFlightSection.tsx`
```typescript
175:export function CollageFlightSection({
```

### `tours/components/sections/TourLeaderSectionArt.tsx`
```typescript
20:export function TourLeaderSectionArt({ data, viewMode }: TourLeaderSectionArtProps) {
```

### `tours/components/sections/TourLeaderSectionCollage.tsx`
```typescript
17:export function TourLeaderSectionCollage({ data, viewMode }: TourLeaderSectionCollageProps) {
```

### `tours/components/sections/TourPricingSection.tsx`
```typescript
18:export function TourPricingSection({
```

### `tours/components/sections/TourNoticesSection.tsx`
```typescript
15:export function TourNoticesSection({
```

### `tours/components/sections/modals/ImageGalleryModal.tsx`
```typescript
27:export function ImageGalleryModal(props: ImageGalleryModalProps) {
```

### `tours/components/sections/modals/ActivityDetailModal.tsx`
```typescript
18:export function ActivityDetailModal({ activity, onClose }: ActivityDetailModalProps) {
```

### `tours/components/sections/utils/art-theme.ts`
```typescript
3:export const ART = {
```

### `tours/components/sections/utils/itineraryLuxuryUtils.ts`
```typescript
6:export const LUXURY = {
18:export const DAY_COLORS = [
29:export function calculateDayLabels(itinerary: TourFormData['dailyItinerary']): string[] {
51:export function calculateDayDate(
85:export function getDayOfWeek(dateStr: string | undefined): string {
97:export function isLastMainDay(
```

### `tours/components/sections/TourNavigation.tsx`
```typescript
31:export function TourNavigation({ data, scrollOpacity, isPreview, viewMode }: TourNavigationProps) {
```

### `tours/components/sections/TourPricingSectionCollage.tsx`
```typescript
12:export function TourPricingSectionCollage({
```

### `tours/components/sections/TourHeroArt.tsx`
```typescript
67:export function TourHeroArt({ data, viewMode }: TourHeroArtProps) {
```

### `tours/components/sections/TourPricingSectionLuxury.tsx`
```typescript
26:export function TourPricingSectionLuxury({ data, viewMode }: TourPricingSectionLuxuryProps) {
```

### `tours/components/sections/components/MobileDaySection.tsx`
```typescript
19:export function MobileDaySection({
```

### `tours/components/sections/components/layouts/SingleImageLayout.tsx`
```typescript
19:export function SingleImageLayout({
```

### `tours/components/sections/components/layouts/TimelineLayout.tsx`
```typescript
19:export function TimelineLayout({
```

### `tours/components/sections/components/layouts/CardGridLayout.tsx`
```typescript
19:export function CardGridLayout({
```

### `tours/components/sections/components/layouts/MultiImageLayout.tsx`
```typescript
19:export function MultiImageLayout({
```

### `tours/components/sections/components/DaySection.tsx`
```typescript
21:export function DaySection({
```

### `tours/components/sections/TourHotelsSectionArt.tsx`
```typescript
98:export function TourHotelsSectionArt({ data, viewMode }: TourHotelsSectionArtProps) {
```

### `tours/components/sections/TourFeaturesSectionCollage.tsx`
```typescript
474:export function TourFeaturesSectionCollage({
```

### `tours/components/sections/TourItinerarySection.tsx`
```typescript
105:export function TourItinerarySection({
```

### `tours/components/sections/TourHeroDreamscape.tsx`
```typescript
80:export function TourHeroDreamscape({ data, viewMode }: TourHeroDreamscapeProps) {
```

### `tours/components/sections/TourHotelsSection.tsx`
```typescript
95:export function TourHotelsSection({
```

### `tours/components/sections/hooks/useImageGallery.ts`
```typescript
9:export function useImageGallery() {
```

### `tours/components/sections/hooks/useDayCalculations.ts`
```typescript
11:export function calculateDayLabels(itinerary: TourFormData['dailyItinerary']): string[] {
32:export function calculateDayDate(
80:export function isLastMainDay(
103:export function getDayImages(day: TourFormData['dailyItinerary'][0]): string[] {
```

### `tours/components/sections/TourPricingSectionArt.tsx`
```typescript
12:export function TourPricingSectionArt({ data, viewMode = 'desktop' }: TourPricingSectionArtProps) {
```

### `tours/components/sections/TourHotelsSectionCollage.tsx`
```typescript
29:export function TourHotelsSectionCollage({ data, viewMode }: TourHotelsSectionCollageProps) {
```

### `tours/components/sections/TourHeroLuxury.tsx`
```typescript
38:export function TourHeroLuxury({ data, viewMode }: TourHeroLuxuryProps) {
```

### `tours/components/sections/SectionTitle.tsx`
```typescript
17:export function SectionTitle({
```

### `tours/components/sections/TourHeroSection.tsx`
```typescript
26:export function TourHeroSection({ data, viewMode }: TourHeroSectionProps) {
```

### `tours/components/sections/TourLeaderSection.tsx`
```typescript
21:export function TourLeaderSection({
```

### `tours/components/sections/TourFAQSection.tsx`
```typescript
16:export function TourFAQSection({
```

### `tours/components/sections/TourLeaderSectionLuxury.tsx`
```typescript
24:export function TourLeaderSectionLuxury({ data, viewMode }: TourLeaderSectionLuxuryProps) {
```

### `tours/components/sections/TourItinerarySectionDreamscape.tsx`
```typescript
598:export function TourItinerarySectionDreamscape({
```

### `tours/components/sections/TourItinerarySectionArt.tsx`
```typescript
26:export function TourItinerarySectionArt({
```

### `tours/components/sections/TourHeroNature.tsx`
```typescript
27:export function TourHeroNature({ data, viewMode }: TourHeroNatureProps) {
```

### `tours/components/sections/TourHotelsSectionLuxury.tsx`
```typescript
25:export function TourHotelsSectionLuxury({ data, viewMode }: TourHotelsSectionLuxuryProps) {
```

### `tours/components/sections/TourPriceTiersSectionLuxury.tsx`
```typescript
47:export function TourPriceTiersSectionLuxury({ data, viewMode }: TourPriceTiersSectionLuxuryProps) {
```

### `tours/components/tour-quick-quote-tab.tsx`
```typescript
38:export function TourQuickQuoteTab({ tour }: TourQuickQuoteTabProps) {
```

### `tours/components/mention-input/useMentionSearch.ts`
```typescript
15:export function useMentionSearch(countryName: string, query: string, isOpen: boolean) {
```

### `tours/components/mention-input/MentionInput.tsx`
```typescript
155:export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(function MentionInput({
```

### `tours/components/ConvertToTourDialog.tsx`
```typescript
30:export function ConvertToTourDialog({ isOpen, onClose, tour, onConvert }: ConvertToTourDialogProps) {
```

### `tours/components/pnr-tool/TourPnrToolDialog.tsx`
```typescript
58:export function TourPnrToolDialog({
```

### `tours/components/pnr-tool/pnr-matching.ts`
```typescript
33:export function normalizeNameForMatch(name: string): string {
37:export function matchPassengerToMember(
87:export function buildPassengerMatches(result: ParsedPNR, members: OrderMember[]): PassengerMatch[] {
121:export const DEFAULT_SEGMENT_EDIT: SegmentEditData = {
```

### `tours/components/TourPrintDialog.tsx`
```typescript
129:export function TourPrintDialog({ isOpen, tour, members, onClose }: TourPrintDialogProps) {
```

### `tours/components/BonusSettingTab.tsx`
```typescript
33:export function BonusSettingTab({ tour }: BonusSettingTabProps) {
```

### `tours/components/SupplierSearchInput.tsx`
```typescript
36:export function SupplierSearchInput({
```

### `tours/components/tour-checkin/index.tsx`
```typescript
17:export function TourCheckin({ tour }: TourCheckinProps) {
```

### `tours/components/tour-checkin/CheckinSettings.tsx`
```typescript
20:export function CheckinSettings({ enableCheckin, onToggle, stats }: CheckinSettingsProps) {
```

### `tours/components/tour-checkin/CheckinMemberList.tsx`
```typescript
30:export function CheckinMemberList({
```

### `tours/components/tour-checkin/CheckinQRCode.tsx`
```typescript
19:export function CheckinQRCode({ tour }: CheckinQRCodeProps) {
```

### `tours/components/tour-itinerary-tab.tsx`
```typescript
71:export function TourItineraryTab({ tour }: TourItineraryTabProps) {
```

### `tours/components/TourConfirmationWizard.tsx`
```typescript
72:export function TourConfirmationWizard({
```

### `tours/components/tour-print-constants.ts`
```typescript
9:export const COLUMN_LABELS: Record<keyof ExportColumnsConfig, string> = {
27:export const DEFAULT_COLUMNS: ExportColumnsConfig = {
45:export const CLASS_NAMES: Record<string, string> = {
63:export const STATUS_NAMES: Record<string, string> = {
```

### `tours/components/tour-designs-tab.tsx`
```typescript
25:export function TourDesignsTab({ tourId }: TourDesignsTabProps) {
```

### `tours/components/TourTabs.tsx`
```typescript
100:export const TOUR_TABS = [
140:export function TourTabContent({
222:export function TourTabs({
```

### `tours/components/TourClosingDialog.tsx`
```typescript
42:export function TourClosingDialog({ open, onOpenChange, tour, onSuccess }: TourClosingDialogProps) {
```

### `tours/components/constants/labels.ts`
```typescript
1:export const TOURS_LABELS = {
```

### `tours/components/TourUnlockDialog.tsx`
```typescript
30:export function TourUnlockDialog({ tour, open, onOpenChange, onUnlocked }: TourUnlockDialogProps) {
```

### `tours/components/tour-costs.tsx`
```typescript
56:export const TourCosts = React.memo(function TourCosts({
```

### `tours/components/ToursPage.tsx`
```typescript
32:export const ToursPage: React.FC = () => {
```

### `tours/components/LinkItineraryToTourDialog.tsx`
```typescript
22:export function LinkItineraryToTourDialog({
```

### `tours/components/TourOperationsAddButton.tsx`
```typescript
20:export function TourOperationsAddButton({
```

### `tours/components/TourOverviewTab.tsx`
```typescript
13:export function TourOverviewTab({ tour }: TourOverviewTabProps) {
```

### `tours/components/edit-dialog/BasicInfoSection.tsx`
```typescript
28:export function BasicInfoSection({
```

### `tours/components/edit-dialog/FlightInfoSection.tsx`
```typescript
26:export function FlightInfoSection({
```

### `tours/components/TourFormShell.tsx`
```typescript
28:export function TourFormShell({
```

### `tours/components/ItinerarySyncDialog.tsx`
```typescript
25:export function ItinerarySyncDialog({ open, syncInfo, onSync, onClose }: ItinerarySyncDialogProps) {
```

### `tours/components/TourAssignmentManager.tsx`
```typescript
59:export function TourAssignmentManager({
```

### `tours/components/tour-payments.tsx`
```typescript
23:export const TourPayments = React.memo(function TourPayments({
```

### `tours/components/print-templates/members-print-template.ts`
```typescript
11:export function generateMembersPrintContent({
```

### `tours/components/print-templates/flight-print-labels.ts`
```typescript
10:export const FLIGHT_PRINT_LABELS = {
```

### `tours/components/print-templates/hotel-print-template.ts`
```typescript
11:export function generateHotelPrintContent({ tour, members }: HotelPrintOptions): string {
```

### `tours/components/print-templates/flight-print-template.ts`
```typescript
269:export function generateFlightPrintContent({
```

### `tours/components/TourRequestFormDialog.tsx`
```typescript
125:export function TourRequestFormDialog({
```

### `tours/components/tour-tracking/TourTrackingPanel.tsx`
```typescript
173:export function TourTrackingPanel({ tour }: TourTrackingPanelProps) {
```

### `tours/components/tour-tracking/constants/labels.ts`
```typescript
1:export const TOUR_TRACKING_LABELS = {
```

### `tours/components/TourActionButtons.tsx`
```typescript
38:export function useTourActionButtons(params: UseTourActionButtonsParams) {
```

### `tours/components/tour-overview.tsx`
```typescript
38:export const TourOverview = React.memo(function TourOverview({
```

### `tours/components/tour-quote-tab.tsx`
```typescript
26:export function TourQuoteTab({ tour }: TourQuoteTabProps) {
```

### `tours/components/TourTableColumns.tsx`
```typescript
19:export function useTourTableColumns({ ordersByTourId }: UseTourTableColumnsParams) {
126:export function useTemplateTableColumns({ onConvert }: UseTemplateTableColumnsParams) {
```

### `tours/components/tour-confirmation-sheet.tsx`
```typescript
53:export function TourConfirmationSheet({ tourId }: TourConfirmationSheetProps) {
```

### `tours/components/InvoiceDialog.tsx`
```typescript
47:export const InvoiceDialog = React.memo(function InvoiceDialog({
```

### `tours/components/AddPaymentDialog.tsx`
```typescript
40:export const AddPaymentDialog = React.memo(function AddPaymentDialog({
```

### `tours/components/tour-requirements-tab.tsx`
```typescript
45:export function TourRequirementsTab({
```

### `tours/components/PaymentSummary.tsx`
```typescript
14:export const PaymentSummary = React.memo(function PaymentSummary({
```

### `tours/components/TourFilesManager.tsx`
```typescript
76:export function TourFilesManager({
```

### `tours/components/tour-edit-dialog.tsx`
```typescript
21:export function TourEditDialog({ isOpen, onClose, tour, onSuccess }: TourEditDialogProps) {
```

### `tours/components/tour-closing-tab.tsx`
```typescript
17:export function TourClosingTab({ tour }: TourClosingTabProps) {
```

### `tours/components/tour-webpage-tab.tsx`
```typescript
135:export function TourWebpageTab({ tour }: TourWebpageTabProps) {
```

### `tours/components/ProfitTab.tsx`
```typescript
59:export function ProfitTab({ tour }: ProfitTabProps) {
```

### `tours/components/BonusSettingDialog.tsx`
```typescript
43:export function BonusSettingDialog({
```

### `tours/components/itinerary-editor/DailyScheduleEditor.tsx`
```typescript
17:export function DailyScheduleEditor({
```

### `tours/components/itinerary-editor/AiGenerateDialog.tsx`
```typescript
30:export function AiGenerateDialog({
```

### `tours/components/itinerary-editor/VersionDropdown.tsx`
```typescript
26:export function VersionDropdown({
```

### `tours/components/itinerary-editor/FlightSection.tsx`
```typescript
41:export function FlightSection({
```

### `tours/components/itinerary-editor/types.ts`
```typescript
67:export const AI_THEMES: AiThemeOption[] = [
```

### `tours/components/itinerary-editor/ItineraryPreview.tsx`
```typescript
33:export function ItineraryPreview({
220:export function ItineraryPreviewContent({
```

### `tours/components/itinerary-editor/format-itinerary.ts`
```typescript
24:export function formatDailyItinerary({
90:export function getPreviewDailyData(
148:export function generatePrintHtml({
```

### `tours/components/itinerary-editor/usePackageItinerary.ts`
```typescript
46:export function usePackageItinerary({
```

### `tours/components/itinerary-editor/TimelineEditor.tsx`
```typescript
35:export function TimelineEditor({
```

### `tours/components/itinerary-editor/PackageItineraryDialog.tsx`
```typescript
23:export function PackageItineraryDialog({
```

### `tours/components/itinerary-editor/labels.ts`
```typescript
6:export const DAILY_SCHEDULE_EDITOR_LABELS = {
16:export const ITINERARY_DIALOG_LABELS = {
35:export const TOUR_REQUEST_FORM_DIALOG_LABELS = {
44:export const BROCHURE_PREVIEW_DIALOG_LABELS = {
61:export const AI_GENERATE_DIALOG_LABELS = {
74:export const VERSION_DROPDOWN_LABELS = {
82:export const FLIGHT_SECTION_LABELS = {
87:export const ITINERARY_EDITOR_LABELS = {
143:export const PACKAGE_ITINERARY_DIALOG_LABELS = {
```

### `tours/components/TourItineraryDialog.tsx`
```typescript
18:export function TourItineraryDialog({ isOpen, onClose, tour }: TourItineraryDialogProps) {
```

### `tours/components/TourMobileCard.tsx`
```typescript
18:export function TourMobileCard({ tour: tourProp, onClick, getStatusColor }: TourMobileCardProps) {
```

### `tours/components/assignment-tabs/TourVehicleTab.tsx`
```typescript
40:export function TourVehicleTab({ tourId, members }: TourVehicleTabProps) {
```

### `tours/components/assignment-tabs/TourRoomTab.tsx`
```typescript
58:export function TourRoomTab({ tourId, tour, members, tourNights }: TourRoomTabProps) {
```

### `tours/components/assignment-tabs/TourTableTab.tsx`
```typescript
78:export function TourTableTab({ tourId, tour, members }: TourTableTabProps) {
```

### `tours/components/TourFilesTree.tsx`
```typescript
91:export function TourFilesTree({ tourId, tourCode, quoteId, itineraryId }: TourFilesTreeProps) {
```

### `tours/components/tour-room-manager.tsx`
```typescript
63:export function TourRoomManager({
```

### `tours/components/tour-form/TourOrderSection.tsx`
```typescript
12:export function TourOrderSection({ newOrder, setNewOrder }: TourOrderSectionProps) {
```

### `tours/components/tour-form/TourBasicInfo.tsx`
```typescript
17:export function TourBasicInfo({ newTour, setNewTour }: TourBasicInfoProps) {
```

### `tours/components/tour-form/TourSettings.tsx`
```typescript
18:export function TourSettings({ newTour, setNewTour }: TourSettingsProps) {
```

### `tours/components/tour-form/TourFlightInfo.tsx`
```typescript
19:export function TourFlightInfo({
```

### `tours/components/LinkDocumentsToTourDialog.tsx`
```typescript
81:export function LinkDocumentsToTourDialog({
```

### `tours/components/TourConfirmationDialog.tsx`
```typescript
26:export function TourConfirmationDialog({ open, tour, onClose }: TourConfirmationDialogProps) {
```

### `tours/components/TourChannelOperations.tsx`
```typescript
21:export function useTourChannelOperations({ actions }: UseTourChannelOperationsParams) {
```

### `tours/components/TourFilters.tsx`
```typescript
25:export const TourFilters: React.FC<TourFiltersProps> = ({
```

### `tours/components/DeleteConfirmDialog.tsx`
```typescript
15:export function DeleteConfirmDialog({
```

### `tours/components/tour-vehicle-manager.tsx`
```typescript
43:export function TourVehicleManager({
```

### `tours/components/PaymentRow.tsx`
```typescript
71:export const PaymentRow = React.memo(function PaymentRow({
```

### `tours/constants.ts`
```typescript
9:export const TOUR_FILTERS = {
31:export const TOUR_TABLE = {
52:export const TOUR_MOBILE_CARD = {
63:export const TOUR_DELETE = {
78:export const TOUR_ARCHIVE = {
98:export const TOUR_FORM = {
121:export const TOUR_BASIC_INFO = {
132:export const TOUR_CONVERT = {
150:export const TOUR_FLIGHT_INFO = {
162:export const TOUR_ORDER_SECTION = {
170:export const TOUR_SETTINGS = {
181:export const TOUR_OVERVIEW = {
227:export const TOUR_UNLOCK = {
247:export const TOUR_OPS_ADD = {
268:export const TOUR_CONFIRMATION = {
275:export const TOUR_WIZARD = {
304:export const TOUR_LINK_ITINERARY = {
317:export const TOUR_ITINERARY_DIALOG = {
324:export const TOUR_ACTIONS = {
348:export const TOUR_CLOSING = {
```

### `tours/hooks/useTourItineraryNav.ts`
```typescript
6:export function useTourItineraryNav<T>(dailyItinerary: T[]) {
```

### `tours/hooks/useTourDepartureTotals.ts`
```typescript
13:export function useTourDepartureTotals(
```

### `tours/hooks/useItineraryHiddenItems.ts`
```typescript
27:export function useItineraryHiddenItems(itineraryId: string | null) {
```

### `tours/hooks/useQuoteLoader.ts`
```typescript
33:export function useQuoteLoader(
```

### `tours/hooks/useTourScrollEffects.ts`
```typescript
10:export function useTourScrollEffects({ viewMode, isPreview }: ScrollEffectsOptions) {
```

### `tours/hooks/useTours-advanced.ts`
```typescript
47:export function useTours(params?: PageRequest): UseEntityResult<Tour> {
214:export function useTourDetails(tour_id: string) {
```

### `tours/hooks/useToursForm.ts`
```typescript
19:export function useToursForm({ state, openDialog }: UseToursFormParams): UseToursFormReturn {
```

### `tours/hooks/useTourEdit.ts`
```typescript
68:export function useTourEdit(params: UseTourEditParams) {
```

### `tours/hooks/useTourItineraryItems.ts`
```typescript
34:export function useTourItineraryItemsByTour(tour_id: string | null) {
60:export function useTourItineraryItemsByItinerary(itinerary_id: string | null) {
159:export function useSyncItineraryToCore() {
```

### `tours/hooks/useTourGallery.ts`
```typescript
9:export function useTourGallery({ viewMode }: GalleryOptions) {
```

### `tours/hooks/useTourPageState.ts`
```typescript
12:export function useTourPageState() {
```

### `tours/hooks/useTourDepartureData.ts`
```typescript
16:export function useTourDepartureData(tourId: string, open: boolean) {
```

### `tours/hooks/useTourForm.ts`
```typescript
16:export function useTourForm({ newTour, setNewTour }: UseTourFormProps) {
```

### `tours/hooks/useToursPaginated.ts`
```typescript
54:export function useToursPaginated(params: UseToursPaginatedParams): UseToursPaginatedResult {
290:export function useTourDetailsPaginated(tourId: string | null) {
```

### `tours/hooks/useTourHealth.ts`
```typescript
43:export function useTourHealth(tourId: string): TourHealthData {
```

### `tours/hooks/useToursPage.ts`
```typescript
55:export function useToursPage(): UseToursPageReturn {
```

### `tours/hooks/useAirports.ts`
```typescript
85:export function useAirports(options: UseAirportsOptions = {}) {
```

### `tours/hooks/useTourPayments.ts`
```typescript
28:export function useTourPayments({
```

### `tours/hooks/useTourDestinations.ts`
```typescript
73:export function useTourDestinations(options: UseTourDestinationsOptions = {}) {
```

### `tours/hooks/useCoreRequestItems.ts`
```typescript
117:export function useCoreRequestItems(tourId: string | null, supplierId: string | null) {
159:export function useTotalPax(tourId: string | null) {
```

### `tours/hooks/useToursDialogs.ts`
```typescript
70:export function useToursDialogs(): UseToursDialogsReturn {
```

### `tours/hooks/useTourOperations.ts`
```typescript
42:export function useTourOperations(params: UseTourOperationsParams) {
```

### `tours/hooks/useTours.ts`
```typescript
23:export const useTours = () => {
```

### `tours/hooks/useTourDailyData.ts`
```typescript
31:export function useTourDailyData(
102:export function extractMealsFromCoreItems(items: TourItineraryItem[]) {
114:export function extractAccommodationFromCoreItems(items: TourItineraryItem[]) {
122:export function extractActivitiesFromCoreItems(items: TourItineraryItem[]) {
```

### `tours/hooks/useTourMemberEditor.ts`
```typescript
44:export function useTourMemberEditor(
```

### `tours/themes/index.ts`
```typescript
45:export const themes: Record<TourStyle, TourTheme> = {
219:export function getTheme(style: TourStyle): TourTheme {
227:export function inferFlightStyle(coverStyle: TourStyle): TourStyle {
235:export function themeToCSS(theme: TourTheme): Record<string, string> {
```

### `tours/services/profit-calculation.service.ts`
```typescript
31:export function calculateReceiptTotal(receipts: ReceiptData[]): number {
41:export function calculateExpenseTotal(
56:export function calculateAdministrativeCost(memberCount: number, costPerPerson: number): number {
61:export function getAdminCostPerPerson(settings: TourBonusSetting[]): number {
68:export function calculateProfitBeforeTax(
77:export function getTaxRate(settings: TourBonusSetting[]): number {
85:export function calculateProfitTax(profitBeforeTax: number, taxRate: number): number {
91:export function calculateNetProfit(profitBeforeTax: number, profitTax: number): number {
96:export function calculateBonus(netProfit: number, setting: TourBonusSetting): number {
113:export function calculateAllBonuses(
153:export function calculateCompanyProfit(netProfit: number, totalBonuses: number): number {
158:export function calculateFullProfit(params: {
207:export function generateProfitTableData(result: ProfitCalculationResult): {
```

### `tours/services/tour-channel.service.ts`
```typescript
23:export async function createTourChannel(
108:export async function addMembersToTourChannel(
```

### `tours/services/tour_dependency.service.ts`
```typescript
20:export async function checkTourDependencies(tourId: string): Promise<TourDependencyCheck> {
50:export async function checkTourPaidOrders(
73:export async function deleteTourEmptyOrders(tourId: string): Promise<void> {
84:export async function unlinkTourQuotes(tourId: string): Promise<number> {
112:export async function unlinkTourItineraries(tourId: string): Promise<number> {
151:export async function fetchTourPnrs(tourId: string): Promise<unknown[]> {
163:export async function fetchPnrsByLocators(locators: string[]): Promise<unknown[]> {
```

### `tours/services/tour-stats.service.ts`
```typescript
27:export async function recalculateParticipants(tour_id: string): Promise<void> {
```

### `tours/services/tour.service.ts`
```typescript
379:export const tourService = new TourService()
```

## quotes

### `quotes/types/index.ts`
```typescript
107:export const costCategories: CostCategory[] = [
117:export const categoryIcons: Record<string, string> = {
```

### `quotes/constants/labels.ts`
```typescript
3:export const ACCOMMODATION_ITEM_ROW_LABELS = {
14:export const CATEGORY_SECTION_LABELS = {
35:export const COST_ITEM_ROW_LABELS = {
48:export const IMPORT_ACTIVITIES_DIALOG_LABELS = {
59:export const IMPORT_MEALS_DIALOG_LABELS = {
72:export const LINK_TOUR_DIALOG_LABELS = {
89:export const LOCAL_PRICING_DIALOG_LABELS = {
112:export const PARTICIPANT_COUNT_EDITOR_LABELS = {
119:export const PRICE_SUMMARY_CARD_LABELS = {
131:export const PRINTABLE_QUICK_QUOTE_LABELS = {
136:export const PRINTABLE_QUOTATION_LABELS = {
140:export const QUICK_QUOTE_DETAIL_LABELS = {
152:export const QUICK_QUOTE_DIALOG_LABELS = {
170:export const QUICK_QUOTE_SECTION_LABELS = {
188:export const QUOTE_CONFIRMATION_SECTION_LABELS = {
233:export const QUOTE_DETAIL_EMBED_LABELS = {
251:export const QUOTE_DIALOG_LABELS = {
273:export const QUOTE_HEADER_LABELS = {
296:export const QUOTES_LIST_LABELS = {
311:export const QUOTES_PAGE_LABELS = {
```

### `quotes/utils/priceCalculations.ts`
```typescript
14:export const normalizeNumber = (value: string): string => {
21:export const calculateProfit = (sellingPrice: number, cost: number): number => {
28:export const calculateIdentityProfits = (
44:export const getRoomTypeCost = (
70:export const getRoomTypeProfit = (
85:export const calculateTierParticipantCounts = (
109:export const calculateTierCosts = (
120:export const generateUniqueId = (): string => {
```

### `quotes/utils/calculateTierPricing.ts`
```typescript
12:export function calculateTierPricingCosts(
```

### `quotes/utils/core-table-adapter.ts`
```typescript
72:export function coreItemsToCostCategories(items: TourItineraryItem[]): CostCategory[] {
151:export async function writePricingToCore(
```

### `quotes/components/SellingPriceSection.tsx`
```typescript
64:export const SellingPriceSection: React.FC<SellingPriceSectionProps> = ({
```

### `quotes/components/LinkTourDialog.tsx`
```typescript
30:export function LinkTourDialog({
```

### `quotes/components/SyncToItineraryDialog.tsx`
```typescript
23:export const SyncToItineraryDialog: React.FC<SyncToItineraryDialogProps> = ({
```

### `quotes/components/LocalPricingDialog.tsx`
```typescript
31:export const LocalPricingDialog: React.FC<LocalPricingDialogProps> = ({
```

### `quotes/components/QuotesPage.tsx`
```typescript
30:export const QuotesPage: React.FC = () => {
```

### `quotes/components/CategorySection.tsx`
```typescript
91:export const CategorySection: React.FC<CategorySectionProps> = ({
```

### `quotes/components/CostItemRow.tsx`
```typescript
24:export const CostItemRow: React.FC<CostItemRowProps> = ({
```

### `quotes/components/PriceInputRow.tsx`
```typescript
16:export const PriceInputRow: React.FC<PriceInputRowProps> = ({
```

### `quotes/components/quick-quote/QuickQuoteSummary.tsx`
```typescript
20:export const QuickQuoteSummary: React.FC<QuickQuoteSummaryProps> = ({
```

### `quotes/components/quick-quote/QuickQuoteItemsTable.tsx`
```typescript
306:export const QuickQuoteItemsTable: React.FC<QuickQuoteItemsTableProps> = ({
```

### `quotes/components/quick-quote/QuickQuoteHeader.tsx`
```typescript
23:export const QuickQuoteHeader: React.FC<QuickQuoteHeaderProps> = ({
```

### `quotes/components/ImportMealsDialog.tsx`
```typescript
36:export function ImportMealsDialog({ isOpen, onClose, meals, onImport }: ImportMealsDialogProps) {
```

### `quotes/components/ParticipantCountEditor.tsx`
```typescript
25:export const ParticipantCountEditor: React.FC<ParticipantCountEditorProps> = ({
```

### `quotes/components/QuickQuoteDetail.tsx`
```typescript
24:export const QuickQuoteDetail: React.FC<QuickQuoteDetailProps> = ({
```

### `quotes/components/PrintableQuickQuote.tsx`
```typescript
36:export const PrintableQuickQuote: React.FC<PrintableQuickQuoteProps> = ({
```

### `quotes/components/AccommodationItemRow.tsx`
```typescript
25:export const AccommodationItemRow: React.FC<AccommodationItemRowProps> = ({
```

### `quotes/components/QuoteDetailEmbed.tsx`
```typescript
59:export function QuoteDetailEmbed({ quoteId, showHeader = true }: QuoteDetailEmbedProps) {
```

### `quotes/components/PriceSummaryCard.tsx`
```typescript
22:export const PriceSummaryCard: React.FC<PriceSummaryCardProps> = ({
```

### `quotes/components/QuoteDialog.tsx`
```typescript
39:export const QuoteDialog: React.FC<QuoteDialogProps> = ({
```

### `quotes/components/QuoteHeader.tsx`
```typescript
70:export const QuoteHeader: React.FC<QuoteHeaderProps> = ({
```

### `quotes/components/printable/quotation/PrintableQuotation.tsx`
```typescript
47:export const PrintableQuotation: React.FC<PrintableQuotationProps> = ({
```

### `quotes/components/printable/quotation/QuotationTerms.tsx`
```typescript
16:export const QuotationTerms: React.FC<QuotationTermsProps> = ({ validUntil }) => {
```

### `quotes/components/printable/quotation/QuotationInfo.tsx`
```typescript
17:export const QuotationInfo: React.FC<QuotationInfoProps> = ({
```

### `quotes/components/printable/quotation/constants/labels.ts`
```typescript
1:export const QUOTATION_LABELS = {
```

### `quotes/components/printable/quotation/QuotationPricingTable.tsx`
```typescript
32:export const QuotationPricingTable: React.FC<QuotationPricingTableProps> = ({
```

### `quotes/components/printable/quotation/QuotationInclusions.tsx`
```typescript
11:export const QuotationInclusions: React.FC = () => {
```

### `quotes/components/printable/shared/constants/labels.ts`
```typescript
1:export const SHARED_LABELS = {
```

### `quotes/components/printable/shared/PrintHeader.tsx`
```typescript
17:export const PrintHeader: React.FC<PrintHeaderProps> = ({
```

### `quotes/components/printable/shared/PrintFooter.tsx`
```typescript
10:export const PrintFooter: React.FC = () => {
```

### `quotes/components/printable/shared/PrintableWrapper.tsx`
```typescript
140:export const PrintableWrapper: React.FC<PrintableWrapperProps> = ({
```

### `quotes/components/printable/shared/PrintControls.tsx`
```typescript
16:export const PrintControls: React.FC<PrintControlsProps> = ({ onClose, onPrint }) => {
```

### `quotes/components/printable/shared/print-styles.ts`
```typescript
5:export const PRINT_STYLES = `
117:export const MORANDI_COLORS = {
127:export const TABLE_STYLES = {
```

### `quotes/components/printable/shared/usePrintLogo.ts`
```typescript
9:export const usePrintLogo = (isOpen: boolean) => {
```

### `quotes/components/printable/quick-quote/QuickQuotePaymentInfo.tsx`
```typescript
13:export const QuickQuotePaymentInfo: React.FC = () => {
```

### `quotes/components/printable/quick-quote/QuickQuoteReceiptInfo.tsx`
```typescript
10:export const QuickQuoteReceiptInfo: React.FC = () => {
```

### `quotes/components/printable/quick-quote/constants/labels.ts`
```typescript
1:export const QUICK_QUOTE_LABELS = {
```

### `quotes/components/printable/quick-quote/QuickQuoteSummary.tsx`
```typescript
15:export const QuickQuoteSummary: React.FC<QuickQuoteSummaryProps> = ({
```

### `quotes/components/printable/quick-quote/QuickQuoteCustomerInfo.tsx`
```typescript
15:export const QuickQuoteCustomerInfo: React.FC<QuickQuoteCustomerInfoProps> = ({ quote }) => {
```

### `quotes/components/printable/quick-quote/QuickQuoteItemsTable.tsx`
```typescript
15:export const QuickQuoteItemsTable: React.FC<QuickQuoteItemsTableProps> = ({ items }) => {
```

### `quotes/components/printable/quick-quote/PrintableQuickQuote.tsx`
```typescript
24:export const PrintableQuickQuote: React.FC<PrintableQuickQuoteProps> = ({
```

### `quotes/components/QuickQuoteSection.tsx`
```typescript
41:export const QuickQuoteSection: React.FC<QuickQuoteSectionProps> = ({
```

### `quotes/components/QuoteConfirmationSection.tsx`
```typescript
89:export const QuoteConfirmationSection: React.FC<QuoteConfirmationSectionProps> = ({
```

### `quotes/components/ResourceSelectButton.tsx`
```typescript
23:export const ResourceSelectButton: React.FC<ResourceSelectButtonProps> = ({
```

### `quotes/components/ImportActivitiesDialog.tsx`
```typescript
34:export function ImportActivitiesDialog({
```

### `quotes/components/QuickQuoteDialog.tsx`
```typescript
54:export const QuickQuoteDialog: React.FC<QuickQuoteDialogProps> = ({
```

### `quotes/components/QuotesList.tsx`
```typescript
31:export const QuotesList: React.FC<QuotesListProps> = ({
```

### `quotes/constants.ts`
```typescript
10:export const STATUS_FILTERS = [
20:export const STATUS_COLORS: Record<string, string> = {
33:export const DEFAULT_CATEGORIES = [
```

### `quotes/hooks/useQuoteSave.ts`
```typescript
46:export const useQuoteSave = ({
```

### `quotes/hooks/useQuickQuoteForm.ts`
```typescript
52:export const useQuickQuoteForm = ({ addQuote }: UseQuickQuoteFormParams) => {
```

### `quotes/hooks/useCategoryOperations.ts`
```typescript
20:export const useCategoryOperations = ({
```

### `quotes/hooks/useQuoteActions.ts`
```typescript
49:export const useQuoteActions = ({
```

### `quotes/hooks/useQuoteState.ts`
```typescript
21:export const useQuoteState = () => {
```

### `quotes/hooks/useTransportOperations.ts`
```typescript
13:export const useTransportOperations = ({
```

### `quotes/hooks/useQuickQuoteDetail.ts`
```typescript
26:export function useQuickQuoteDetail({ quote, onUpdate }: UseQuickQuoteDetailProps) {
```

### `quotes/hooks/useActivityOperations.ts`
```typescript
11:export const useActivityOperations = ({
```

### `quotes/hooks/useQuoteForm.ts`
```typescript
45:export const useQuoteForm = ({ addQuote }: UseQuoteFormParams) => {
```

### `quotes/hooks/useCategoryItems.ts`
```typescript
17:export const useCategoryItems = ({
```

### `quotes/hooks/useQuoteTourSync.ts`
```typescript
21:export const useQuoteTourSync = ({
```

### `quotes/hooks/useQuotesFilters.ts`
```typescript
17:export const useQuotesFilters = ({
```

### `quotes/hooks/useQuoteCalculations.ts`
```typescript
19:export const useQuoteCalculations = ({
```

### `quotes/hooks/useQuoteTour.ts`
```typescript
29:export const useQuoteTour = ({
```

### `quotes/hooks/useQuoteGroupCostUpdate.ts`
```typescript
13:export const useQuoteGroupCostUpdate = ({
```

### `quotes/hooks/useMealOperations.ts`
```typescript
11:export const useMealOperations = ({ setCategories }: UseMealOperationsProps) => {
```

### `quotes/hooks/useAccommodationOperations.ts`
```typescript
13:export const useAccommodationOperations = ({
```

### `quotes/hooks/useQuotes.ts`
```typescript
17:export const useQuotesFeature = () => {
69:export const useQuotes = useQuotesFeature
```

### `quotes/services/quoteItinerarySync.ts`
```typescript
30:export async function syncHotelsFromQuoteToItinerary(
135:export async function syncHotelsFromItineraryToQuote(
```

### `quotes/services/quote.service.ts`
```typescript
124:export const quoteService = new QuoteService()
```

## orders

### `orders/types/member-surcharge.types.ts`
```typescript
17:export const DEFAULT_SURCHARGES: MemberSurcharges = {
25:export const SURCHARGE_LABELS = {
```

### `orders/types/order-member.types.ts`
```typescript
104:export const DEFAULT_EXPORT_COLUMNS: ExportColumnsConfig = {
```

### `orders/constants/labels.ts`
```typescript
3:export const COMP_ORDERS_LABELS = {
284:export const MEMBER_TABLE_HEADER_LABELS = {
312:export const EXPORT_DIALOG_LABELS = {
369:export const PASSPORT_CONFLICT_LABELS = {
387:export const BATCH_VISA_LABELS = {
409:export const ORDER_SERVICE_LABELS = {
417:export const PASSPORT_UPLOAD_LABELS = {
431:export const SIMPLE_ORDER_TABLE_LABELS = {
439:export const MEMBER_DATA_LABELS = {
448:export const ORDERS_PAGE_LABELS = {
```

### `orders/utils/compute-row-spans.ts`
```typescript
58:export function computeRowSpans({
```

### `orders/components/MemberTableHeader.tsx`
```typescript
127:export function MemberTableHeader({
```

### `orders/components/BatchVisaDialog.tsx`
```typescript
19:export function BatchVisaDialog({ open, onOpenChange, order }: BatchVisaDialogProps) {
```

### `orders/components/ExportDialog.tsx`
```typescript
43:export function ExportDialog({
```

### `orders/components/PassportImageEnhancer.tsx`
```typescript
25:export function PassportImageEnhancer({
```

### `orders/components/add-order-form.tsx`
```typescript
37:export function AddOrderForm({ tourId, onSubmit, onCancel, value, onChange }: AddOrderFormProps) {
```

### `orders/components/member-edit/constants/labels.ts`
```typescript
1:export const MEMBER_EDIT_LABELS = {
```

### `orders/components/member-edit/MemberInfoForm.tsx`
```typescript
16:export function MemberInfoForm({ formData, onChange }: MemberInfoFormProps) {
```

### `orders/components/member-edit/PassportSection.tsx`
```typescript
43:export function PassportSection({
```

### `orders/components/constants/labels.ts`
```typescript
1:export const ORDERS_LABELS = {
```

### `orders/components/CustomerMatchDialog.tsx`
```typescript
23:export function CustomerMatchDialog({
```

### `orders/components/member-row/MemberPassportInfo.tsx`
```typescript
26:export function MemberPassportInfo({
```

### `orders/components/member-row/MemberSurchargeCell.tsx`
```typescript
25:export function MemberSurchargeCell({
```

### `orders/components/member-row/constants/labels.ts`
```typescript
1:export const MEMBER_ROW_LABELS = {
```

### `orders/components/member-row/MemberBasicInfo.tsx`
```typescript
28:export function MemberBasicInfo({
```

### `orders/components/member-row/MemberActions.tsx`
```typescript
21:export function MemberActions({
```

### `orders/components/member-row/RoomAssignmentCell.tsx`
```typescript
38:export function RoomAssignmentCell({
```

### `orders/components/MemberEditDialog.tsx`
```typescript
102:export function MemberEditDialog({
```

### `orders/components/PassportConflictDialog.tsx`
```typescript
42:export function PassportConflictDialog({
```

### `orders/components/CustomCostFieldsSection.tsx`
```typescript
21:export function CustomCostFieldsSection({
```

### `orders/components/PnrMatchDialog.tsx`
```typescript
87:export function PnrMatchDialog({
```

### `orders/components/MemberRow.tsx`
```typescript
76:export function MemberRow({
```

### `orders/components/OrderMembersExpandable.tsx`
```typescript
154:export function OrderMembersExpandable({
```

### `orders/components/AddMemberDialog.tsx`
```typescript
38:export function AddMemberDialog({
```

### `orders/components/OrderSelectDialog.tsx`
```typescript
32:export function OrderSelectDialog({ isOpen, orders, onClose, onSelect }: OrderSelectDialogProps) {
```

### `orders/components/PassportUploadZone.tsx`
```typescript
35:export function PassportUploadZone({
```

### `orders/components/order-edit-dialog.tsx`
```typescript
32:export function OrderEditDialog({ open, onOpenChange, order, level = 2 }: OrderEditDialogProps) {
```

### `orders/components/pnr-name-matcher.ts`
```typescript
16:export function normalizeName(name: string): string {
28:export function splitPassportName(name: string): { surname: string; givenName: string } {
42:export function calculateSimilarity(str1: string, str2: string): number {
95:export function findBestMatch(
```

### `orders/components/simple-order-table.tsx`
```typescript
39:export const SimpleOrderTable = React.memo(function SimpleOrderTable({
```

### `orders/hooks/useMemberEditDialog.ts`
```typescript
17:export function useMemberEditDialog({ members, setMembers }: UseMemberEditDialogParams) {
```

### `orders/hooks/useOrders.ts`
```typescript
17:export const useOrdersFeature = () => {
127:export const useOrders = useOrdersFeature
```

### `orders/hooks/useOrderMembersData.ts`
```typescript
42:export function useOrderMembersData({
```

### `orders/hooks/usePassportUpload.ts`
```typescript
75:export function usePassportUpload({
```

### `orders/hooks/passport/usePassportValidation.ts`
```typescript
73:export function usePassportValidation(): UsePassportValidationReturn {
```

### `orders/hooks/passport/usePassportOcr.ts`
```typescript
63:export function usePassportOcr(): UsePassportOcrReturn {
```

### `orders/hooks/passport/usePassportFiles.ts`
```typescript
34:export function usePassportFiles(): UsePassportFilesReturn {
```

### `orders/hooks/useOrderMembers.ts`
```typescript
50:export function useOrderMembers({
```

### `orders/hooks/useBatchVisa.ts`
```typescript
39:export function useBatchVisa() {
```

### `orders/hooks/useMemberExport.ts`
```typescript
10:export const EXPORT_COLUMN_LABELS: Record<string, string> = {
44:export function useMemberExport(members: OrderMember[]) {
```

### `orders/hooks/useRoomVehicleAssignments.ts`
```typescript
33:export function isChildNotOccupyingBed(
42:export function isInfant(
106:export function useRoomVehicleAssignments({
```

### `orders/hooks/useColumnWidths.ts`
```typescript
34:export function useColumnWidths() {
```

### `orders/hooks/useCustomerMatch.ts`
```typescript
12:export function useCustomerMatch(
```

### `orders/services/order-stats.service.ts`
```typescript
28:export async function recalculateOrderAmount(order_id: string): Promise<void> {
112:export async function recalculatePaymentStatus(order_id: string): Promise<void> {
```

### `orders/services/order.service.ts`
```typescript
94:export const orderService = new OrderService()
```

### `orders/services/order_member.service.ts`
```typescript
8:export async function updateMembersTicketingDeadline(
20:export async function insertRoomAssignments(
28:export async function fetchAllCustomers() {
```

## confirmations

### `confirmations/components/parse-quote-items.ts`
```typescript
13:export function parseQuoteItems(
131:export function groupItemsByCategory(quoteItems: QuoteItem[]): Record<CategoryKey, QuoteItem[]> {
```

### `confirmations/components/requirements-list.types.ts`
```typescript
71:export const CATEGORIES: { key: CategoryKey; label: string; quoteCategoryId: string }[] = [
79:export function safeGetCategoryKey(category: string): CategoryKey {
```

### `confirmations/components/ConfirmationsList.tsx`
```typescript
23:export const ConfirmationsList: React.FC<ConfirmationsListProps> = ({
```

### `confirmations/components/constants/labels.ts`
```typescript
1:export const CONFIRMATIONS_LABELS = {
9:export const COMP_REQUIREMENTS_LABELS = {
```

### `confirmations/components/RequirementsList.tsx`
```typescript
48:export function RequirementsList({
```

### `confirmations/components/use-confirmation-sheet.ts`
```typescript
25:export function useConfirmationSheet({
```

### `confirmations/components/ConfirmationsPage.tsx`
```typescript
27:export const ConfirmationsPage: React.FC = () => {
```

### `confirmations/components/hooks/useRequirementsData.ts`
```typescript
73:export const CATEGORIES: { key: CategoryKey; label: string; quoteCategoryId: string }[] = [
86:export function useRequirementsData({
```

### `confirmations/services/requestCoreTableSync.ts`
```typescript
34:export async function updateRequestFields(
70:export async function markRequestSent(
98:export async function markRequestReplied(
112:export async function markRequestConfirmed(
123:export async function markRequestCancelled(
135:export async function fetchRequestableItems(
```

## payments

### `payments/constants/labels.ts`
```typescript
3:export const PAYMENTS_LABELS = {
```

### `payments/hooks/usePayments.ts`
```typescript
11:export const usePayments = () => {
```

### `payments/services/disbursement-order.service.ts`
```typescript
379:export const disbursementOrderService = new DisbursementOrderService()
```

### `payments/services/payment-request.service.ts`
```typescript
548:export const paymentRequestService = new PaymentRequestService()
```

## tour-confirmation

### `tour-confirmation/constants/currency.ts`
```typescript
8:export const DESTINATION_CURRENCY_MAP: Record<string, string> = {
89:export const CURRENCY_NAME_MAP: Record<string, string> = {
105:export const CURRENCY_SYMBOL_MAP: Record<string, string> = {
124:export function getDestinationCurrency(
145:export function getCurrencyName(code: string | null): string {
153:export function getCurrencySymbol(code: string | null | undefined): string {
161:export function formatCurrency(value: number | null | undefined): string {
171:export function formatDate(dateStr: string | null | undefined): string {
178:export function formatFlightDate(dateStr: string | null | undefined): string {
```

### `tour-confirmation/constants/labels.ts`
```typescript
3:export const CONFIRMATION_HEADER_LABELS = {
14:export const CONFIRMATION_SECTION_LABELS = {
28:export const COST_SUMMARY_LABELS = {
43:export const ITEM_EDIT_DIALOG_LABELS = {
59:export const TOUR_CONFIRMATION_SHEET_PAGE_LABELS = {
142:export const ITEM_EDIT_DIALOG_ADDITIONAL_LABELS = {
175:export const DAILY_ITINERARY_SECTION_LABELS = {
182:export const EXCHANGE_RATE_DIALOG_LABELS = {
192:export const HOTEL_CONFIRMATION_SECTION_LABELS = {
201:export const TOUR_INFO_LABELS = {
223:export const CONFIRM_HEADER_LABELS = {
```

### `tour-confirmation/components/sections/DailyItinerarySection.tsx`
```typescript
17:export function DailyItinerarySection({ itinerary }: DailyItinerarySectionProps) {
```

### `tour-confirmation/components/sections/ExchangeRateDialog.tsx`
```typescript
31:export function ExchangeRateDialog({
```

### `tour-confirmation/components/sections/constants/labels.ts`
```typescript
1:export const TOUR_CONFIRMATION_LABELS = {
```

### `tour-confirmation/components/sections/SettlementSection.tsx`
```typescript
19:export function SettlementSection({
```

### `tour-confirmation/components/sections/HotelConfirmationSection.tsx`
```typescript
33:export function HotelConfirmationSection({
```

### `tour-confirmation/components/sections/TourInfoSection.tsx`
```typescript
34:export function TourInfoSection({
```

### `tour-confirmation/components/TourConfirmationSheetPage.tsx`
```typescript
55:export function TourConfirmationSheetPage({ tour }: TourConfirmationSheetPageProps) {
```

### `tour-confirmation/components/ConfirmationHeader.tsx`
```typescript
32:export function ConfirmationHeader({ sheet, tour, onUpdate, saving }: ConfirmationHeaderProps) {
```

### `tour-confirmation/components/CostSummary.tsx`
```typescript
18:export function CostSummaryCard({ summary }: CostSummaryCardProps) {
```

### `tour-confirmation/components/ConfirmationSection.tsx`
```typescript
41:export function ConfirmationSection({
```

### `tour-confirmation/components/ItemEditDialog.tsx`
```typescript
64:export function ItemEditDialog({
```

### `tour-confirmation/components/CategoryItemRow.tsx`
```typescript
25:export function CategoryItemRow({
```

### `tour-confirmation/hooks/useTourSheetData.ts`
```typescript
80:export function useTourSheetData({ tourId, quoteId, departureDate }: UseTourSheetDataProps) {
```

### `tour-confirmation/hooks/useSheetItemActions.ts`
```typescript
68:export function useSheetItemActions({
```

### `tour-confirmation/hooks/useCurrencyConversion.ts`
```typescript
27:export function useCurrencyConversion({
```

### `tour-confirmation/hooks/useInlineEditing.ts`
```typescript
14:export function useInlineEditing({ updateItem }: UseInlineEditingOptions) {
```

### `tour-confirmation/hooks/useTourConfirmationSheet.ts`
```typescript
29:export function useTourConfirmationSheet({ tourId }: UseTourConfirmationSheetProps) {
```

### `tour-confirmation/services/syncToOnline.ts`
```typescript
75:export async function syncTripToOnline(tourId: string): Promise<SyncResult> {
```

### `tour-confirmation/services/confirmationCoreTableSync.ts`
```typescript
24:export async function syncConfirmationCreateToCore(params: {
65:export async function syncConfirmationUpdateToCore(params: {
127:export async function syncLeaderExpenseToCore(params: {
170:export async function batchSyncConfirmationToCore(params: {
```

## disbursement

### `disbursement/constants/labels.ts`
```typescript
3:export const DISBURSEMENT_HOOK_LABELS = {
8:export const DISBURSEMENT_LABELS = {
148:export const PRINT_LABELS = {
```

### `disbursement/components/DisbursementDialog.tsx`
```typescript
35:export function DisbursementDialog({
```

### `disbursement/components/DisbursementColumns.tsx`
```typescript
37:export function usePendingColumns({ selectedRequests, onSelectRequest }: UsePendingColumnsProps) {
116:export function useCurrentOrderColumns({ currentOrder, onRemove }: UseCurrentOrderColumnsProps) {
186:export function useHistoryColumns({ onPrintPDF, getEmployeeName }: UseHistoryColumnsProps) {
```

### `disbursement/components/DisbursementPage.tsx`
```typescript
37:export function DisbursementPage() {
```

### `disbursement/components/CreateDisbursementDialog.tsx`
```typescript
36:export function CreateDisbursementDialog({
```

### `disbursement/components/PrintDisbursementPreview.tsx`
```typescript
134:export const PrintDisbursementPreview = forwardRef<HTMLDivElement, PrintDisbursementPreviewProps>(
```

### `disbursement/components/constants/labels.ts`
```typescript
1:export const DISBURSEMENT_LABELS = {
```

### `disbursement/components/create-dialog/DisbursementForm.tsx`
```typescript
33:export function DisbursementForm({
```

### `disbursement/components/create-dialog/DisbursementItemList.tsx`
```typescript
32:export function DisbursementItemList({
```

### `disbursement/components/DisbursementList.tsx`
```typescript
30:export function PendingList({
101:export function CurrentOrderList({
167:export function EmptyCurrentOrder({ onNavigate }: EmptyCurrentOrderProps) {
189:export function HistoryList({ data, searchTerm, onPrintPDF }: HistoryListProps) {
226:export function SupplierGroupList({ groups, searchTerm }: SupplierGroupListProps) {
```

### `disbursement/components/DisbursementDetailDialog.tsx`
```typescript
37:export function DisbursementDetailDialog({
```

### `disbursement/components/DisbursementPrintDialog.tsx`
```typescript
31:export function DisbursementPrintDialog({
```

### `disbursement/constants.ts`
```typescript
9:export const DISBURSEMENT_STATUS_LABELS = {
16:export const DISBURSEMENT_STATUS_COLORS = {
23:export const DISBURSEMENT_STATUS = {
30:export const PAYMENT_REQUEST_STATUS_LABELS = {
37:export const PAYMENT_REQUEST_STATUS_COLORS = {
```

### `disbursement/hooks/useDisbursementPDF.ts`
```typescript
13:export function useDisbursementPDF() {
```

### `disbursement/hooks/useDisbursementForm.ts`
```typescript
9:export function useDisbursementForm(pendingRequests: PaymentRequest[]) {
```

### `disbursement/hooks/useDisbursementData.ts`
```typescript
60:export function useDisbursementData() {
```

### `disbursement/hooks/useCreateDisbursement.ts`
```typescript
66:export function useCreateDisbursement({
```

### `disbursement/hooks/useDisbursementFilters.ts`
```typescript
10:export function useDisbursementFilters() {
```

