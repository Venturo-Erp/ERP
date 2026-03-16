# Hooks 索引

**掃描時間**: 2026-03-14 10:40

## tours (26 hooks)

### `useTourItineraryNav.ts` (54 行)

```typescript
6:export function useTourItineraryNav<T>(dailyItinerary: T[]) {
```

### `useTourDepartureTotals.ts` (51 行)

```typescript
13:export function useTourDepartureTotals(
```

### `useItineraryHiddenItems.ts` (140 行)

```typescript
27:export function useItineraryHiddenItems(itineraryId: string | null) {
```

### `useQuoteLoader.ts` (351 行)

```typescript
33:export function useQuoteLoader(
```

### `useTourScrollEffects.ts` (148 行)

```typescript
10:export function useTourScrollEffects({ viewMode, isPreview }: ScrollEffectsOptions) {
```

### `useTours-advanced.ts` (328 行)

```typescript
47:export function useTours(params?: PageRequest): UseEntityResult<Tour> {
214:export function useTourDetails(tour_id: string) {
```

### `useToursForm.ts` (95 行)

```typescript
19:export function useToursForm({ state, openDialog }: UseToursFormParams): UseToursFormReturn {
```

### `useTourEdit.ts` (645 行)

```typescript
68:export function useTourEdit(params: UseTourEditParams) {
```

### `useTourItineraryItems.ts` (399 行)

```typescript
34:export function useTourItineraryItemsByTour(tour_id: string | null) {
60:export function useTourItineraryItemsByItinerary(itinerary_id: string | null) {
159:export function useSyncItineraryToCore() {
```

### `useTourGallery.ts` (30 行)

```typescript
9:export function useTourGallery({ viewMode }: GalleryOptions) {
```

### `useTourPageState.ts` (169 行)

```typescript
12:export function useTourPageState() {
```

### `useTourDepartureData.ts` (154 行)

```typescript
16:export function useTourDepartureData(tourId: string, open: boolean) {
```

### `useTourForm.ts` (110 行)

```typescript
16:export function useTourForm({ newTour, setNewTour }: UseTourFormProps) {
```

### `useToursPaginated.ts` (367 行)

```typescript
54:export function useToursPaginated(params: UseToursPaginatedParams): UseToursPaginatedResult {
290:export function useTourDetailsPaginated(tourId: string | null) {
```

### `useTourHealth.ts` (287 行)

```typescript
43:export function useTourHealth(tourId: string): TourHealthData {
```

### `useToursPage.ts` (140 行)

```typescript
55:export function useToursPage(): UseToursPageReturn {
```

### `useAirports.ts` (228 行)

```typescript
85:export function useAirports(options: UseAirportsOptions = {}) {
```

### `useTourPayments.ts` (448 行)

```typescript
28:export function useTourPayments({
```

### `useTourDestinations.ts` (230 行)

```typescript
73:export function useTourDestinations(options: UseTourDestinationsOptions = {}) {
```

### `index.ts` (19 行)

```typescript
```

### `useCoreRequestItems.ts` (164 行)

```typescript
117:export function useCoreRequestItems(tourId: string | null, supplierId: string | null) {
159:export function useTotalPax(tourId: string | null) {
```

### `useToursDialogs.ts` (190 行)

```typescript
70:export function useToursDialogs(): UseToursDialogsReturn {
```

### `useTourOperations.ts` (436 行)

```typescript
42:export function useTourOperations(params: UseTourOperationsParams) {
```

### `useTours.ts` (78 行)

```typescript
23:export const useTours = () => {
```

### `useTourDailyData.ts` (130 行)

```typescript
31:export function useTourDailyData(
102:export function extractMealsFromCoreItems(items: TourItineraryItem[]) {
114:export function extractAccommodationFromCoreItems(items: TourItineraryItem[]) {
122:export function extractActivitiesFromCoreItems(items: TourItineraryItem[]) {
```

### `useTourMemberEditor.ts` (437 行)

```typescript
44:export function useTourMemberEditor(
```

## quotes (18 hooks)

### `useQuoteSave.ts` (163 行)

```typescript
46:export const useQuoteSave = ({
```

### `useQuickQuoteForm.ts` (179 行)

```typescript
52:export const useQuickQuoteForm = ({ addQuote }: UseQuickQuoteFormParams) => {
```

### `useCategoryOperations.ts` (125 行)

```typescript
20:export const useCategoryOperations = ({
```

### `useQuoteActions.ts` (115 行)

