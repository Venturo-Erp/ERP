/**
 * 簽證類型定義（共用）
 * 新增簽證類型只需要在這裡加，訂單快速開單和簽證管理都會自動更新
 */

interface VisaTypeGroup {
  /** 分組標籤 */
  label: string
  /** 該分組下的簽證類型 */
  types: string[]
}

/** 簽證類型標籤 */
const VISA_TYPE_LABELS = {
  // 分組
  group_passport: '護照',
  group_taiwan: '台胞證',
  group_usa: '美國簽證',
  // 類型
  type_passport_adult: '護照 成人',
  type_passport_child: '護照 兒童',
  type_passport_adult_lost: '護照 成人 遺失件',
  type_passport_child_lost: '護照 兒童 遺失件',
  type_taiwan: '台胞證',
  type_taiwan_lost: '台胞證 遺失件',
  type_taiwan_first: '台胞證 首辦',
  type_usa_esta: '美國 ESTA',
} as const

/** 簽證類型分組（新增簽證類型時只需修改這裡） */
export const VISA_TYPE_GROUPS: VisaTypeGroup[] = [
  {
    label: VISA_TYPE_LABELS.group_passport,
    types: [
      VISA_TYPE_LABELS.type_passport_adult,
      VISA_TYPE_LABELS.type_passport_child,
      VISA_TYPE_LABELS.type_passport_adult_lost,
      VISA_TYPE_LABELS.type_passport_child_lost,
    ],
  },
  {
    label: VISA_TYPE_LABELS.group_taiwan,
    types: [
      VISA_TYPE_LABELS.type_taiwan,
      VISA_TYPE_LABELS.type_taiwan_lost,
      VISA_TYPE_LABELS.type_taiwan_first,
    ],
  },
  {
    label: VISA_TYPE_LABELS.group_usa,
    types: [VISA_TYPE_LABELS.type_usa_esta],
  },
]
