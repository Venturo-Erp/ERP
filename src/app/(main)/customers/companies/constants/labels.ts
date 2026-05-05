import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

export const COMPANY_LABELS = {
  // Page
  PAGE_TITLE: '企業客戶管理',
  ADD_COMPANY: '新增企業',
  SEARCH_PLACEHOLDER: '搜尋企業名稱、統編或聯絡資訊...',

  // CRUD Messages
  UPDATE_SUCCESS: '企業客戶更新成功',
  UPDATE_FAILED: '更新企業客戶失敗',
  CREATE_SUCCESS: '企業客戶新增成功',
  CREATE_FAILED: '新增企業客戶失敗',
  DELETE_SUCCESS: '企業客戶刪除成功',
  DELETE_FAILED: '刪除企業客戶失敗',
  CHECK_CONTACTS_FAILED: '檢查聯絡人時發生錯誤',

  // Delete Confirmation
  DELETE_TITLE: '刪除企業客戶',
  DELETE_CONFIRM: '確定刪除',
  DELETE_CANCEL: '取消',
  DELETE_WITH_CONTACTS: (count: number, contactInfo: string, companyName: string) =>
    `此企業有 ${count} 位關聯的聯絡人（${contactInfo}），刪除企業將同時刪除這些聯絡人。\n\n確定要刪除企業「${companyName}」嗎？`,
  DELETE_SIMPLE: (companyName: string) => `確定要刪除企業「${companyName}」嗎？`,
  CONTACTS_OVERFLOW: (names: string, count: number) => `${names}... 等 ${count} 位聯絡人`,

  // CompanyDetailDialog
  DETAIL_BASIC_INFO: '基本資訊',
  DETAIL_COMPANY_NAME: '企業名稱',
  DETAIL_TAX_ID: '統一編號',
  DETAIL_PHONE: '聯絡電話',
  DETAIL_WEBSITE: '網站',
  DETAIL_CREATED_DATE: '建立日期',
  DETAIL_PAYMENT_INFO: '付款資訊',
  DETAIL_PAYMENT_METHOD: '付款方式',
  DETAIL_PAYMENT_TERMS: '付款期限',
  DETAIL_PAYMENT_IMMEDIATE: '即付',
  DETAIL_PAYMENT_DAYS: '天',
  DETAIL_CREDIT_LIMIT: '信用額度',
  DETAIL_INVOICE_INFO: '發票資訊',
  DETAIL_INVOICE_TITLE: '發票抬頭',
  DETAIL_INVOICE_ADDRESS: '發票地址',
  DETAIL_INVOICE_EMAIL: '發票 Email',
  DETAIL_BANK_INFO: '銀行資訊',
  DETAIL_BANK_NAME: '銀行名稱',
  DETAIL_BRANCH: '分行',
  DETAIL_ACCOUNT: '帳號',
  DETAIL_ADDRESS_INFO: '地址資訊',
  DETAIL_REGISTERED_ADDRESS: '登記地址',
  DETAIL_MAILING_ADDRESS: '通訊地址',
  DETAIL_NOTES: '備註',
  DETAIL_CLOSE: '關閉',
  DETAIL_EDIT: '編輯',
  DETAIL_REGULAR_CUSTOMER: '普通客戶',

  // CompanyTableColumns
  COL_COMPANY_NAME: '企業名稱',
  COL_TAX_ID_PREFIX: '統編：',
  COL_VIP_LEVEL: 'VIP 等級',
  COL_PHONE: '聯絡電話',
  COL_PAYMENT_TERMS: '付款條件',
  COL_CREDIT_LIMIT: '信用額度',
  COL_CREATED_DATE: '建立日期',
  COL_ACTIONS: '操作',
  COL_EDIT_TITLE: '編輯企業',
  COL_DELETE_TITLE: '刪除企業',

  // CompanyFormDialog
  FORM_NOTES_LABEL: '備註',
  FORM_NOTES_PLACEHOLDER: '其他備註資訊...',
  PLACEHOLDER_TAX_ID: '12345678',
  PLACEHOLDER_PHONE: '02-1234-5678',
  PLACEHOLDER_EMAIL: 'contact@company.com',
  PLACEHOLDER_WEBSITE: 'https://www.company.com',
  PLACEHOLDER_CREDIT_LIMIT: '0',
  PLACEHOLDER_INVOICE_EMAIL: 'invoice@company.com',
}
