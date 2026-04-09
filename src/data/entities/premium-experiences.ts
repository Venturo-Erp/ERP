'use client'

/**
 * Premium Experiences Entity - 頂級體驗
 */

import { createEntityHook } from '../core/createEntityHook'
import { CACHE_PRESETS } from '../core/types'

export interface PremiumExperience {
  id: string
  name: string
  name_en: string | null
  description: string
  description_en: string | null
  category: string
  city_id: string
  country_id: string
  region_id: string | null
  price_range: string | null
  currency: string | null
  rating: number | null
  display_order: number | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  created_by: string | null
}

export const premiumExperienceEntity = createEntityHook<PremiumExperience>('premium_experiences', {
  list: {
    select:
      'id,name,name_en,description,description_en,category,city_id,country_id,region_id,price_range,currency,rating,display_order,is_active,created_at,updated_at,created_by',
    orderBy: { column: 'display_order', ascending: true },
  },
  slim: {
    select: 'id,name,category,city_id,country_id,is_active',
  },
  detail: { select: '*' },
  cache: CACHE_PRESETS.medium,
  workspaceScoped: false,
})

export const usePremiumExperiences = premiumExperienceEntity.useList
export const usePremiumExperiencesSlim = premiumExperienceEntity.useListSlim
export const usePremiumExperience = premiumExperienceEntity.useDetail
export const usePremiumExperiencesPaginated = premiumExperienceEntity.usePaginated
export const usePremiumExperienceDictionary = premiumExperienceEntity.useDictionary

export const createPremiumExperience = premiumExperienceEntity.create
export const updatePremiumExperience = premiumExperienceEntity.update
export const deletePremiumExperience = premiumExperienceEntity.delete
export const invalidatePremiumExperiences = premiumExperienceEntity.invalidate
