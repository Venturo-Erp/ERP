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
      'id,name,english_name,name_local,tagline,country_id,region_id,city_id,specific_location,latitude,longitude,category,sub_category,exclusivity_level,description,description_en,highlights,what_makes_it_special,expert_name,expert_title,expert_credentials,expert_profile,duration_hours,group_size_min,group_size_max,language_support,difficulty_level,physical_requirement,available_seasons,best_time_of_day,advance_booking_days,price_per_person_min,price_per_person_max,currency,price_includes,price_excludes,commission_rate,net_price_per_person,booking_contact,booking_email,booking_phone,cancellation_policy,minimum_participants,dress_code,what_to_bring,restrictions,meeting_point,meeting_point_coords,transportation_included,pickup_service,inclusions,images,thumbnail,video_url,certifications,awards,media_features,recommended_for,best_for_age_group,suitable_for_children,related_attractions,combine_with,sustainability_practices,supports_local_community,eco_friendly,ratings,review_count,is_active,is_featured,display_order,internal_notes,created_at,updated_at,created_by,updated_by',
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
