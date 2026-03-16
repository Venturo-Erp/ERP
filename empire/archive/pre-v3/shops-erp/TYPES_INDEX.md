# 型別定義索引

**掃描時間**: 2026-03-14 10:40

## 核心型別定義

### tours

#### `tour-display.types.ts`
```typescript
10:export type {
30:export type { LeaderInfo, HotelInfo } from '@/stores/types/tour.types'
60:export interface TourPageData {
128:export interface TourPageProps {
137:export interface TourPreviewProps {
```

#### `index.ts`
```typescript
```

#### `tour-itinerary-item.types.ts`
```typescript
19:export type ItineraryItemCategory =
29:export type MealSubCategory = (typeof MEAL_SUB_CATEGORIES)[keyof typeof MEAL_SUB_CATEGORIES]
59:export interface TourItineraryItem {
132:export type TourItineraryItemCreate = Omit<
139:export type TourItineraryItemUpdate = Partial<
```

### quotes

#### `index.ts`
```typescript
5:export type CostItemResourceType = 'restaurant' | 'hotel' | 'attraction' | 'supplier'
7:export interface CostItem {
53:export interface CostCategory {
60:export interface ParticipantCounts {
68:export interface RoomTypePrice {
73:export interface SellingPrices {
83:export interface IdentityCosts {
91:export interface IdentityProfits {
99:export interface AccommodationSummaryItem {
128:export interface TierPricing {
```

### orders

#### `member-surcharge.types.ts`
```typescript
5:export interface SurchargeItem {
10:export interface MemberSurcharges {
```

#### `order-member.types.ts`
```typescript
12:export interface OrderMember {
66:export interface ProcessedFile {
77:export interface CustomCostField {
87:export interface ExportColumnsConfig {
125:export interface OrderMembersExpandableProps {
145:export interface MemberRowProps {
165:export interface MemberEditDialogProps {
176:export interface PassportUploadZoneProps {
189:export interface AddMemberDialogProps {
197:export interface ExportDialogProps {
```

### confirmations

### payments

### tour-confirmation

## 資料庫 Schema

### tour_itinerary_items 欄位
export interface TourItineraryItem {
  // 主鍵 & 關聯
  id: string
  tour_id: string | null
  itinerary_id: string | null
  workspace_id: string

  // 行程欄位
  day_number: number | null
  sort_order: number
  category: ItineraryItemCategory | null
  sub_category: string | null
  title: string | null
  description: string | null
  service_date: string | null
  service_date_end: string | null
  resource_type: string | null
  resource_id: string | null
  resource_name: string | null
  latitude: number | null
  longitude: number | null
  google_maps_url: string | null

  // 報價欄位
  unit_price: number | null
  quantity: number | null
  total_cost: number | null
  currency: string
  pricing_type: string | null
  adult_price: number | null
  child_price: number | null
  infant_price: number | null
  quote_note: string | null
  quote_item_id: string | null

  // 需求欄位
  supplier_id: string | null
  supplier_name: string | null
  request_id: string | null
  request_status: string
  request_sent_at: string | null
  request_reply_at: string | null
  reply_content: Record<string, unknown> | null
  reply_cost: number | null
  estimated_cost: number | null
  quoted_cost: number | null

  // 確認欄位
  confirmation_item_id: string | null
  confirmed_cost: number | null
  booking_reference: string | null
  booking_status: string | null
  confirmation_date: string | null
  confirmation_note: string | null

  // 領隊回填欄位
  actual_expense: number | null
  expense_note: string | null
  expense_at: string | null
  receipt_images: string[] | null