```typescript
49:export const useQuoteActions = ({
```

### `useQuoteState.ts` (401 行)

```typescript
21:export const useQuoteState = () => {
```

### `useTransportOperations.ts` (248 行)

```typescript
13:export const useTransportOperations = ({
```

### `useQuickQuoteDetail.ts` (177 行)

```typescript
26:export function useQuickQuoteDetail({ quote, onUpdate }: UseQuickQuoteDetailProps) {
```

### `useActivityOperations.ts` (63 行)

```typescript
11:export const useActivityOperations = ({
```

### `useQuoteForm.ts` (187 行)

```typescript
45:export const useQuoteForm = ({ addQuote }: UseQuoteFormParams) => {
```

### `useCategoryItems.ts` (195 行)

```typescript
17:export const useCategoryItems = ({
```

### `useQuoteTourSync.ts` (67 行)

```typescript
21:export const useQuoteTourSync = ({
```

### `useQuotesFilters.ts` (67 行)

```typescript
17:export const useQuotesFilters = ({
```

### `useQuoteCalculations.ts` (250 行)

```typescript
19:export const useQuoteCalculations = ({
```

### `useQuoteTour.ts` (118 行)

```typescript
29:export const useQuoteTour = ({
```

### `useQuoteGroupCostUpdate.ts` (156 行)

```typescript
13:export const useQuoteGroupCostUpdate = ({
```

### `useMealOperations.ts` (45 行)

```typescript
11:export const useMealOperations = ({ setCategories }: UseMealOperationsProps) => {
```

### `useAccommodationOperations.ts` (90 行)

```typescript
13:export const useAccommodationOperations = ({
```

### `useQuotes.ts` (69 行)

```typescript
17:export const useQuotesFeature = () => {
69:export const useQuotes = useQuotesFeature
```

## orders (14 hooks)

### `useMemberEditDialog.ts` (234 行)

```typescript
17:export function useMemberEditDialog({ members, setMembers }: UseMemberEditDialogParams) {
```

### `useOrders.ts` (127 行)

```typescript
17:export const useOrdersFeature = () => {
127:export const useOrders = useOrdersFeature
```

### `useOrderMembersData.ts` (461 行)

```typescript
42:export function useOrderMembersData({
```

### `usePassportUpload.ts` (337 行)

```typescript
75:export function usePassportUpload({
```

### `usePassportValidation.ts` (358 行)

```typescript
73:export function usePassportValidation(): UsePassportValidationReturn {
```

### `usePassportOcr.ts` (196 行)

```typescript
63:export function usePassportOcr(): UsePassportOcrReturn {
```

### `usePassportFiles.ts` (279 行)

```typescript
34:export function usePassportFiles(): UsePassportFilesReturn {
```

### `useOrderMembers.ts` (397 行)

```typescript
50:export function useOrderMembers({
```

### `useBatchVisa.ts` (117 行)

```typescript
39:export function useBatchVisa() {
```

### `useMemberExport.ts` (226 行)

```typescript
10:export const EXPORT_COLUMN_LABELS: Record<string, string> = {
44:export function useMemberExport(members: OrderMember[]) {
```

### `index.ts` (10 行)

```typescript
```

### `useRoomVehicleAssignments.ts` (865 行)

```typescript
33:export function isChildNotOccupyingBed(
42:export function isInfant(
106:export function useRoomVehicleAssignments({
```

### `useColumnWidths.ts` (87 行)

```typescript
34:export function useColumnWidths() {
```

### `useCustomerMatch.ts` (177 行)

```typescript
12:export function useCustomerMatch(
```

## payments (1 hooks)

### `usePayments.ts` (161 行)

```typescript
11:export const usePayments = () => {
```

## tour-confirmation (5 hooks)

### `useTourSheetData.ts` (445 行)

```typescript
80:export function useTourSheetData({ tourId, quoteId, departureDate }: UseTourSheetDataProps) {
```

### `useSheetItemActions.ts` (562 行)

```typescript
68:export function useSheetItemActions({
```

### `useCurrencyConversion.ts` (190 行)

```typescript
27:export function useCurrencyConversion({
```

### `useInlineEditing.ts` (99 行)

```typescript
14:export function useInlineEditing({ updateItem }: UseInlineEditingOptions) {
```

### `useTourConfirmationSheet.ts` (432 行)

```typescript
29:export function useTourConfirmationSheet({ tourId }: UseTourConfirmationSheetProps) {
```

