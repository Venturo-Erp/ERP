/**
 * TourPrintDialog 常數定義
 */

import type { ExportColumnsConfig } from '@/features/orders/types/order-member.types'
import { COMP_TOURS_LABELS } from '../constants/labels'

// 成員名單欄位標籤
export const COLUMN_LABELS: Record<keyof ExportColumnsConfig, string> = {
  identity: COMP_TOURS_LABELS.身份,
  chinese_name: COMP_TOURS_LABELS.中文姓名,
  passport_name: COMP_TOURS_LABELS.護照姓名,
  birth_date: COMP_TOURS_LABELS.生日,
  gender: COMP_TOURS_LABELS.性別,
  id_number: COMP_TOURS_LABELS.身分證號,
  passport_number: COMP_TOURS_LABELS.護照號碼,
  passport_expiry: COMP_TOURS_LABELS.護照效期,
  special_meal: COMP_TOURS_LABELS.特殊餐食,
  remarks: COMP_TOURS_LABELS.備註,
  // 金額相關欄位放最後
  total_payable: COMP_TOURS_LABELS.應付金額,
  deposit_amount: COMP_TOURS_LABELS.已付訂金,
  balance: COMP_TOURS_LABELS.尾款,
}

// 預設欄位選擇
export const DEFAULT_COLUMNS: ExportColumnsConfig = {
  identity: false,
  chinese_name: true,
  passport_name: true,
  birth_date: true,
  gender: true,
  id_number: false,
  passport_number: true,
  passport_expiry: true,
  special_meal: true,
  remarks: false,
  // 金額相關欄位預設顯示
  total_payable: true,
  deposit_amount: true,
  balance: true,
}

// 艙等代碼對照表
export const CLASS_NAMES: Record<string, string> = {
  F: COMP_TOURS_LABELS.頭等艙,
  C: COMP_TOURS_LABELS.商務艙,
  J: COMP_TOURS_LABELS.商務艙,
  W: COMP_TOURS_LABELS.豪華經濟艙,
  Y: COMP_TOURS_LABELS.經濟艙,
  B: COMP_TOURS_LABELS.經濟艙,
  M: COMP_TOURS_LABELS.經濟艙,
  H: COMP_TOURS_LABELS.經濟艙,
  K: COMP_TOURS_LABELS.經濟艙,
  L: COMP_TOURS_LABELS.經濟艙,
  Q: COMP_TOURS_LABELS.經濟艙,
  T: COMP_TOURS_LABELS.經濟艙,
  V: COMP_TOURS_LABELS.經濟艙,
  X: COMP_TOURS_LABELS.經濟艙,
}

// 狀態代碼對照表
const STATUS_NAMES: Record<string, string> = {
  HK: 'OK',
  TK: COMP_TOURS_LABELS.已開票,
  UC: COMP_TOURS_LABELS.未確認,
  XX: COMP_TOURS_LABELS.取消,
  HX: COMP_TOURS_LABELS.已刪除,
  HL: COMP_TOURS_LABELS.候補,
  HN: COMP_TOURS_LABELS.需確認,
  LL: COMP_TOURS_LABELS.候補中,
  WL: COMP_TOURS_LABELS.候補,
}
