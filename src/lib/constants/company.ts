import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

/**
 * 公司相關常數
 * 用於統一管理公司名稱、標語等固定文字
 */

export const COMPANY = {
  /** 公司名稱 */
  name: 'VENTURO',

  /** 公司法定名稱（用於報價單頁尾等正式文件） */
  legalName: '{COMPANY_NAME}股份有限公司',

  /** 公司副標題/標語 */
  subtitle: '如果可以，讓我們一起探索世界的每個角落',

  /** 公司副標題（帶裝飾線） */
  subtitleWithDash: '─ 如果可以，讓我們一起探索世界的每個角落 ─',

  /** 公司地址 */
  address: '台北市中山區南京東路三段168號',

  /** 公司電話 */
  phone: '(02) 2545-1234',

  /** 公司傳真 */
  fax: '(02) 2545-5678',

  /** 公司 Email */
  email: 'info@venturo.com.tw',
} as const
