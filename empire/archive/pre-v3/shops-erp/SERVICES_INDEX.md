# Services 層索引

**掃描時間**: 2026-03-14 10:41

## tours (6 services)

### `profit-calculation.service.ts` (258 行)

**主要函數：**
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

### `tour-channel.service.ts` (167 行)

**主要函數：**
```typescript
23:export async function createTourChannel(
108:export async function addMembersToTourChannel(
```

### `tour-stats.service.test.ts` (85 行)

**主要函數：**
```typescript
```

### `tour_dependency.service.ts` (176 行)

**主要函數：**
```typescript
20:export async function checkTourDependencies(tourId: string): Promise<TourDependencyCheck> {
50:export async function checkTourPaidOrders(
73:export async function deleteTourEmptyOrders(tourId: string): Promise<void> {
84:export async function unlinkTourQuotes(tourId: string): Promise<number> {
112:export async function unlinkTourItineraries(tourId: string): Promise<number> {
151:export async function fetchTourPnrs(tourId: string): Promise<unknown[]> {
163:export async function fetchPnrsByLocators(locators: string[]): Promise<unknown[]> {
```

### `tour-stats.service.ts` (82 行)

**主要函數：**
```typescript
27:export async function recalculateParticipants(tour_id: string): Promise<void> {
```

### `tour.service.ts` (379 行)

**主要函數：**
```typescript
```

## quotes (2 services)

### `quoteItinerarySync.ts` (265 行)

**主要函數：**
```typescript
30:export async function syncHotelsFromQuoteToItinerary(
135:export async function syncHotelsFromItineraryToQuote(
```

### `quote.service.ts` (124 行)

**主要函數：**
```typescript
```

## orders (4 services)

### `order-stats.service.ts` (148 行)

**主要函數：**
```typescript
28:export async function recalculateOrderAmount(order_id: string): Promise<void> {
112:export async function recalculatePaymentStatus(order_id: string): Promise<void> {
```

### `order.service.ts` (94 行)

**主要函數：**
```typescript
```

### `order-stats.service.test.ts` (127 行)

**主要函數：**
```typescript
```

### `order_member.service.ts` (39 行)

**主要函數：**
```typescript
8:export async function updateMembersTicketingDeadline(
20:export async function insertRoomAssignments(
28:export async function fetchAllCustomers() {
```

## confirmations (1 services)

### `requestCoreTableSync.ts` (157 行)

**主要函數：**
```typescript
34:export async function updateRequestFields(
70:export async function markRequestSent(
98:export async function markRequestReplied(
112:export async function markRequestConfirmed(
123:export async function markRequestCancelled(
135:export async function fetchRequestableItems(
```

## payments (2 services)

### `disbursement-order.service.ts` (379 行)

**主要函數：**
```typescript
```

### `payment-request.service.ts` (548 行)

**主要函數：**
```typescript
```

## tour-confirmation (2 services)

### `syncToOnline.ts` (366 行)

**主要函數：**
```typescript
75:export async function syncTripToOnline(tourId: string): Promise<SyncResult> {
```

### `confirmationCoreTableSync.ts` (224 行)

**主要函數：**
```typescript
24:export async function syncConfirmationCreateToCore(params: {
65:export async function syncConfirmationUpdateToCore(params: {
127:export async function syncLeaderExpenseToCore(params: {
170:export async function batchSyncConfirmationToCore(params: {
```

