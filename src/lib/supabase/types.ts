export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      _migrations: {
        Row: {
          executed_at: string | null
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          id?: number
          name: string
        }
        Update: {
          executed_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      accounting_accounts: {
        Row: {
          available_credit: number | null
          balance: number
          color: string | null
          created_at: string | null
          credit_limit: number | null
          currency: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_credit?: number | null
          balance?: number
          color?: string | null
          created_at?: string | null
          credit_limit?: number | null
          currency?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_credit?: number | null
          balance?: number
          color?: string | null
          created_at?: string | null
          credit_limit?: number | null
          currency?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      accounting_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          type: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          type: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      accounting_entries: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          deleted_at: string | null
          description: string
          entry_date: string
          entry_number: string
          entry_type: string
          id: string
          invoice_number: string | null
          notes: string | null
          payment_method: string | null
          recorded_by: string
          subcategory: string | null
          supplier_id: string | null
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          deleted_at?: string | null
          description: string
          entry_date: string
          entry_number: string
          entry_type: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string | null
          recorded_by: string
          subcategory?: string | null
          supplier_id?: string | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          entry_type?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string
          subcategory?: string | null
          supplier_id?: string | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      accounting_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          event_date: string
          event_type: Database['public']['Enums']['accounting_event_type']
          group_id: string | null
          id: string
          memo: string | null
          meta: Json | null
          reversal_event_id: string | null
          source_id: string | null
          source_type: string | null
          status: Database['public']['Enums']['accounting_event_status'] | null
          tour_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          event_date: string
          event_type: Database['public']['Enums']['accounting_event_type']
          group_id?: string | null
          id?: string
          memo?: string | null
          meta?: Json | null
          reversal_event_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database['public']['Enums']['accounting_event_status'] | null
          tour_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          event_date?: string
          event_type?: Database['public']['Enums']['accounting_event_type']
          group_id?: string | null
          id?: string
          memo?: string | null
          meta?: Json | null
          reversal_event_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database['public']['Enums']['accounting_event_status'] | null
          tour_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_events_reversal_event_id_fkey'
            columns: ['reversal_event_id']
            isOneToOne: false
            referencedRelation: 'accounting_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_events_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_events_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_events_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      accounting_period_closings: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_voucher_id: string | null
          created_at: string | null
          id: string
          net_income: number
          period_end: string
          period_start: string
          period_type: string
          workspace_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_voucher_id?: string | null
          created_at?: string | null
          id?: string
          net_income?: number
          period_end: string
          period_start: string
          period_type: string
          workspace_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_voucher_id?: string | null
          created_at?: string | null
          id?: string
          net_income?: number
          period_end?: string
          period_start?: string
          period_type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_period_closings_closed_by_fkey'
            columns: ['closed_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_period_closings_closing_voucher_id_fkey'
            columns: ['closing_voucher_id']
            isOneToOne: false
            referencedRelation: 'journal_vouchers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_period_closings_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          end_date: string
          id: string
          is_closed: boolean | null
          period_name: string
          start_date: string
          workspace_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_closed?: boolean | null
          period_name: string
          start_date: string
          workspace_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_closed?: boolean | null
          period_name?: string
          start_date?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_periods_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      accounting_subjects: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          level: number | null
          name: string
          parent_id: string | null
          type: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          level?: number | null
          name: string
          parent_id?: string | null
          type: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          level?: number | null
          name?: string
          parent_id?: string | null
          type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_subjects_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'accounting_subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_subjects_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      accounting_transactions: {
        Row: {
          account_id: string
          account_name: string | null
          amount: number
          category_id: string | null
          category_name: string | null
          created_at: string | null
          currency: string
          date: string
          description: string | null
          id: string
          to_account_id: string | null
          to_account_name: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          account_name?: string | null
          amount: number
          category_id?: string | null
          category_name?: string | null
          created_at?: string | null
          currency?: string
          date?: string
          description?: string | null
          id?: string
          to_account_id?: string | null
          to_account_name?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          account_name?: string | null
          amount?: number
          category_id?: string | null
          category_name?: string | null
          created_at?: string | null
          currency?: string
          date?: string
          description?: string | null
          id?: string
          to_account_id?: string | null
          to_account_name?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'accounting_transactions_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounting_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accounting_transactions_to_account_id_fkey'
            columns: ['to_account_id']
            isOneToOne: false
            referencedRelation: 'accounting_accounts'
            referencedColumns: ['id']
          },
        ]
      }
      accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          created_at: string | null
          details: Json | null
          id: string
          is_active: boolean | null
          level: number | null
          parent_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          parent_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          parent_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      activities: {
        Row: {
          activity_code: string
          activity_name: string
          activity_type: string
          adult_cost: number | null
          adult_price: number | null
          child_cost: number | null
          child_price: number | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          inclusions: string[] | null
          infant_cost: number | null
          infant_price: number | null
          is_active: boolean | null
          notes: string | null
          region_id: string | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity_code: string
          activity_name: string
          activity_type: string
          adult_cost?: number | null
          adult_price?: number | null
          child_cost?: number | null
          child_price?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          inclusions?: string[] | null
          infant_cost?: number | null
          infant_price?: number | null
          is_active?: boolean | null
          notes?: string | null
          region_id?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_code?: string
          activity_name?: string
          activity_type?: string
          adult_cost?: number | null
          adult_price?: number | null
          child_cost?: number | null
          child_price?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          inclusions?: string[] | null
          infant_cost?: number | null
          infant_price?: number | null
          is_active?: boolean | null
          notes?: string | null
          region_id?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      advance_items: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          advance_list_id: string
          advance_person: string
          amount: number
          created_at: string | null
          description: string | null
          id: string
          name: string
          payment_request_id: string | null
          processed_at: string | null
          processed_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          advance_list_id: string
          advance_person: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          payment_request_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          advance_list_id?: string
          advance_person?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          payment_request_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'advance_items_advance_list_id_fkey'
            columns: ['advance_list_id']
            isOneToOne: false
            referencedRelation: 'advance_lists'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'advance_items_processed_by_fkey'
            columns: ['processed_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      advance_lists: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          channel_id: string
          created_at: string | null
          created_by: string | null
          created_by_legacy_author: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          channel_id: string
          created_at?: string | null
          created_by?: string | null
          created_by_legacy_author?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          channel_id?: string
          created_at?: string | null
          created_by?: string | null
          created_by_legacy_author?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'advance_lists_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'advance_lists_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      agent_registry: {
        Row: {
          agent_key: string | null
          agent_name: string
          bot_id: string | null
          created_at: string | null
          description: string | null
          emoji: string | null
          id: string
          is_deployed: boolean | null
          managed_by: string | null
          role: string | null
          status: string | null
          telegram_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          agent_key?: string | null
          agent_name: string
          bot_id?: string | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_deployed?: boolean | null
          managed_by?: string | null
          role?: string | null
          status?: string | null
          telegram_id?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          agent_key?: string | null
          agent_name?: string
          bot_id?: string | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_deployed?: boolean | null
          managed_by?: string | null
          role?: string | null
          status?: string | null
          telegram_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_registry_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: false
            referencedRelation: 'bot_registry'
            referencedColumns: ['id']
          },
        ]
      }
      ai_bots: {
        Row: {
          bot_id: string
          bot_type: string
          created_at: string | null
          emoji: string | null
          expertise: string[] | null
          id: string
          instance_url: string | null
          is_active: boolean | null
          location: string | null
          name: string
          personality: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          bot_id: string
          bot_type: string
          created_at?: string | null
          emoji?: string | null
          expertise?: string[] | null
          id?: string
          instance_url?: string | null
          is_active?: boolean | null
          location?: string | null
          name: string
          personality?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          bot_id?: string
          bot_type?: string
          created_at?: string | null
          emoji?: string | null
          expertise?: string[] | null
          id?: string
          instance_url?: string | null
          is_active?: boolean | null
          location?: string | null
          name?: string
          personality?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_bots_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string | null
          employee_id: string | null
          id: string
          learned_memory_ids: string[] | null
          messages: Json
          status: string | null
          summary: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          learned_memory_ids?: string[] | null
          messages?: Json
          status?: string | null
          summary?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          learned_memory_ids?: string[] | null
          messages?: Json
          status?: string | null
          summary?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_conversations_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_conversations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      ai_memories: {
        Row: {
          category: string
          content: string
          context: string | null
          created_at: string | null
          created_by: string | null
          emotion: string | null
          id: string
          importance: number | null
          related_feature: string | null
          source: string | null
          source_date: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          category: string
          content: string
          context?: string | null
          created_at?: string | null
          created_by?: string | null
          emotion?: string | null
          id?: string
          importance?: number | null
          related_feature?: string | null
          source?: string | null
          source_date?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          category?: string
          content?: string
          context?: string | null
          created_at?: string | null
          created_by?: string | null
          emotion?: string | null
          id?: string
          importance?: number | null
          related_feature?: string | null
          source?: string | null
          source_date?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_memories_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      ai_messages: {
        Row: {
          created_at: string | null
          from_agent: string
          id: string
          is_read: boolean | null
          message: string
          message_type: string | null
          metadata: Json | null
          to_agent: string
        }
        Insert: {
          created_at?: string | null
          from_agent: string
          id?: string
          is_read?: boolean | null
          message: string
          message_type?: string | null
          metadata?: Json | null
          to_agent: string
        }
        Update: {
          created_at?: string | null
          from_agent?: string
          id?: string
          is_read?: boolean | null
          message?: string
          message_type?: string | null
          metadata?: Json | null
          to_agent?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_category: string
          setting_key: string
          setting_value: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_category: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_category?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_settings_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      airport_images: {
        Row: {
          airport_code: string
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_default: boolean | null
          label: string | null
          season: string | null
          updated_at: string | null
          uploaded_by: string | null
          workspace_id: string | null
        }
        Insert: {
          airport_code: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_default?: boolean | null
          label?: string | null
          season?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          airport_code?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_default?: boolean | null
          label?: string | null
          season?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'airport_images_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'airport_images_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      api_usage: {
        Row: {
          api_name: string
          id: string
          month: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          api_name: string
          id?: string
          month: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          api_name?: string
          id?: string
          month?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      api_usage_log: {
        Row: {
          api_service: string
          created_at: string
          id: number
          notes: string | null
        }
        Insert: {
          api_service: string
          created_at?: string
          id?: number
          notes?: string | null
        }
        Update: {
          api_service?: string
          created_at?: string
          id?: number
          notes?: string | null
        }
        Relationships: []
      }
      assigned_itineraries: {
        Row: {
          assigned_date: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          itinerary_id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_date: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          itinerary_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_date?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          itinerary_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'assigned_itineraries_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      attendance_records: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string | null
          created_by: string | null
          date: string
          employee_id: string
          id: string
          leave_request_id: string | null
          notes: string | null
          overtime_hours: number | null
          status: string
          updated_at: string | null
          updated_by: string | null
          work_hours: number | null
          workspace_id: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          employee_id: string
          id?: string
          leave_request_id?: string | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          work_hours?: number | null
          workspace_id: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          employee_id?: string
          id?: string
          leave_request_id?: string | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          work_hours?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'attendance_records_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendance_records_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendance_records_leave_request_id_fkey'
            columns: ['leave_request_id']
            isOneToOne: false
            referencedRelation: 'leave_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendance_records_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendance_records_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      attractions: {
        Row: {
          address: string | null
          category: string | null
          city_id: string | null
          contact_name: string | null
          country_id: string
          created_at: string | null
          created_by: string | null
          data_verified: boolean | null
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          english_name: string | null
          fax: string | null
          google_maps_url: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          opening_hours: Json | null
          phone: string | null
          region_id: string | null
          tags: string[] | null
          thumbnail: string | null
          ticket_price: string | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city_id?: string | null
          contact_name?: string | null
          country_id: string
          created_at?: string | null
          created_by?: string | null
          data_verified?: boolean | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          english_name?: string | null
          fax?: string | null
          google_maps_url?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          region_id?: string | null
          tags?: string[] | null
          thumbnail?: string | null
          ticket_price?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city_id?: string | null
          contact_name?: string | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          data_verified?: boolean | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          english_name?: string | null
          fax?: string | null
          google_maps_url?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          region_id?: string | null
          tags?: string[] | null
          thumbnail?: string | null
          ticket_price?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'attractions_city_id_fkey'
            columns: ['city_id']
            isOneToOne: false
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attractions_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attractions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attractions_region_id_fkey'
            columns: ['region_id']
            isOneToOne: false
            referencedRelation: 'regions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attractions_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_attractions_workspace'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      background_tasks: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          max_attempts: number
          payload: Json
          priority: Database['public']['Enums']['task_priority']
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: Database['public']['Enums']['task_status']
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          max_attempts?: number
          payload?: Json
          priority?: Database['public']['Enums']['task_priority']
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database['public']['Enums']['task_status']
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          max_attempts?: number
          payload?: Json
          priority?: Database['public']['Enums']['task_priority']
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database['public']['Enums']['task_status']
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'background_tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'background_tasks_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      badge_definitions: {
        Row: {
          category: string | null
          created_at: string
          description: string
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          points_reward: number | null
          requirements: Json | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          icon_url?: string | null
          id: string
          is_active?: boolean | null
          name: string
          points_reward?: number | null
          requirements?: Json | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_reward?: number | null
          requirements?: Json | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string | null
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_id: string | null
          account_number: string | null
          bank_name: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          account_number?: string | null
          bank_name?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string | null
          account_number?: string | null
          bank_name?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bank_accounts_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bank_accounts_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      body_measurements: {
        Row: {
          arm_left_cm: number | null
          arm_right_cm: number | null
          bmi: number | null
          body_fat_percentage: number | null
          calf_left_cm: number | null
          calf_right_cm: number | null
          chest_cm: number | null
          created_at: string
          date: string
          hip_cm: number | null
          id: string
          muscle_mass: number | null
          notes: string | null
          thigh_left_cm: number | null
          thigh_right_cm: number | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          weight: number | null
          workspace_id: string | null
        }
        Insert: {
          arm_left_cm?: number | null
          arm_right_cm?: number | null
          bmi?: number | null
          body_fat_percentage?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          date?: string
          hip_cm?: number | null
          id?: string
          muscle_mass?: number | null
          notes?: string | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          weight?: number | null
          workspace_id?: string | null
        }
        Update: {
          arm_left_cm?: number | null
          arm_right_cm?: number | null
          bmi?: number | null
          body_fat_percentage?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          date?: string
          hip_cm?: number | null
          id?: string
          muscle_mass?: number | null
          notes?: string | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'body_measurements_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      bot_groups: {
        Row: {
          bot_id: string
          group_id: string
          group_name: string | null
          group_type: string | null
          id: string
          is_new: boolean | null
          joined_at: string | null
          member_count: number | null
        }
        Insert: {
          bot_id: string
          group_id: string
          group_name?: string | null
          group_type?: string | null
          id?: string
          is_new?: boolean | null
          joined_at?: string | null
          member_count?: number | null
        }
        Update: {
          bot_id?: string
          group_id?: string
          group_name?: string | null
          group_type?: string | null
          id?: string
          is_new?: boolean | null
          joined_at?: string | null
          member_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'bot_groups_bot_id_fkey'
            columns: ['bot_id']
            isOneToOne: false
            referencedRelation: 'bot_registry'
            referencedColumns: ['id']
          },
        ]
      }
      bot_registry: {
        Row: {
          bot_name: string
          bot_username: string | null
          created_at: string | null
          description: string | null
          id: string
          managed_by: string | null
          platform: string
          status: string | null
          updated_at: string | null
          webhook_url: string | null
          workspace_id: string
        }
        Insert: {
          bot_name: string
          bot_username?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          managed_by?: string | null
          platform: string
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
          workspace_id: string
        }
        Update: {
          bot_name?: string
          bot_username?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          managed_by?: string | null
          platform?: string
          status?: string | null
          updated_at?: string | null
          webhook_url?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      brochure_documents: {
        Row: {
          created_at: string
          created_by: string | null
          current_version_id: string | null
          design_type: string | null
          id: string
          itinerary_id: string | null
          itinerary_name: string | null
          name: string
          package_id: string | null
          status: string | null
          tour_code: string | null
          tour_id: string | null
          tour_name: string | null
          type: string
          updated_at: string
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          design_type?: string | null
          id?: string
          itinerary_id?: string | null
          itinerary_name?: string | null
          name?: string
          package_id?: string | null
          status?: string | null
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          design_type?: string | null
          id?: string
          itinerary_id?: string | null
          itinerary_name?: string | null
          name?: string
          package_id?: string | null
          status?: string | null
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'brochure_documents_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brochure_documents_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brochure_documents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_brochure_current_version'
            columns: ['current_version_id']
            isOneToOne: false
            referencedRelation: 'brochure_versions'
            referencedColumns: ['id']
          },
        ]
      }
      brochure_versions: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          document_id: string
          id: string
          restored_from: string | null
          thumbnail_url: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          document_id: string
          id?: string
          restored_from?: string | null
          thumbnail_url?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          document_id?: string
          id?: string
          restored_from?: string | null
          thumbnail_url?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: 'brochure_versions_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'brochure_documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brochure_versions_restored_from_fkey'
            columns: ['restored_from']
            isOneToOne: false
            referencedRelation: 'brochure_versions'
            referencedColumns: ['id']
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          period: string
          spent: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          period: string
          spent?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          period?: string
          spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'budgets_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      bulletins: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_pinned: boolean | null
          priority: number | null
          title: string
          type: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: number | null
          title: string
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: number | null
          title?: string
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bulletins_author_id_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bulletins_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          attendees: string[] | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end: string
          id: string
          owner_id: string
          recurring: string | null
          recurring_until: string | null
          related_order_id: string | null
          related_tour_id: string | null
          reminder_minutes: number | null
          start: string
          title: string
          type: string
          updated_at: string | null
          updated_by: string | null
          visibility: string
          workspace_id: string | null
        }
        Insert: {
          all_day?: boolean | null
          attendees?: string[] | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end: string
          id?: string
          owner_id: string
          recurring?: string | null
          recurring_until?: string | null
          related_order_id?: string | null
          related_tour_id?: string | null
          reminder_minutes?: number | null
          start: string
          title: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string
          workspace_id?: string | null
        }
        Update: {
          all_day?: boolean | null
          attendees?: string[] | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end?: string
          id?: string
          owner_id?: string
          recurring?: string | null
          recurring_until?: string | null
          related_order_id?: string | null
          related_tour_id?: string | null
          reminder_minutes?: number | null
          start?: string
          title?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_events_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      casual_trips: {
        Row: {
          cover_image: string | null
          created_at: string | null
          description: string | null
          destination: string | null
          end_date: string | null
          id: string
          latitude: number | null
          longitude: number | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          visibility: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          destination?: string | null
          end_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          visibility?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          destination?: string | null
          end_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          visibility?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      channel_groups: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          created_at: string | null
          id: string
          is_collapsed: boolean | null
          is_system: boolean | null
          name: string
          order: number | null
          system_type: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          created_at?: string | null
          id?: string
          is_collapsed?: boolean | null
          is_system?: boolean | null
          name: string
          order?: number | null
          system_type?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          created_at?: string | null
          id?: string
          is_collapsed?: boolean | null
          is_system?: boolean | null
          name?: string
          order?: number | null
          system_type?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channel_groups_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          created_at: string | null
          employee_id: string
          id: string
          role: string
          status: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          employee_id: string
          id?: string
          role?: string
          status?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channel_members_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_members_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      channel_threads: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          channel_id: string
          created_at: string | null
          created_by: string
          id: string
          is_archived: boolean | null
          last_reply_at: string | null
          name: string
          reply_count: number | null
          updated_at: string | null
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          channel_id: string
          created_at?: string | null
          created_by: string
          id?: string
          is_archived?: boolean | null
          last_reply_at?: string | null
          name: string
          reply_count?: number | null
          updated_at?: string | null
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          channel_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_archived?: boolean | null
          last_reply_at?: string | null
          name?: string
          reply_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'channel_threads_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channel_threads_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      channels: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          archived_at: string | null
          channel_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          dm_target_id: string | null
          group_id: string | null
          id: string
          is_announcement: boolean
          is_archived: boolean | null
          is_company_wide: boolean | null
          is_favorite: boolean | null
          is_pinned: boolean | null
          name: string
          order: number | null
          scope: string | null
          tour_id: string | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          visibility: Database['public']['Enums']['channel_visibility'] | null
          workspace_id: string
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          archived_at?: string | null
          channel_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dm_target_id?: string | null
          group_id?: string | null
          id?: string
          is_announcement?: boolean
          is_archived?: boolean | null
          is_company_wide?: boolean | null
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          name: string
          order?: number | null
          scope?: string | null
          tour_id?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: Database['public']['Enums']['channel_visibility'] | null
          workspace_id: string
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          archived_at?: string | null
          channel_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dm_target_id?: string | null
          group_id?: string | null
          id?: string
          is_announcement?: boolean
          is_archived?: boolean | null
          is_company_wide?: boolean | null
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          name?: string
          order?: number | null
          scope?: string | null
          tour_id?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: Database['public']['Enums']['channel_visibility'] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channels_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channels_dm_target_id_fkey'
            columns: ['dm_target_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channels_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'channel_groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channels_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channels_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_favorite: boolean | null
          is_system_locked: boolean | null
          last_used_at: string | null
          name: string
          parent_id: string | null
          updated_at: string | null
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          is_system_locked?: boolean | null
          last_used_at?: string | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          is_system_locked?: boolean | null
          last_used_at?: string | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'chart_of_accounts_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chart_of_accounts_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      checks: {
        Row: {
          amount: number
          check_date: string
          check_number: string
          created_at: string | null
          due_date: string
          id: string
          memo: string | null
          payee_name: string
          status: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          check_date: string
          check_number: string
          created_at?: string | null
          due_date: string
          id?: string
          memo?: string | null
          payee_name: string
          status?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          check_date?: string
          check_number?: string
          created_at?: string | null
          due_date?: string
          id?: string
          memo?: string | null
          payee_name?: string
          status?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'checks_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      cities: {
        Row: {
          airport_code: string | null
          background_image_url: string | null
          background_image_url_2: string | null
          country_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_major: boolean | null
          name: string
          name_en: string | null
          parent_city_id: string | null
          primary_image: number | null
          region_id: string | null
          timezone: string | null
          updated_at: string | null
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          airport_code?: string | null
          background_image_url?: string | null
          background_image_url_2?: string | null
          country_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id: string
          is_active?: boolean | null
          is_major?: boolean | null
          name: string
          name_en?: string | null
          parent_city_id?: string | null
          primary_image?: number | null
          region_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          airport_code?: string | null
          background_image_url?: string | null
          background_image_url_2?: string | null
          country_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_major?: boolean | null
          name?: string
          name_en?: string | null
          parent_city_id?: string | null
          primary_image?: number | null
          region_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'cities_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cities_parent_city_id_fkey'
            columns: ['parent_city_id']
            isOneToOne: false
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cities_region_id_fkey'
            columns: ['region_id']
            isOneToOne: false
            referencedRelation: 'regions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cities_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      companies: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          address: string | null
          annual_travel_budget: number | null
          code: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          email: string | null
          employee_count: number | null
          english_name: string | null
          fax: string | null
          id: string
          industry: string | null
          is_vip: boolean | null
          last_order_date: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          status: string | null
          tax_id: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          updated_by: string | null
          vip_level: number | null
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          address?: string | null
          annual_travel_budget?: number | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          employee_count?: number | null
          english_name?: string | null
          fax?: string | null
          id?: string
          industry?: string | null
          is_vip?: boolean | null
          last_order_date?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tax_id?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vip_level?: number | null
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          address?: string | null
          annual_travel_budget?: number | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          employee_count?: number | null
          english_name?: string | null
          fax?: string | null
          id?: string
          industry?: string | null
          is_vip?: boolean | null
          last_order_date?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tax_id?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vip_level?: number | null
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'companies_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      company_announcements: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          expire_date: string | null
          id: string
          is_pinned: boolean | null
          priority: number | null
          publish_date: string | null
          read_by: string[] | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
          updated_by: string | null
          visibility: string | null
          visible_to_employees: string[] | null
          visible_to_roles: string[] | null
          workspace_id: string | null
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          expire_date?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: number | null
          publish_date?: string | null
          read_by?: string[] | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string | null
          visible_to_employees?: string[] | null
          visible_to_roles?: string[] | null
          workspace_id?: string | null
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          expire_date?: string | null
          id?: string
          is_pinned?: boolean | null
          priority?: number | null
          publish_date?: string | null
          read_by?: string[] | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string | null
          visible_to_employees?: string[] | null
          visible_to_roles?: string[] | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'company_announcements_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      company_asset_folders: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'company_asset_folders_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_asset_folders_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'company_asset_folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_asset_folders_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_asset_folders_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      company_assets: {
        Row: {
          asset_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          restricted: boolean | null
          updated_at: string | null
          updated_by: string | null
          uploaded_by: string | null
          uploaded_by_name: string | null
          workspace_id: string | null
        }
        Insert: {
          asset_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          restricted?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          uploaded_by?: string | null
          uploaded_by_name?: string | null
          workspace_id?: string | null
        }
        Update: {
          asset_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          restricted?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          uploaded_by?: string | null
          uploaded_by_name?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'company_assets_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_assets_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'company_asset_folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_assets_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_assets_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      company_contacts: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          email: string | null
          english_name: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          line_id: string | null
          mobile: string | null
          name: string
          notes: string | null
          phone: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          english_name?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          line_id?: string | null
          mobile?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          english_name?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          line_id?: string | null
          mobile?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'company_contacts_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'company_contacts_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      confirmations: {
        Row: {
          booking_number: string
          confirmation_number: string | null
          created_at: string | null
          created_by: string | null
          data: Json
          id: string
          notes: string | null
          status: string | null
          type: Database['public']['Enums']['confirmation_type']
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          booking_number: string
          confirmation_number?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json
          id?: string
          notes?: string | null
          status?: string | null
          type: Database['public']['Enums']['confirmation_type']
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          booking_number?: string
          confirmation_number?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json
          id?: string
          notes?: string | null
          status?: string | null
          type?: Database['public']['Enums']['confirmation_type']
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'confirmations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      contracts: {
        Row: {
          code: string
          company_address: string | null
          company_name: string | null
          company_representative: string | null
          company_tax_id: string | null
          contract_data: Json | null
          created_at: string | null
          created_by: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          id: string
          include_itinerary: boolean | null
          include_member_list: boolean | null
          member_ids: string[] | null
          sent_at: string | null
          sent_to: string | null
          sent_via: string | null
          signature_image: string | null
          signature_ip: string | null
          signature_user_agent: string | null
          signed_at: string | null
          signer_address: string | null
          signer_id_number: string | null
          signer_name: string | null
          signer_phone: string | null
          signer_type: string | null
          status: string | null
          template: string
          tour_id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          company_address?: string | null
          company_name?: string | null
          company_representative?: string | null
          company_tax_id?: string | null
          contract_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          id?: string
          include_itinerary?: boolean | null
          include_member_list?: boolean | null
          member_ids?: string[] | null
          sent_at?: string | null
          sent_to?: string | null
          sent_via?: string | null
          signature_image?: string | null
          signature_ip?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signer_address?: string | null
          signer_id_number?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          signer_type?: string | null
          status?: string | null
          template: string
          tour_id: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          code?: string
          company_address?: string | null
          company_name?: string | null
          company_representative?: string | null
          company_tax_id?: string | null
          contract_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          id?: string
          include_itinerary?: boolean | null
          include_member_list?: boolean | null
          member_ids?: string[] | null
          sent_at?: string | null
          sent_to?: string | null
          sent_via?: string | null
          signature_image?: string | null
          signature_ip?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          signer_address?: string | null
          signer_id_number?: string | null
          signer_name?: string | null
          signer_phone?: string | null
          signer_type?: string | null
          status?: string | null
          template?: string
          tour_id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      cost_templates: {
        Row: {
          attraction_id: string | null
          base_distance_km: number | null
          base_hours: number | null
          capacity: number | null
          category: string
          city_id: string
          cost_price: number
          created_at: string | null
          created_by: string | null
          currency: string
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          extra_km_rate: number | null
          id: string
          is_active: boolean | null
          item_name: string
          item_name_en: string | null
          max_quantity: number | null
          min_quantity: number | null
          notes: string | null
          overtime_rate: number | null
          route_destination: string | null
          route_origin: string | null
          season: string | null
          selling_price: number | null
          supplier_id: string
          trip_type: string | null
          unit: string
          updated_at: string | null
          updated_by: string | null
          valid_from: string | null
          valid_until: string | null
          vehicle_type: string | null
        }
        Insert: {
          attraction_id?: string | null
          base_distance_km?: number | null
          base_hours?: number | null
          capacity?: number | null
          category: string
          city_id: string
          cost_price: number
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          extra_km_rate?: number | null
          id?: string
          is_active?: boolean | null
          item_name: string
          item_name_en?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          notes?: string | null
          overtime_rate?: number | null
          route_destination?: string | null
          route_origin?: string | null
          season?: string | null
          selling_price?: number | null
          supplier_id: string
          trip_type?: string | null
          unit: string
          updated_at?: string | null
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
          vehicle_type?: string | null
        }
        Update: {
          attraction_id?: string | null
          base_distance_km?: number | null
          base_hours?: number | null
          capacity?: number | null
          category?: string
          city_id?: string
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          extra_km_rate?: number | null
          id?: string
          is_active?: boolean | null
          item_name?: string
          item_name_en?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          notes?: string | null
          overtime_rate?: number | null
          route_destination?: string | null
          route_origin?: string | null
          season?: string | null
          selling_price?: number | null
          supplier_id?: string
          trip_type?: string | null
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'cost_templates_attraction_id_fkey'
            columns: ['attraction_id']
            isOneToOne: false
            referencedRelation: 'attractions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cost_templates_city_id_fkey'
            columns: ['city_id']
            isOneToOne: false
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cost_templates_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      countries: {
        Row: {
          code: string | null
          created_at: string | null
          display_order: number | null
          emoji: string | null
          has_regions: boolean | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string
          region: string | null
          updated_at: string | null
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          display_order?: number | null
          emoji?: string | null
          has_regions?: boolean | null
          id: string
          is_active?: boolean | null
          name: string
          name_en: string
          region?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          display_order?: number | null
          emoji?: string | null
          has_regions?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string
          region?: string | null
          updated_at?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'countries_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      cover_templates: {
        Row: {
          component_name: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          component_name: string
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          component_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cron_execution_logs: {
        Row: {
          error_message: string | null
          executed_at: string | null
          id: string
          job_name: string
          result: Json | null
          success: boolean | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          job_name: string
          result?: Json | null
          success?: boolean | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          job_name?: string
          result?: Json | null
          success?: boolean | null
        }
        Relationships: []
      }
      customer_assigned_itineraries: {
        Row: {
          assigned_date: string
          created_at: string
          customer_id: string
          esim_url: string | null
          id: string
          itinerary_id: string
          notes: string | null
          order_id: string | null
          payment_details: Json | null
          room_allocation: Json | null
          status: string
          updated_at: string
          visa_status: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_date: string
          created_at?: string
          customer_id: string
          esim_url?: string | null
          id?: string
          itinerary_id: string
          notes?: string | null
          order_id?: string | null
          payment_details?: Json | null
          room_allocation?: Json | null
          status?: string
          updated_at?: string
          visa_status?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_date?: string
          created_at?: string
          customer_id?: string
          esim_url?: string | null
          id?: string
          itinerary_id?: string
          notes?: string | null
          order_id?: string | null
          payment_details?: Json | null
          room_allocation?: Json | null
          status?: string
          updated_at?: string
          visa_status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'customer_assigned_itineraries_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_assigned_itineraries_itinerary_id_fkey'
            columns: ['itinerary_id']
            isOneToOne: false
            referencedRelation: 'itineraries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_assigned_itineraries_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_assigned_itineraries_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'customer_assigned_itineraries_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      customer_badges: {
        Row: {
          badge_id: string
          customer_id: string
          earned_at: string | null
          id: string
        }
        Insert: {
          badge_id: string
          customer_id: string
          earned_at?: string | null
          id?: string
        }
        Update: {
          badge_id?: string
          customer_id?: string
          earned_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customer_badges_badge_id_fkey'
            columns: ['badge_id']
            isOneToOne: false
            referencedRelation: 'badge_definitions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_badges_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
        ]
      }
      customer_group_members: {
        Row: {
          created_at: string | null
          customer_id: string
          group_id: string
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          group_id: string
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          group_id?: string
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'customer_group_members_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'customer_groups'
            referencedColumns: ['id']
          },
        ]
      }
      customer_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          notes: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customer_groups_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_groups_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_groups_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      customer_inquiries: {
        Row: {
          assigned_to: string | null
          code: string | null
          converted_to_quote_id: string | null
          converted_to_tour_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string
          email: string | null
          id: string
          internal_notes: string | null
          line_user_id: string | null
          notes: string | null
          people_count: number | null
          phone: string | null
          selected_items: Json | null
          status: string | null
          template_id: string | null
          travel_date: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          code?: string | null
          converted_to_quote_id?: string | null
          converted_to_tour_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          line_user_id?: string | null
          notes?: string | null
          people_count?: number | null
          phone?: string | null
          selected_items?: Json | null
          status?: string | null
          template_id?: string | null
          travel_date?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          code?: string | null
          converted_to_quote_id?: string | null
          converted_to_tour_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          line_user_id?: string | null
          notes?: string | null
          people_count?: number | null
          phone?: string | null
          selected_items?: Json | null
          status?: string | null
          template_id?: string | null
          travel_date?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customer_inquiries_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_inquiries_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'wishlist_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_inquiries_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      customer_service_conversations: {
        Row: {
          ai_response: string
          created_at: string | null
          follow_up_note: string | null
          follow_up_status: string | null
          id: string
          intent: string | null
          is_potential_lead: boolean | null
          lead_score: number | null
          mentioned_tours: string[] | null
          platform: string
          platform_user_id: string
          sentiment: string | null
          user_display_name: string | null
          user_message: string
          workspace_id: string | null
        }
        Insert: {
          ai_response: string
          created_at?: string | null
          follow_up_note?: string | null
          follow_up_status?: string | null
          id?: string
          intent?: string | null
          is_potential_lead?: boolean | null
          lead_score?: number | null
          mentioned_tours?: string[] | null
          platform: string
          platform_user_id: string
          sentiment?: string | null
          user_display_name?: string | null
          user_message: string
          workspace_id?: string | null
        }
        Update: {
          ai_response?: string
          created_at?: string | null
          follow_up_note?: string | null
          follow_up_status?: string | null
          id?: string
          intent?: string | null
          is_potential_lead?: boolean | null
          lead_score?: number | null
          mentioned_tours?: string[] | null
          platform?: string
          platform_user_id?: string
          sentiment?: string | null
          user_display_name?: string | null
          user_message?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'customer_service_conversations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      customer_service_leads: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          interested_tours: string[] | null
          last_contact: string | null
          notes: string | null
          platform: string
          platform_user_id: string
          status: string | null
          total_messages: number | null
          updated_at: string | null
          user_display_name: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          interested_tours?: string[] | null
          last_contact?: string | null
          notes?: string | null
          platform: string
          platform_user_id: string
          status?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_display_name?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          interested_tours?: string[] | null
          last_contact?: string | null
          notes?: string | null
          platform?: string
          platform_user_id?: string
          status?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_display_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'customer_service_leads_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      customer_travel_cards: {
        Row: {
          created_at: string | null
          customer_id: string
          icon: string | null
          id: string
          is_active: boolean | null
          label_zh: string | null
          sort_order: number | null
          template_id: string | null
          translations: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label_zh?: string | null
          sort_order?: number | null
          template_id?: string | null
          translations?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label_zh?: string | null
          sort_order?: number | null
          template_id?: string | null
          translations?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'customer_travel_cards_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_travel_cards_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'travel_card_templates'
            referencedColumns: ['id']
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          alternative_phone: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          code: string
          company: string | null
          country: string | null
          created_at: string
          created_by: string | null
          dietary_restrictions: string | null
          email: string | null
          emergency_contact: Json | null
          english_name: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_vip: boolean | null
          last_order_date: string | null
          line_linked_at: string | null
          line_user_id: string | null
          linked_at: string | null
          linked_method: string | null
          member_type: string
          name: string
          national_id: string | null
          nationality: string | null
          nickname: string | null
          notes: string | null
          online_user_id: string | null
          passport_expiry: string | null
          passport_image_url: string | null
          passport_name: string | null
          passport_name_print: string | null
          passport_number: string | null
          phone: string | null
          referred_by: string | null
          sex: string | null
          source: string | null
          tax_id: string | null
          total_orders: number | null
          total_points: number | null
          total_spent: number | null
          updated_at: string
          updated_by: string | null
          verification_status: Database['public']['Enums']['verification_status']
          vip_level: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          alternative_phone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          code: string
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          dietary_restrictions?: string | null
          email?: string | null
          emergency_contact?: Json | null
          english_name?: string | null
          gender?: string | null
          id: string
          is_active?: boolean | null
          is_vip?: boolean | null
          last_order_date?: string | null
          line_linked_at?: string | null
          line_user_id?: string | null
          linked_at?: string | null
          linked_method?: string | null
          member_type?: string
          name: string
          national_id?: string | null
          nationality?: string | null
          nickname?: string | null
          notes?: string | null
          online_user_id?: string | null
          passport_expiry?: string | null
          passport_image_url?: string | null
          passport_name?: string | null
          passport_name_print?: string | null
          passport_number?: string | null
          phone?: string | null
          referred_by?: string | null
          sex?: string | null
          source?: string | null
          tax_id?: string | null
          total_orders?: number | null
          total_points?: number | null
          total_spent?: number | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database['public']['Enums']['verification_status']
          vip_level?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          alternative_phone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          code?: string
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          dietary_restrictions?: string | null
          email?: string | null
          emergency_contact?: Json | null
          english_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_vip?: boolean | null
          last_order_date?: string | null
          line_linked_at?: string | null
          line_user_id?: string | null
          linked_at?: string | null
          linked_method?: string | null
          member_type?: string
          name?: string
          national_id?: string | null
          nationality?: string | null
          nickname?: string | null
          notes?: string | null
          online_user_id?: string | null
          passport_expiry?: string | null
          passport_image_url?: string | null
          passport_name?: string | null
          passport_name_print?: string | null
          passport_number?: string | null
          phone?: string | null
          referred_by?: string | null
          sex?: string | null
          source?: string | null
          tax_id?: string | null
          total_orders?: number | null
          total_points?: number | null
          total_spent?: number | null
          updated_at?: string
          updated_by?: string | null
          verification_status?: Database['public']['Enums']['verification_status']
          vip_level?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customers_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      customization_requests: {
        Row: {
          assigned_itinerary_id: string
          created_at: string
          customer_id: string
          handled_at: string | null
          handled_by: string | null
          id: string
          request_text: string
          response_text: string | null
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assigned_itinerary_id: string
          created_at?: string
          customer_id: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          request_text: string
          response_text?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assigned_itinerary_id?: string
          created_at?: string
          customer_id?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          request_text?: string
          response_text?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'customization_requests_assigned_itinerary_id_fkey'
            columns: ['assigned_itinerary_id']
            isOneToOne: false
            referencedRelation: 'customer_assigned_itineraries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customization_requests_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customization_requests_handled_by_fkey'
            columns: ['handled_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customization_requests_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      daily_templates: {
        Row: {
          component_name: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          component_name: string
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          component_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      decisions_log: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          decision_text: string
          id: number
          project_id: number | null
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          decision_text: string
          id?: number
          project_id?: number | null
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          decision_text?: string
          id?: number
          project_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'decisions_log_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'departments_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      design_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          data: Json
          description: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          name: string
          tags: string[] | null
          thumbnail_url: string | null
          type: string
          updated_at: string
          updated_by: string | null
          use_count: number | null
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name: string
          tags?: string[] | null
          thumbnail_url?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
          use_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
          use_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'design_templates_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'design_templates_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      designer_drafts: {
        Row: {
          attractions: Json | null
          country_code: string | null
          created_at: string
          edited_elements: Json | null
          hotels: Json | null
          id: string
          itinerary_id: string | null
          memo_settings: Json | null
          name: string
          package_id: string | null
          proposal_id: string | null
          style_id: string
          template_data: Json
          tour_id: string | null
          trip_days: number
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          attractions?: Json | null
          country_code?: string | null
          created_at?: string
          edited_elements?: Json | null
          hotels?: Json | null
          id?: string
          itinerary_id?: string | null
          memo_settings?: Json | null
          name?: string
          package_id?: string | null
          proposal_id?: string | null
          style_id: string
          template_data?: Json
          tour_id?: string | null
          trip_days?: number
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          attractions?: Json | null
          country_code?: string | null
          created_at?: string
          edited_elements?: Json | null
          hotels?: Json | null
          id?: string
          itinerary_id?: string | null
          memo_settings?: Json | null
          name?: string
          package_id?: string | null
          proposal_id?: string | null
          style_id?: string
          template_data?: Json
          tour_id?: string | null
          trip_days?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'designer_drafts_itinerary_id_fkey'
            columns: ['itinerary_id']
            isOneToOne: false
            referencedRelation: 'itineraries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'designer_drafts_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'designer_drafts_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'designer_drafts_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      disbursement_orders: {
        Row: {
          amount: number
          bank_account_id: string | null
          code: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string | null
          disbursement_date: string | null
          disbursement_type: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          notes: string | null
          order_number: string | null
          payment_method: string | null
          payment_request_ids: string[] | null
          pdf_url: string | null
          refund_id: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          code?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          disbursement_date?: string | null
          disbursement_type?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_request_ids?: string[] | null
          pdf_url?: string | null
          refund_id?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          code?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          disbursement_date?: string | null
          disbursement_type?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_request_ids?: string[] | null
          pdf_url?: string | null
          refund_id?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'disbursement_orders_bank_account_id_fkey'
            columns: ['bank_account_id']
            isOneToOne: false
            referencedRelation: 'bank_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disbursement_orders_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      disbursement_requests: {
        Row: {
          created_at: string | null
          disbursement_order_id: string
          id: string
          payment_request_id: string
        }
        Insert: {
          created_at?: string | null
          disbursement_order_id: string
          id?: string
          payment_request_id: string
        }
        Update: {
          created_at?: string | null
          disbursement_order_id?: string
          id?: string
          payment_request_id?: string
        }
        Relationships: []
      }
      driver_tasks: {
        Row: {
          accepted_at: string | null
          agency_contact_name: string | null
          agency_contact_phone: string | null
          assigned_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          driver_id: string | null
          driver_name: string | null
          driver_note: string | null
          driver_phone: string | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_location: string
          dropoff_note: string | null
          estimated_cost: number | null
          final_cost: number | null
          id: string
          internal_note: string | null
          passenger_count: number | null
          passenger_name: string | null
          passenger_note: string | null
          passenger_phone: string | null
          picked_up_at: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          pickup_note: string | null
          pickup_time: string
          service_date: string
          source_workspace_id: string | null
          started_at: string | null
          status: string | null
          stops: Json | null
          supplier_id: string
          supplier_name: string | null
          task_code: string
          tour_code: string | null
          tour_id: string | null
          tour_name: string | null
          tour_request_id: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_info: string | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          agency_contact_name?: string | null
          agency_contact_phone?: string | null
          assigned_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_note?: string | null
          driver_phone?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_location: string
          dropoff_note?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          internal_note?: string | null
          passenger_count?: number | null
          passenger_name?: string | null
          passenger_note?: string | null
          passenger_phone?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location: string
          pickup_note?: string | null
          pickup_time: string
          service_date: string
          source_workspace_id?: string | null
          started_at?: string | null
          status?: string | null
          stops?: Json | null
          supplier_id: string
          supplier_name?: string | null
          task_code: string
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          tour_request_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_info?: string | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          agency_contact_name?: string | null
          agency_contact_phone?: string | null
          assigned_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_note?: string | null
          driver_phone?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_location?: string
          dropoff_note?: string | null
          estimated_cost?: number | null
          final_cost?: number | null
          id?: string
          internal_note?: string | null
          passenger_count?: number | null
          passenger_name?: string | null
          passenger_note?: string | null
          passenger_phone?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string
          pickup_note?: string | null
          pickup_time?: string
          service_date?: string
          source_workspace_id?: string | null
          started_at?: string | null
          status?: string | null
          stops?: Json | null
          supplier_id?: string
          supplier_name?: string | null
          task_code?: string
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          tour_request_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_info?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      email_accounts: {
        Row: {
          account_type: string
          created_at: string
          display_name: string | null
          domain_verified: boolean | null
          email_address: string
          id: string
          is_active: boolean
          is_default: boolean
          owner_id: string | null
          settings: Json | null
          signature_html: string | null
          signature_text: string | null
          updated_at: string
          verified_at: string | null
          workspace_id: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          display_name?: string | null
          domain_verified?: boolean | null
          email_address: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          owner_id?: string | null
          settings?: Json | null
          signature_html?: string | null
          signature_text?: string | null
          updated_at?: string
          verified_at?: string | null
          workspace_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          display_name?: string | null
          domain_verified?: boolean | null
          email_address?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          owner_id?: string | null
          settings?: Json | null
          signature_html?: string | null
          signature_text?: string | null
          updated_at?: string
          verified_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_accounts_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'email_accounts_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      email_attachments: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string
          email_id: string
          external_url: string | null
          filename: string
          id: string
          is_inline: boolean | null
          size_bytes: number | null
          storage_path: string | null
          workspace_id: string
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          email_id: string
          external_url?: string | null
          filename: string
          id?: string
          is_inline?: boolean | null
          size_bytes?: number | null
          storage_path?: string | null
          workspace_id: string
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          email_id?: string
          external_url?: string | null
          filename?: string
          id?: string
          is_inline?: boolean | null
          size_bytes?: number | null
          storage_path?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_attachments_email_id_fkey'
            columns: ['email_id']
            isOneToOne: false
            referencedRelation: 'emails'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'email_attachments_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      emails: {
        Row: {
          bcc_addresses: Json | null
          body_html: string | null
          body_text: string | null
          cc_addresses: Json | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivered_at: string | null
          direction: string
          error_message: string | null
          external_id: string | null
          from_address: string
          from_name: string | null
          id: string
          in_reply_to: string | null
          is_archived: boolean
          is_read: boolean
          is_starred: boolean
          is_trash: boolean
          labels: string[] | null
          message_id: string | null
          notes: string | null
          order_id: string | null
          received_at: string | null
          reply_to_address: string | null
          retry_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          supplier_id: string | null
          thread_id: string | null
          to_addresses: Json
          tour_id: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          bcc_addresses?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: Json | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          direction: string
          error_message?: string | null
          external_id?: string | null
          from_address: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_archived?: boolean
          is_read?: boolean
          is_starred?: boolean
          is_trash?: boolean
          labels?: string[] | null
          message_id?: string | null
          notes?: string | null
          order_id?: string | null
          received_at?: string | null
          reply_to_address?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          supplier_id?: string | null
          thread_id?: string | null
          to_addresses?: Json
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          bcc_addresses?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: Json | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          direction?: string
          error_message?: string | null
          external_id?: string | null
          from_address?: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_archived?: boolean
          is_read?: boolean
          is_starred?: boolean
          is_trash?: boolean
          labels?: string[] | null
          message_id?: string | null
          notes?: string | null
          order_id?: string | null
          received_at?: string | null
          reply_to_address?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          supplier_id?: string | null
          thread_id?: string | null
          to_addresses?: Json
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'emails_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'emails_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'emails_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'emails_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'emails_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'emails_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'emails_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      employee_job_roles: {
        Row: {
          created_at: string
          employee_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employee_job_roles_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_job_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'workspace_roles'
            referencedColumns: ['id']
          },
        ]
      }
      employee_permission_overrides: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          module_code: string
          override_type: string
          tab_code: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          module_code: string
          override_type: string
          tab_code?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          module_code?: string
          override_type?: string
          tab_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'employee_permission_overrides_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      employees: {
        Row: {
          attendance: Json | null
          avatar: string | null
          avatar_url: string | null
          birth_date: string | null
          chinese_name: string | null
          contracts: Json | null
          created_at: string | null
          created_by: string | null
          display_name: string | null
          email: string | null
          employee_number: string
          employee_type: string | null
          english_name: string | null
          hidden_menu_items: string[] | null
          id: string
          id_number: string | null
          is_active: boolean | null
          job_info: Json | null
          job_title: string | null
          last_login_at: string | null
          line_user_id: string | null
          login_failed_count: number | null
          login_locked_until: string | null
          monthly_salary: number | null
          must_change_password: boolean | null
          password_hash: string | null
          permissions: string[] | null
          personal_info: Json | null
          pinyin: string | null
          preferred_features: Json | null
          role_id: string | null
          roles: string[] | null
          salary_info: Json | null
          status: string | null
          supabase_user_id: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          attendance?: Json | null
          avatar?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          chinese_name?: string | null
          contracts?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          employee_number: string
          employee_type?: string | null
          english_name?: string | null
          hidden_menu_items?: string[] | null
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          job_info?: Json | null
          job_title?: string | null
          last_login_at?: string | null
          line_user_id?: string | null
          login_failed_count?: number | null
          login_locked_until?: string | null
          monthly_salary?: number | null
          must_change_password?: boolean | null
          password_hash?: string | null
          permissions?: string[] | null
          personal_info?: Json | null
          pinyin?: string | null
          preferred_features?: Json | null
          role_id?: string | null
          roles?: string[] | null
          salary_info?: Json | null
          status?: string | null
          supabase_user_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          attendance?: Json | null
          avatar?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          chinese_name?: string | null
          contracts?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          email?: string | null
          employee_number?: string
          employee_type?: string | null
          english_name?: string | null
          hidden_menu_items?: string[] | null
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          job_info?: Json | null
          job_title?: string | null
          last_login_at?: string | null
          line_user_id?: string | null
          login_failed_count?: number | null
          login_locked_until?: string | null
          monthly_salary?: number | null
          must_change_password?: boolean | null
          password_hash?: string | null
          permissions?: string[] | null
          personal_info?: Json | null
          pinyin?: string | null
          preferred_features?: Json | null
          role_id?: string | null
          roles?: string[] | null
          salary_info?: Json | null
          status?: string | null
          supabase_user_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'employees_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'workspace_roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      erp_bank_accounts: {
        Row: {
          account_id: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          account_id?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          account_id?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'erp_bank_accounts_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'erp_bank_accounts_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      esims: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          esim_number: string
          group_code: string
          id: string
          note: string | null
          order_number: string | null
          price: number | null
          product_id: string | null
          quantity: number
          status: number
          supplier_order_number: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          esim_number: string
          group_code: string
          id?: string
          note?: string | null
          order_number?: string | null
          price?: number | null
          product_id?: string | null
          quantity?: number
          status?: number
          supplier_order_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          esim_number?: string
          group_code?: string
          id?: string
          note?: string | null
          order_number?: string | null
          price?: number | null
          product_id?: string | null
          quantity?: number
          status?: number
          supplier_order_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'esims_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string
          created_at: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          icon: string
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          type?: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'expense_categories_accounting_subject_id_fkey'
            columns: ['debit_account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expense_categories_credit_account_id_fkey'
            columns: ['credit_account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expense_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'expense_categories'
            referencedColumns: ['id']
          },
        ]
      }
      expense_monthly_stats: {
        Row: {
          category_breakdown: Json | null
          id: string
          total_expense: number | null
          total_income: number | null
          total_split_owed: number | null
          total_split_paid: number | null
          updated_at: string | null
          user_id: string
          year_month: string
        }
        Insert: {
          category_breakdown?: Json | null
          id?: string
          total_expense?: number | null
          total_income?: number | null
          total_split_owed?: number | null
          total_split_paid?: number | null
          updated_at?: string | null
          user_id: string
          year_month: string
        }
        Update: {
          category_breakdown?: Json | null
          id?: string
          total_expense?: number | null
          total_income?: number | null
          total_split_owed?: number | null
          total_split_paid?: number | null
          updated_at?: string | null
          user_id?: string
          year_month?: string
        }
        Relationships: []
      }
      expense_streaks: {
        Row: {
          achievements: Json | null
          created_at: string | null
          current_streak: number | null
          id: string
          last_record_date: string | null
          longest_streak: number | null
          total_expense_amount: number | null
          total_income_amount: number | null
          total_records: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements?: Json | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_record_date?: string | null
          longest_streak?: number | null
          total_expense_amount?: number | null
          total_income_amount?: number | null
          total_records?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements?: Json | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_record_date?: string | null
          longest_streak?: number | null
          total_expense_amount?: number | null
          total_income_amount?: number | null
          total_records?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      eyeline_submissions: {
        Row: {
          created_at: string
          id: string
          points_awarded: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_content: Json
          submission_type: string
          target_entity_info: Json
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          points_awarded?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_content: Json
          submission_type: string
          target_entity_info: Json
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          points_awarded?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_content?: Json
          submission_type?: string
          target_entity_info?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'eyeline_submissions_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'eyeline_submissions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'eyeline_submissions_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      features_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          category: Database['public']['Enums']['file_category']
          content_type: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          description: string | null
          download_count: number | null
          email_id: string | null
          extension: string | null
          filename: string
          folder_id: string | null
          id: string
          is_archived: boolean
          is_deleted: boolean
          is_starred: boolean
          last_accessed_at: string | null
          notes: string | null
          order_id: string | null
          original_filename: string
          previous_version_id: string | null
          size_bytes: number | null
          source: string | null
          source_email_attachment_id: string | null
          storage_bucket: string
          storage_path: string
          supplier_id: string | null
          tags: string[] | null
          thumbnail_path: string | null
          tour_id: string | null
          updated_at: string
          updated_by: string | null
          version: number | null
          workspace_id: string
        }
        Insert: {
          category?: Database['public']['Enums']['file_category']
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          description?: string | null
          download_count?: number | null
          email_id?: string | null
          extension?: string | null
          filename: string
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_deleted?: boolean
          is_starred?: boolean
          last_accessed_at?: string | null
          notes?: string | null
          order_id?: string | null
          original_filename: string
          previous_version_id?: string | null
          size_bytes?: number | null
          source?: string | null
          source_email_attachment_id?: string | null
          storage_bucket?: string
          storage_path: string
          supplier_id?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          workspace_id: string
        }
        Update: {
          category?: Database['public']['Enums']['file_category']
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          description?: string | null
          download_count?: number | null
          email_id?: string | null
          extension?: string | null
          filename?: string
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_deleted?: boolean
          is_starred?: boolean
          last_accessed_at?: string | null
          notes?: string | null
          order_id?: string | null
          original_filename?: string
          previous_version_id?: string | null
          size_bytes?: number | null
          source?: string | null
          source_email_attachment_id?: string | null
          storage_bucket?: string
          storage_path?: string
          supplier_id?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'files_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'files_email_id_fkey'
            columns: ['email_id']
            isOneToOne: false
            referencedRelation: 'emails'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'files_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'files_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'files_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'files_previous_version_id_fkey'
            columns: ['previous_version_id']
            isOneToOne: false
            referencedRelation: 'files'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'files_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'files_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'files_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'files_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      fleet_drivers: {
        Row: {
          created_at: string | null
          employee_id: string | null
          health_check_date: string | null
          health_check_document_url: string | null
          health_check_expiry: string | null
          id: string
          id_number: string | null
          license_expiry_date: string | null
          license_image_url: string | null
          license_number: string | null
          license_type: string | null
          name: string
          notes: string | null
          phone: string | null
          professional_license_expiry: string | null
          professional_license_image_url: string | null
          professional_license_number: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          health_check_date?: string | null
          health_check_document_url?: string | null
          health_check_expiry?: string | null
          id?: string
          id_number?: string | null
          license_expiry_date?: string | null
          license_image_url?: string | null
          license_number?: string | null
          license_type?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          professional_license_expiry?: string | null
          professional_license_image_url?: string | null
          professional_license_number?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          health_check_date?: string | null
          health_check_document_url?: string | null
          health_check_expiry?: string | null
          id?: string
          id_number?: string | null
          license_expiry_date?: string | null
          license_image_url?: string | null
          license_number?: string | null
          license_type?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          professional_license_expiry?: string | null
          professional_license_image_url?: string | null
          professional_license_number?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fleet_drivers_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      fleet_schedules: {
        Row: {
          client_name: string | null
          client_workspace_id: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          destination: string | null
          driver_id: string | null
          driver_name: string | null
          driver_phone: string | null
          end_date: string
          id: string
          notes: string | null
          pickup_location: string | null
          rental_fee: number | null
          route_notes: string | null
          start_date: string
          status: string
          tour_code: string | null
          tour_id: string | null
          tour_name: string | null
          updated_at: string | null
          vehicle_id: string
          workspace_id: string
        }
        Insert: {
          client_name?: string | null
          client_workspace_id?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          destination?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          end_date: string
          id?: string
          notes?: string | null
          pickup_location?: string | null
          rental_fee?: number | null
          route_notes?: string | null
          start_date: string
          status?: string
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string | null
          vehicle_id: string
          workspace_id: string
        }
        Update: {
          client_name?: string | null
          client_workspace_id?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          destination?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          pickup_location?: string | null
          rental_fee?: number | null
          route_notes?: string | null
          start_date?: string
          status?: string
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string | null
          vehicle_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fleet_schedules_driver_id_fkey'
            columns: ['driver_id']
            isOneToOne: false
            referencedRelation: 'fleet_drivers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fleet_schedules_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'fleet_vehicles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fleet_schedules_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      fleet_vehicle_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          documents: Json | null
          id: string
          log_date: string
          log_type: string
          mileage: number | null
          next_due_date: string | null
          next_due_mileage: number | null
          notes: string | null
          updated_at: string | null
          vehicle_id: string
          vendor_name: string | null
          workspace_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          log_date: string
          log_type: string
          mileage?: number | null
          next_due_date?: string | null
          next_due_mileage?: number | null
          notes?: string | null
          updated_at?: string | null
          vehicle_id: string
          vendor_name?: string | null
          workspace_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          log_date?: string
          log_type?: string
          mileage?: number | null
          next_due_date?: string | null
          next_due_mileage?: number | null
          notes?: string | null
          updated_at?: string | null
          vehicle_id?: string
          vendor_name?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fleet_vehicle_logs_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'fleet_vehicles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fleet_vehicle_logs_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      fleet_vehicles: {
        Row: {
          brand: string | null
          capacity: number
          created_at: string | null
          created_by: string | null
          current_mileage: number | null
          default_driver_id: string | null
          display_order: number | null
          documents: Json | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          inspection_due_date: string | null
          insurance_due_date: string | null
          last_maintenance_date: string | null
          license_plate: string
          model: string | null
          next_maintenance_date: string | null
          next_maintenance_km: number | null
          notes: string | null
          registration_date: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
          vehicle_name: string | null
          vehicle_type: string
          vin: string | null
          workspace_id: string
          year: number | null
        }
        Insert: {
          brand?: string | null
          capacity?: number
          created_at?: string | null
          created_by?: string | null
          current_mileage?: number | null
          default_driver_id?: string | null
          display_order?: number | null
          documents?: Json | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          inspection_due_date?: string | null
          insurance_due_date?: string | null
          last_maintenance_date?: string | null
          license_plate: string
          model?: string | null
          next_maintenance_date?: string | null
          next_maintenance_km?: number | null
          notes?: string | null
          registration_date?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          vehicle_name?: string | null
          vehicle_type?: string
          vin?: string | null
          workspace_id: string
          year?: number | null
        }
        Update: {
          brand?: string | null
          capacity?: number
          created_at?: string | null
          created_by?: string | null
          current_mileage?: number | null
          default_driver_id?: string | null
          display_order?: number | null
          documents?: Json | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          inspection_due_date?: string | null
          insurance_due_date?: string | null
          last_maintenance_date?: string | null
          license_plate?: string
          model?: string | null
          next_maintenance_date?: string | null
          next_maintenance_km?: number | null
          notes?: string | null
          registration_date?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          vehicle_name?: string | null
          vehicle_type?: string
          vin?: string | null
          workspace_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'fleet_vehicles_default_driver_id_fkey'
            columns: ['default_driver_id']
            isOneToOne: false
            referencedRelation: 'fleet_drivers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fleet_vehicles_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      flight_status_subscriptions: {
        Row: {
          airline_code: string
          created_at: string | null
          external_provider: string | null
          external_subscription_id: string | null
          flight_date: string
          flight_number: string
          id: string
          is_active: boolean | null
          last_checked_at: string | null
          notify_channel_id: string | null
          notify_employee_ids: string[] | null
          notify_on: string[] | null
          pnr_id: string | null
          segment_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          airline_code: string
          created_at?: string | null
          external_provider?: string | null
          external_subscription_id?: string | null
          flight_date: string
          flight_number: string
          id?: string
          is_active?: boolean | null
          last_checked_at?: string | null
          notify_channel_id?: string | null
          notify_employee_ids?: string[] | null
          notify_on?: string[] | null
          pnr_id?: string | null
          segment_id?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          airline_code?: string
          created_at?: string | null
          external_provider?: string | null
          external_subscription_id?: string | null
          flight_date?: string
          flight_number?: string
          id?: string
          is_active?: boolean | null
          last_checked_at?: string | null
          notify_channel_id?: string | null
          notify_employee_ids?: string[] | null
          notify_on?: string[] | null
          pnr_id?: string | null
          segment_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'flight_status_subscriptions_notify_channel_id_fkey'
            columns: ['notify_channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'flight_status_subscriptions_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'flight_status_subscriptions_segment_id_fkey'
            columns: ['segment_id']
            isOneToOne: false
            referencedRelation: 'pnr_segments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'flight_status_subscriptions_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      flight_templates: {
        Row: {
          component_name: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          component_name: string
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          component_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          default_category: Database['public']['Enums']['file_category'] | null
          depth: number
          folder_type: Database['public']['Enums']['folder_type']
          icon: string | null
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          path: string
          sort_order: number | null
          supplier_id: string | null
          tour_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          default_category?: Database['public']['Enums']['file_category'] | null
          depth?: number
          folder_type?: Database['public']['Enums']['folder_type']
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          path: string
          sort_order?: number | null
          supplier_id?: string | null
          tour_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          default_category?: Database['public']['Enums']['file_category'] | null
          depth?: number
          folder_type?: Database['public']['Enums']['folder_type']
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          path?: string
          sort_order?: number | null
          supplier_id?: string | null
          tour_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'folders_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'folders_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'folders_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'folders_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'folders_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'folders_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      friends: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      game_office_rooms: {
        Row: {
          created_at: string | null
          id: string
          room_data: Json
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          room_data?: Json
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          room_data?: Json
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'game_office_rooms_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_office_rooms_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_office_rooms_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      general_ledger: {
        Row: {
          closing_balance: number | null
          created_at: string | null
          id: string
          month: number
          opening_balance: number | null
          subject_id: string
          total_credit: number | null
          total_debit: number | null
          updated_at: string | null
          workspace_id: string
          year: number
        }
        Insert: {
          closing_balance?: number | null
          created_at?: string | null
          id?: string
          month: number
          opening_balance?: number | null
          subject_id: string
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
          workspace_id: string
          year: number
        }
        Update: {
          closing_balance?: number | null
          created_at?: string | null
          id?: string
          month?: number
          opening_balance?: number | null
          subject_id?: string
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
          workspace_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: 'general_ledger_subject_id_fkey'
            columns: ['subject_id']
            isOneToOne: false
            referencedRelation: 'accounting_subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'general_ledger_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      hotel_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hotels: {
        Row: {
          address: string | null
          address_en: string | null
          airport_transfer: boolean | null
          amenities: string[] | null
          avg_price_per_night: number | null
          awards: string[] | null
          best_seasons: string[] | null
          booking_contact: string | null
          booking_email: string | null
          booking_phone: string | null
          brand: string | null
          butler_service: boolean | null
          category: string | null
          certifications: string[] | null
          city_id: string
          commission_rate: number | null
          concierge_service: boolean | null
          country_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          data_verified: boolean | null
          description: string | null
          description_en: string | null
          dining_options: string[] | null
          display_order: number | null
          english_name: string | null
          facilities: Json | null
          fax: string | null
          google_maps_url: string | null
          group_friendly: boolean | null
          group_rate_available: boolean | null
          has_michelin_restaurant: boolean | null
          highlights: string[] | null
          hotel_class: string | null
          id: string
          images: string[] | null
          internal_notes: string | null
          is_active: boolean | null
          is_featured: boolean | null
          latitude: number | null
          longitude: number | null
          max_group_size: number | null
          min_rooms_for_group: number | null
          name: string
          name_local: string | null
          notes: string | null
          phone: string | null
          price_range: string | null
          region_id: string | null
          restaurants_count: number | null
          room_types: Json | null
          star_rating: number | null
          thumbnail: string | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          address_en?: string | null
          airport_transfer?: boolean | null
          amenities?: string[] | null
          avg_price_per_night?: number | null
          awards?: string[] | null
          best_seasons?: string[] | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_phone?: string | null
          brand?: string | null
          butler_service?: boolean | null
          category?: string | null
          certifications?: string[] | null
          city_id: string
          commission_rate?: number | null
          concierge_service?: boolean | null
          country_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          data_verified?: boolean | null
          description?: string | null
          description_en?: string | null
          dining_options?: string[] | null
          display_order?: number | null
          english_name?: string | null
          facilities?: Json | null
          fax?: string | null
          google_maps_url?: string | null
          group_friendly?: boolean | null
          group_rate_available?: boolean | null
          has_michelin_restaurant?: boolean | null
          highlights?: string[] | null
          hotel_class?: string | null
          id?: string
          images?: string[] | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_group_size?: number | null
          min_rooms_for_group?: number | null
          name: string
          name_local?: string | null
          notes?: string | null
          phone?: string | null
          price_range?: string | null
          region_id?: string | null
          restaurants_count?: number | null
          room_types?: Json | null
          star_rating?: number | null
          thumbnail?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          address_en?: string | null
          airport_transfer?: boolean | null
          amenities?: string[] | null
          avg_price_per_night?: number | null
          awards?: string[] | null
          best_seasons?: string[] | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_phone?: string | null
          brand?: string | null
          butler_service?: boolean | null
          category?: string | null
          certifications?: string[] | null
          city_id?: string
          commission_rate?: number | null
          concierge_service?: boolean | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          data_verified?: boolean | null
          description?: string | null
          description_en?: string | null
          dining_options?: string[] | null
          display_order?: number | null
          english_name?: string | null
          facilities?: Json | null
          fax?: string | null
          google_maps_url?: string | null
          group_friendly?: boolean | null
          group_rate_available?: boolean | null
          has_michelin_restaurant?: boolean | null
          highlights?: string[] | null
          hotel_class?: string | null
          id?: string
          images?: string[] | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_group_size?: number | null
          min_rooms_for_group?: number | null
          name?: string
          name_local?: string | null
          notes?: string | null
          phone?: string | null
          price_range?: string | null
          region_id?: string | null
          restaurants_count?: number | null
          room_types?: Json | null
          star_rating?: number | null
          thumbnail?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'luxury_hotels_city_id_fkey'
            columns: ['city_id']
            isOneToOne: false
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'luxury_hotels_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'luxury_hotels_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'luxury_hotels_region_id_fkey'
            columns: ['region_id']
            isOneToOne: false
            referencedRelation: 'regions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'luxury_hotels_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      image_library: {
        Row: {
          attraction_id: string | null
          category: string | null
          city_id: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_path: string
          file_size: number | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          public_url: string
          tags: string[] | null
          updated_at: string
          width: number | null
          workspace_id: string
        }
        Insert: {
          attraction_id?: string | null
          category?: string | null
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          public_url: string
          tags?: string[] | null
          updated_at?: string
          width?: number | null
          workspace_id: string
        }
        Update: {
          attraction_id?: string | null
          category?: string | null
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string
          file_size?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          public_url?: string
          tags?: string[] | null
          updated_at?: string
          width?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'image_library_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      invoice_orders: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          order_id: string
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          order_id: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          order_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invoice_orders_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'travel_invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoice_orders_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoice_orders_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'invoice_orders_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      itineraries: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          archived_at: string | null
          author_name: string | null
          cancellation_policy: string[] | null
          city: string | null
          closed_at: string | null
          code: string | null
          country: string | null
          cover_image: string | null
          cover_style: string | null
          cover_template_id: string | null
          created_at: string
          created_by: string | null
          daily_itinerary: Json | null
          daily_template_id: string | null
          departure_date: string | null
          description: string | null
          duration_days: number | null
          erp_itinerary_id: string | null
          faqs: Json | null
          features: Json | null
          features_style: string | null
          flight_style: string | null
          flight_template_id: string | null
          focus_cards: Json | null
          hidden_items_for_brochure: Json | null
          hidden_items_for_web: Json | null
          hotel_style: string | null
          hotels: Json | null
          id: string
          is_latest: boolean | null
          is_template: boolean | null
          itinerary_style: string | null
          itinerary_subtitle: string | null
          leader: Json | null
          leader_style: string | null
          meeting_info: Json | null
          notices: string[] | null
          outbound_flight: Json | null
          parent_id: string | null
          price: number | null
          price_note: string | null
          price_tiers: Json | null
          pricing_details: Json | null
          pricing_style: string | null
          return_flight: Json | null
          show_cancellation_policy: boolean | null
          show_faqs: boolean | null
          show_features: boolean | null
          show_hotels: boolean | null
          show_leader_meeting: boolean | null
          show_notices: boolean | null
          show_price_tiers: boolean | null
          show_pricing_details: boolean | null
          status: string | null
          subtitle: string | null
          summary: string | null
          tagline: string | null
          template_code: string | null
          template_id: string | null
          template_name: string | null
          title: string | null
          tour_code: string | null
          tour_id: string | null
          updated_at: string
          updated_by: string | null
          version: number | null
          version_records: Json | null
          workspace_id: string
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          archived_at?: string | null
          author_name?: string | null
          cancellation_policy?: string[] | null
          city?: string | null
          closed_at?: string | null
          code?: string | null
          country?: string | null
          cover_image?: string | null
          cover_style?: string | null
          cover_template_id?: string | null
          created_at?: string
          created_by?: string | null
          daily_itinerary?: Json | null
          daily_template_id?: string | null
          departure_date?: string | null
          description?: string | null
          duration_days?: number | null
          erp_itinerary_id?: string | null
          faqs?: Json | null
          features?: Json | null
          features_style?: string | null
          flight_style?: string | null
          flight_template_id?: string | null
          focus_cards?: Json | null
          hidden_items_for_brochure?: Json | null
          hidden_items_for_web?: Json | null
          hotel_style?: string | null
          hotels?: Json | null
          id?: string
          is_latest?: boolean | null
          is_template?: boolean | null
          itinerary_style?: string | null
          itinerary_subtitle?: string | null
          leader?: Json | null
          leader_style?: string | null
          meeting_info?: Json | null
          notices?: string[] | null
          outbound_flight?: Json | null
          parent_id?: string | null
          price?: number | null
          price_note?: string | null
          price_tiers?: Json | null
          pricing_details?: Json | null
          pricing_style?: string | null
          return_flight?: Json | null
          show_cancellation_policy?: boolean | null
          show_faqs?: boolean | null
          show_features?: boolean | null
          show_hotels?: boolean | null
          show_leader_meeting?: boolean | null
          show_notices?: boolean | null
          show_price_tiers?: boolean | null
          show_pricing_details?: boolean | null
          status?: string | null
          subtitle?: string | null
          summary?: string | null
          tagline?: string | null
          template_code?: string | null
          template_id?: string | null
          template_name?: string | null
          title?: string | null
          tour_code?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          version_records?: Json | null
          workspace_id: string
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          archived_at?: string | null
          author_name?: string | null
          cancellation_policy?: string[] | null
          city?: string | null
          closed_at?: string | null
          code?: string | null
          country?: string | null
          cover_image?: string | null
          cover_style?: string | null
          cover_template_id?: string | null
          created_at?: string
          created_by?: string | null
          daily_itinerary?: Json | null
          daily_template_id?: string | null
          departure_date?: string | null
          description?: string | null
          duration_days?: number | null
          erp_itinerary_id?: string | null
          faqs?: Json | null
          features?: Json | null
          features_style?: string | null
          flight_style?: string | null
          flight_template_id?: string | null
          focus_cards?: Json | null
          hidden_items_for_brochure?: Json | null
          hidden_items_for_web?: Json | null
          hotel_style?: string | null
          hotels?: Json | null
          id?: string
          is_latest?: boolean | null
          is_template?: boolean | null
          itinerary_style?: string | null
          itinerary_subtitle?: string | null
          leader?: Json | null
          leader_style?: string | null
          meeting_info?: Json | null
          notices?: string[] | null
          outbound_flight?: Json | null
          parent_id?: string | null
          price?: number | null
          price_note?: string | null
          price_tiers?: Json | null
          pricing_details?: Json | null
          pricing_style?: string | null
          return_flight?: Json | null
          show_cancellation_policy?: boolean | null
          show_faqs?: boolean | null
          show_features?: boolean | null
          show_hotels?: boolean | null
          show_leader_meeting?: boolean | null
          show_notices?: boolean | null
          show_price_tiers?: boolean | null
          show_pricing_details?: boolean | null
          status?: string | null
          subtitle?: string | null
          summary?: string | null
          tagline?: string | null
          template_code?: string | null
          template_id?: string | null
          template_name?: string | null
          title?: string | null
          tour_code?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          version_records?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fk_itineraries_created_by'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_itineraries_updated_by'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_itineraries_workspace'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itineraries_cover_template_id_fkey'
            columns: ['cover_template_id']
            isOneToOne: false
            referencedRelation: 'cover_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itineraries_daily_template_id_fkey'
            columns: ['daily_template_id']
            isOneToOne: false
            referencedRelation: 'daily_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itineraries_flight_template_id_fkey'
            columns: ['flight_template_id']
            isOneToOne: false
            referencedRelation: 'flight_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itineraries_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'itineraries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itineraries_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itineraries_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itineraries_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itineraries_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      itinerary_documents: {
        Row: {
          created_at: string
          created_by: string | null
          current_version_id: string | null
          id: string
          name: string
          tour_id: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          id?: string
          name?: string
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          id?: string
          name?: string
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fk_itinerary_current_version'
            columns: ['current_version_id']
            isOneToOne: false
            referencedRelation: 'itinerary_versions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itinerary_documents_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itinerary_documents_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itinerary_documents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      itinerary_permissions: {
        Row: {
          created_at: string | null
          id: number
          itinerary_id: string
          permission_level: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          itinerary_id: string
          permission_level: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          itinerary_id?: string
          permission_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'Itinerary_Permissions_itinerary_id_fkey'
            columns: ['itinerary_id']
            isOneToOne: false
            referencedRelation: 'itineraries'
            referencedColumns: ['id']
          },
        ]
      }
      itinerary_versions: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          document_id: string
          id: string
          restored_from: string | null
          thumbnail_url: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          document_id: string
          id?: string
          restored_from?: string | null
          thumbnail_url?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          document_id?: string
          id?: string
          restored_from?: string | null
          thumbnail_url?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: 'itinerary_versions_document_id_fkey'
            columns: ['document_id']
            isOneToOne: false
            referencedRelation: 'itinerary_documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itinerary_versions_restored_from_fkey'
            columns: ['restored_from']
            isOneToOne: false
            referencedRelation: 'itinerary_versions'
            referencedColumns: ['id']
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string | null
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          line_no: number
          subledger_id: string | null
          subledger_type: Database['public']['Enums']['subledger_type'] | null
          voucher_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          line_no: number
          subledger_id?: string | null
          subledger_type?: Database['public']['Enums']['subledger_type'] | null
          voucher_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          line_no?: number
          subledger_id?: string | null
          subledger_type?: Database['public']['Enums']['subledger_type'] | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'journal_lines_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journal_lines_voucher_id_fkey'
            columns: ['voucher_id']
            isOneToOne: false
            referencedRelation: 'journal_vouchers'
            referencedColumns: ['id']
          },
        ]
      }
      journal_vouchers: {
        Row: {
          company_unit: string | null
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          memo: string | null
          reversed_by_id: string | null
          reversed_from_id: string | null
          source_id: string | null
          source_type: string | null
          status: Database['public']['Enums']['voucher_status'] | null
          total_credit: number | null
          total_debit: number | null
          updated_at: string | null
          voucher_date: string
          voucher_no: string
          workspace_id: string | null
        }
        Insert: {
          company_unit?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          memo?: string | null
          reversed_by_id?: string | null
          reversed_from_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database['public']['Enums']['voucher_status'] | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
          voucher_date: string
          voucher_no: string
          workspace_id?: string | null
        }
        Update: {
          company_unit?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          memo?: string | null
          reversed_by_id?: string | null
          reversed_from_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database['public']['Enums']['voucher_status'] | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
          voucher_date?: string
          voucher_no?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'journal_vouchers_event_id_fkey'
            columns: ['event_id']
            isOneToOne: true
            referencedRelation: 'accounting_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journal_vouchers_reversed_by_id_fkey'
            columns: ['reversed_by_id']
            isOneToOne: false
            referencedRelation: 'journal_vouchers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journal_vouchers_reversed_from_id_fkey'
            columns: ['reversed_from_id']
            isOneToOne: false
            referencedRelation: 'journal_vouchers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'journal_vouchers_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      leader_availability: {
        Row: {
          available_end_date: string
          available_start_date: string
          created_at: string | null
          id: string
          leader_id: string
          notes: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          available_end_date: string
          available_start_date: string
          created_at?: string | null
          id?: string
          leader_id: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          available_end_date?: string
          available_start_date?: string
          created_at?: string | null
          id?: string
          leader_id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leader_availability_leader_id_fkey'
            columns: ['leader_id']
            isOneToOne: false
            referencedRelation: 'tour_leaders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leader_availability_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      leader_schedules: {
        Row: {
          created_at: string | null
          created_by: string | null
          destination: string | null
          end_date: string
          id: string
          leader_id: string
          notes: string | null
          start_date: string
          status: string
          tour_code: string | null
          tour_id: string | null
          tour_name: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          destination?: string | null
          end_date: string
          id?: string
          leader_id: string
          notes?: string | null
          start_date: string
          status?: string
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          destination?: string | null
          end_date?: string
          id?: string
          leader_id?: string
          notes?: string | null
          start_date?: string
          status?: string
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leader_schedules_leader_id_fkey'
            columns: ['leader_id']
            isOneToOne: false
            referencedRelation: 'tour_leaders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leader_schedules_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leader_schedules_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leader_schedules_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      leader_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          carry_over_days: number | null
          created_at: string | null
          employee_id: string
          entitled_days: number
          id: string
          leave_type_id: string
          notes: string | null
          remaining_days: number | null
          updated_at: string | null
          used_days: number
          workspace_id: string
          year: number
        }
        Insert: {
          carry_over_days?: number | null
          created_at?: string | null
          employee_id: string
          entitled_days?: number
          id?: string
          leave_type_id: string
          notes?: string | null
          remaining_days?: number | null
          updated_at?: string | null
          used_days?: number
          workspace_id: string
          year: number
        }
        Update: {
          carry_over_days?: number | null
          created_at?: string | null
          employee_id?: string
          entitled_days?: number
          id?: string
          leave_type_id?: string
          notes?: string | null
          remaining_days?: number | null
          updated_at?: string | null
          used_days?: number
          workspace_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: 'leave_balances_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leave_balances_leave_type_id_fkey'
            columns: ['leave_type_id']
            isOneToOne: false
            referencedRelation: 'leave_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leave_balances_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          days: number
          employee_id: string
          end_date: string
          end_time: string | null
          id: string
          leave_type_id: string
          proof_url: string | null
          reason: string | null
          reject_reason: string | null
          start_date: string
          start_time: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          days: number
          employee_id: string
          end_date: string
          end_time?: string | null
          id?: string
          leave_type_id: string
          proof_url?: string | null
          reason?: string | null
          reject_reason?: string | null
          start_date: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          days?: number
          employee_id?: string
          end_date?: string
          end_time?: string | null
          id?: string
          leave_type_id?: string
          proof_url?: string | null
          reason?: string | null
          reject_reason?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leave_requests_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leave_requests_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leave_requests_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leave_requests_leave_type_id_fkey'
            columns: ['leave_type_id']
            isOneToOne: false
            referencedRelation: 'leave_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leave_requests_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leave_requests_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      leave_types: {
        Row: {
          code: string
          created_at: string | null
          days_per_year: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          name: string
          requires_proof: boolean | null
          sort_order: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          days_per_year?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          name: string
          requires_proof?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          days_per_year?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          name?: string
          requires_proof?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leave_types_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      line_groups: {
        Row: {
          category: string | null
          group_id: string
          group_name: string | null
          id: string
          joined_at: string | null
          member_count: number | null
          note: string | null
          supplier_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          group_id: string
          group_name?: string | null
          id?: string
          joined_at?: string | null
          member_count?: number | null
          note?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          group_id?: string
          group_name?: string | null
          id?: string
          joined_at?: string | null
          member_count?: number | null
          note?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      line_users: {
        Row: {
          display_name: string | null
          employee_id: string | null
          followed_at: string | null
          id: string
          note: string | null
          picture_url: string | null
          status_message: string | null
          supplier_id: string | null
          unfollowed_at: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          display_name?: string | null
          employee_id?: string | null
          followed_at?: string | null
          id?: string
          note?: string | null
          picture_url?: string | null
          status_message?: string | null
          supplier_id?: string | null
          unfollowed_at?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          display_name?: string | null
          employee_id?: string | null
          followed_at?: string | null
          id?: string
          note?: string | null
          picture_url?: string | null
          status_message?: string | null
          supplier_id?: string | null
          unfollowed_at?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'line_users_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'line_users_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'line_users_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      linkpay_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          link: string | null
          linkpay_order_number: string | null
          payment_name: string | null
          price: number
          receipt_number: string
          status: number | null
          sync_status: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          link?: string | null
          linkpay_order_number?: string | null
          payment_name?: string | null
          price: number
          receipt_number: string
          status?: number | null
          sync_status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          link?: string | null
          linkpay_order_number?: string | null
          payment_name?: string | null
          price?: number
          receipt_number?: string
          status?: number | null
          sync_status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'linkpay_logs_receipt_number_fkey'
            columns: ['receipt_number']
            isOneToOne: false
            referencedRelation: 'receipts'
            referencedColumns: ['receipt_number']
          },
          {
            foreignKeyName: 'linkpay_logs_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      magic_combo_items: {
        Row: {
          combo_id: string
          created_at: string | null
          id: string
          magic_id: string
          order_index: number
          role: string | null
        }
        Insert: {
          combo_id: string
          created_at?: string | null
          id?: string
          magic_id: string
          order_index: number
          role?: string | null
        }
        Update: {
          combo_id?: string
          created_at?: string | null
          id?: string
          magic_id?: string
          order_index?: number
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'magic_combo_items_combo_id_fkey'
            columns: ['combo_id']
            isOneToOne: false
            referencedRelation: 'magic_combos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'magic_combo_items_magic_id_fkey'
            columns: ['magic_id']
            isOneToOne: false
            referencedRelation: 'magic_library'
            referencedColumns: ['id']
          },
        ]
      }
      magic_combos: {
        Row: {
          combo_name: string
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
          usage_example: string | null
          use_case: string | null
          workspace_id: string
        }
        Insert: {
          combo_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          usage_example?: string | null
          use_case?: string | null
          workspace_id: string
        }
        Update: {
          combo_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          usage_example?: string | null
          use_case?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      magic_library: {
        Row: {
          category: string
          check_frequency: string | null
          created_at: string | null
          current_version: string | null
          description: string | null
          github_url: string | null
          id: string
          last_checked_at: string | null
          latest_version: string | null
          layer: string
          name: string
          official_url: string | null
          source_type: string
          update_status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          category: string
          check_frequency?: string | null
          created_at?: string | null
          current_version?: string | null
          description?: string | null
          github_url?: string | null
          id?: string
          last_checked_at?: string | null
          latest_version?: string | null
          layer: string
          name: string
          official_url?: string | null
          source_type: string
          update_status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          category?: string
          check_frequency?: string | null
          created_at?: string | null
          current_version?: string | null
          description?: string | null
          github_url?: string | null
          id?: string
          last_checked_at?: string | null
          latest_version?: string | null
          layer?: string
          name?: string
          official_url?: string | null
          source_type?: string
          update_status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      manifestation_records: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          record_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          record_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          record_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'manifestation_records_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      meeting_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          room_id: string
          sender_emoji: string | null
          sender_id: string
          sender_name: string
          sender_type: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          room_id: string
          sender_emoji?: string | null
          sender_id: string
          sender_name: string
          sender_type?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          room_id?: string
          sender_emoji?: string | null
          sender_id?: string
          sender_name?: string
          sender_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_messages_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'meeting_rooms'
            referencedColumns: ['id']
          },
        ]
      }
      meeting_participants: {
        Row: {
          id: string
          is_online: boolean | null
          joined_at: string | null
          last_seen_at: string | null
          participant_emoji: string | null
          participant_id: string
          participant_name: string
          participant_type: string | null
          role: string | null
          room_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          participant_emoji?: string | null
          participant_id: string
          participant_name: string
          participant_type?: string | null
          role?: string | null
          room_id: string
        }
        Update: {
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          participant_emoji?: string | null
          participant_id?: string
          participant_name?: string
          participant_type?: string | null
          role?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_participants_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'meeting_rooms'
            referencedColumns: ['id']
          },
        ]
      }
      meeting_rooms: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          room_type: string | null
          schedule: Json | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          room_type?: string | null
          schedule?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          room_type?: string | null
          schedule?: Json | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_rooms_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      members: {
        Row: {
          add_ons: string[] | null
          address: string | null
          assigned_room: string | null
          birth_date: string | null
          checked_in: boolean | null
          checked_in_at: string | null
          chinese_name: string
          contract_created_at: string | null
          created_at: string | null
          created_by: string | null
          dietary_requirements: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          english_name: string | null
          gender: string | null
          hotel_confirmation: string | null
          id: string
          id_number: string | null
          is_active: boolean | null
          is_child_no_bed: boolean | null
          medical_conditions: string | null
          member_type: string | null
          national_id: string | null
          notes: string | null
          order_id: string | null
          passport_expiry: string | null
          passport_image_url: string | null
          passport_number: string | null
          phone: string | null
          refunds: string[] | null
          reservation_code: string | null
          room_preference: string | null
          room_type: string | null
          roommate: string | null
          special_requests: string | null
          tour_id: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          add_ons?: string[] | null
          address?: string | null
          assigned_room?: string | null
          birth_date?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          chinese_name: string
          contract_created_at?: string | null
          created_at?: string | null
          created_by?: string | null
          dietary_requirements?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          english_name?: string | null
          gender?: string | null
          hotel_confirmation?: string | null
          id: string
          id_number?: string | null
          is_active?: boolean | null
          is_child_no_bed?: boolean | null
          medical_conditions?: string | null
          member_type?: string | null
          national_id?: string | null
          notes?: string | null
          order_id?: string | null
          passport_expiry?: string | null
          passport_image_url?: string | null
          passport_number?: string | null
          phone?: string | null
          refunds?: string[] | null
          reservation_code?: string | null
          room_preference?: string | null
          room_type?: string | null
          roommate?: string | null
          special_requests?: string | null
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          add_ons?: string[] | null
          address?: string | null
          assigned_room?: string | null
          birth_date?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          chinese_name?: string
          contract_created_at?: string | null
          created_at?: string | null
          created_by?: string | null
          dietary_requirements?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          english_name?: string | null
          gender?: string | null
          hotel_confirmation?: string | null
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          is_child_no_bed?: boolean | null
          medical_conditions?: string | null
          member_type?: string | null
          national_id?: string | null
          notes?: string | null
          order_id?: string | null
          passport_expiry?: string | null
          passport_image_url?: string | null
          passport_number?: string | null
          phone?: string | null
          refunds?: string[] | null
          reservation_code?: string | null
          room_preference?: string | null
          room_type?: string | null
          roommate?: string | null
          special_requests?: string | null
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'members_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'members_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'members_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'members_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'members_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'members_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          attachments: Json | null
          author: Json | null
          channel_id: string
          content: string
          created_at: string | null
          created_by: string | null
          created_by_legacy_author: string | null
          edited_at: string | null
          id: string
          is_pinned: boolean | null
          last_reply_at: string | null
          metadata: Json | null
          parent_message_id: string | null
          reactions: Json | null
          reply_count: number | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          attachments?: Json | null
          author?: Json | null
          channel_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          created_by_legacy_author?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean | null
          last_reply_at?: string | null
          metadata?: Json | null
          parent_message_id?: string | null
          reactions?: Json | null
          reply_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          attachments?: Json | null
          author?: Json | null
          channel_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          created_by_legacy_author?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean | null
          last_reply_at?: string | null
          metadata?: Json | null
          parent_message_id?: string | null
          reactions?: Json | null
          reply_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'messages_author_id_fkey'
            columns: ['created_by_legacy_author']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_parent_message_id_fkey'
            columns: ['parent_message_id']
            isOneToOne: false
            referencedRelation: 'messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      michelin_restaurants: {
        Row: {
          address: string | null
          address_en: string | null
          avg_price_dinner: number | null
          avg_price_lunch: number | null
          awards: string[] | null
          best_season: string[] | null
          bib_gourmand: boolean | null
          booking_contact: string | null
          booking_email: string | null
          booking_notes: string | null
          chef_name: string | null
          chef_profile: string | null
          city_id: string
          commission_rate: number | null
          country_id: string
          created_at: string | null
          created_by: string | null
          cuisine_type: string[] | null
          currency: string | null
          description: string | null
          description_en: string | null
          dining_restrictions: Json | null
          dining_style: string | null
          display_order: number | null
          dress_code: string | null
          email: string | null
          english_name: string | null
          facilities: Json | null
          google_maps_url: string | null
          green_star: boolean | null
          group_menu_available: boolean | null
          id: string
          images: string[] | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          max_group_size: number | null
          menu_images: string[] | null
          michelin_guide_year: number | null
          michelin_plate: boolean | null
          michelin_stars: number | null
          min_group_size: number | null
          name: string
          name_local: string | null
          notes: string | null
          opening_hours: Json | null
          phone: string | null
          price_range: string | null
          ratings: Json | null
          recommended_for: string[] | null
          region_id: string | null
          reservation_required: boolean | null
          reservation_url: string | null
          signature_dishes: string[] | null
          specialties: string[] | null
          thumbnail: string | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          address_en?: string | null
          avg_price_dinner?: number | null
          avg_price_lunch?: number | null
          awards?: string[] | null
          best_season?: string[] | null
          bib_gourmand?: boolean | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_notes?: string | null
          chef_name?: string | null
          chef_profile?: string | null
          city_id: string
          commission_rate?: number | null
          country_id: string
          created_at?: string | null
          created_by?: string | null
          cuisine_type?: string[] | null
          currency?: string | null
          description?: string | null
          description_en?: string | null
          dining_restrictions?: Json | null
          dining_style?: string | null
          display_order?: number | null
          dress_code?: string | null
          email?: string | null
          english_name?: string | null
          facilities?: Json | null
          google_maps_url?: string | null
          green_star?: boolean | null
          group_menu_available?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_group_size?: number | null
          menu_images?: string[] | null
          michelin_guide_year?: number | null
          michelin_plate?: boolean | null
          michelin_stars?: number | null
          min_group_size?: number | null
          name: string
          name_local?: string | null
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          price_range?: string | null
          ratings?: Json | null
          recommended_for?: string[] | null
          region_id?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          signature_dishes?: string[] | null
          specialties?: string[] | null
          thumbnail?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          address_en?: string | null
          avg_price_dinner?: number | null
          avg_price_lunch?: number | null
          awards?: string[] | null
          best_season?: string[] | null
          bib_gourmand?: boolean | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_notes?: string | null
          chef_name?: string | null
          chef_profile?: string | null
          city_id?: string
          commission_rate?: number | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          cuisine_type?: string[] | null
          currency?: string | null
          description?: string | null
          description_en?: string | null
          dining_restrictions?: Json | null
          dining_style?: string | null
          display_order?: number | null
          dress_code?: string | null
          email?: string | null
          english_name?: string | null
          facilities?: Json | null
          google_maps_url?: string | null
          green_star?: boolean | null
          group_menu_available?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_group_size?: number | null
          menu_images?: string[] | null
          michelin_guide_year?: number | null
          michelin_plate?: boolean | null
          michelin_stars?: number | null
          min_group_size?: number | null
          name?: string
          name_local?: string | null
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          price_range?: string | null
          ratings?: Json | null
          recommended_for?: string[] | null
          region_id?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          signature_dishes?: string[] | null
          specialties?: string[] | null
          thumbnail?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'michelin_restaurants_city_id_fkey'
            columns: ['city_id']
            isOneToOne: false
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'michelin_restaurants_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'michelin_restaurants_region_id_fkey'
            columns: ['region_id']
            isOneToOne: false
            referencedRelation: 'regions'
            referencedColumns: ['id']
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          tab_id: string
          tab_name: string
          tab_order: number
          updated_at: string | null
          updated_by: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tab_id: string
          tab_name?: string
          tab_order?: number
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tab_id?: string
          tab_name?: string
          tab_order?: number
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      office_documents: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          name: string
          tour_id: string | null
          type: string
          updated_at: string
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          name?: string
          tour_id?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          name?: string
          tour_id?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'office_documents_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'office_documents_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'office_documents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      online_trip_members: {
        Row: {
          checked_in: boolean | null
          checked_in_at: string | null
          created_at: string | null
          erp_driver_task_id: string | null
          erp_employee_id: string | null
          erp_order_member_id: string | null
          id: string
          member_type: string | null
          name: string | null
          phone: string | null
          remarks: string | null
          role: string
          room_number: string | null
          room_type: string | null
          roommates: string[] | null
          special_meal: string | null
          trip_id: string
          updated_at: string | null
          user_id: string | null
          vehicle_number: string | null
          vehicle_seat: string | null
        }
        Insert: {
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          erp_driver_task_id?: string | null
          erp_employee_id?: string | null
          erp_order_member_id?: string | null
          id?: string
          member_type?: string | null
          name?: string | null
          phone?: string | null
          remarks?: string | null
          role: string
          room_number?: string | null
          room_type?: string | null
          roommates?: string[] | null
          special_meal?: string | null
          trip_id: string
          updated_at?: string | null
          user_id?: string | null
          vehicle_number?: string | null
          vehicle_seat?: string | null
        }
        Update: {
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          erp_driver_task_id?: string | null
          erp_employee_id?: string | null
          erp_order_member_id?: string | null
          id?: string
          member_type?: string | null
          name?: string | null
          phone?: string | null
          remarks?: string | null
          role?: string
          room_number?: string | null
          room_type?: string | null
          roommates?: string[] | null
          special_meal?: string | null
          trip_id?: string
          updated_at?: string | null
          user_id?: string | null
          vehicle_number?: string | null
          vehicle_seat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'online_trip_members_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'online_trips'
            referencedColumns: ['id']
          },
        ]
      }
      online_trips: {
        Row: {
          code: string
          created_at: string | null
          daily_itinerary: Json | null
          departure_date: string
          destination: string | null
          erp_itinerary_id: string | null
          erp_tour_id: string | null
          handoff_at: string | null
          id: string
          leader_info: Json | null
          meeting_info: Json | null
          name: string
          outbound_flight: Json | null
          return_date: string | null
          return_flight: Json | null
          status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          daily_itinerary?: Json | null
          departure_date: string
          destination?: string | null
          erp_itinerary_id?: string | null
          erp_tour_id?: string | null
          handoff_at?: string | null
          id?: string
          leader_info?: Json | null
          meeting_info?: Json | null
          name: string
          outbound_flight?: Json | null
          return_date?: string | null
          return_flight?: Json | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          daily_itinerary?: Json | null
          departure_date?: string
          destination?: string | null
          erp_itinerary_id?: string | null
          erp_tour_id?: string | null
          handoff_at?: string | null
          id?: string
          leader_info?: Json | null
          meeting_info?: Json | null
          name?: string
          outbound_flight?: Json | null
          return_date?: string | null
          return_flight?: Json | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      opening_balances: {
        Row: {
          account_id: string
          created_at: string | null
          created_by: string | null
          credit_amount: number | null
          debit_amount: number | null
          fiscal_year: number
          id: string
          opening_date: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          created_by?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          fiscal_year: number
          id?: string
          opening_date: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          created_by?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          fiscal_year?: number
          id?: string
          opening_date?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'opening_balances_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'opening_balances_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      order_members: {
        Row: {
          age: number | null
          balance_amount: number | null
          balance_receipt_no: string | null
          birth_date: string | null
          checked_in: boolean | null
          checked_in_at: string | null
          chinese_name: string | null
          contract_created_at: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          custom_costs: Json | null
          customer_id: string | null
          deposit_amount: number | null
          deposit_receipt_no: string | null
          flight_cost: number | null
          flight_self_arranged: boolean | null
          gender: string | null
          hotel_1_checkin: string | null
          hotel_1_checkout: string | null
          hotel_1_name: string | null
          hotel_2_checkin: string | null
          hotel_2_checkout: string | null
          hotel_2_name: string | null
          id: string
          id_number: string | null
          identity: string | null
          member_type: string
          misc_cost: number | null
          order_id: string
          passport_expiry: string | null
          passport_image_url: string | null
          passport_name: string | null
          passport_name_print: string | null
          passport_number: string | null
          pnr: string | null
          profit: number | null
          remarks: string | null
          selling_price: number | null
          sort_order: number | null
          special_meal: string | null
          ticket_number: string | null
          ticketing_deadline: string | null
          total_payable: number | null
          transport_cost: number | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          age?: number | null
          balance_amount?: number | null
          balance_receipt_no?: string | null
          birth_date?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          chinese_name?: string | null
          contract_created_at?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_costs?: Json | null
          customer_id?: string | null
          deposit_amount?: number | null
          deposit_receipt_no?: string | null
          flight_cost?: number | null
          flight_self_arranged?: boolean | null
          gender?: string | null
          hotel_1_checkin?: string | null
          hotel_1_checkout?: string | null
          hotel_1_name?: string | null
          hotel_2_checkin?: string | null
          hotel_2_checkout?: string | null
          hotel_2_name?: string | null
          id?: string
          id_number?: string | null
          identity?: string | null
          member_type: string
          misc_cost?: number | null
          order_id: string
          passport_expiry?: string | null
          passport_image_url?: string | null
          passport_name?: string | null
          passport_name_print?: string | null
          passport_number?: string | null
          pnr?: string | null
          profit?: number | null
          remarks?: string | null
          selling_price?: number | null
          sort_order?: number | null
          special_meal?: string | null
          ticket_number?: string | null
          ticketing_deadline?: string | null
          total_payable?: number | null
          transport_cost?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          age?: number | null
          balance_amount?: number | null
          balance_receipt_no?: string | null
          birth_date?: string | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          chinese_name?: string | null
          contract_created_at?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_costs?: Json | null
          customer_id?: string | null
          deposit_amount?: number | null
          deposit_receipt_no?: string | null
          flight_cost?: number | null
          flight_self_arranged?: boolean | null
          gender?: string | null
          hotel_1_checkin?: string | null
          hotel_1_checkout?: string | null
          hotel_1_name?: string | null
          hotel_2_checkin?: string | null
          hotel_2_checkout?: string | null
          hotel_2_name?: string | null
          id?: string
          id_number?: string | null
          identity?: string | null
          member_type?: string
          misc_cost?: number | null
          order_id?: string
          passport_expiry?: string | null
          passport_image_url?: string | null
          passport_name?: string | null
          passport_name_print?: string | null
          passport_number?: string | null
          pnr?: string | null
          profit?: number | null
          remarks?: string | null
          selling_price?: number | null
          sort_order?: number | null
          special_meal?: string | null
          ticket_number?: string | null
          ticketing_deadline?: string | null
          total_payable?: number | null
          transport_cost?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'order_members_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_members_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_members_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'order_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          adult_count: number | null
          assistant: string | null
          child_count: number | null
          code: string
          contact_email: string | null
          contact_person: string
          contact_phone: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          identity_options: Json | null
          infant_count: number | null
          is_active: boolean | null
          member_count: number | null
          notes: string | null
          order_number: string | null
          paid_amount: number | null
          payment_status: string | null
          remaining_amount: number | null
          sales_person: string | null
          status: string
          total_amount: number | null
          total_people: number | null
          tour_id: string | null
          tour_name: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          adult_count?: number | null
          assistant?: string | null
          child_count?: number | null
          code: string
          contact_email?: string | null
          contact_person: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          identity_options?: Json | null
          infant_count?: number | null
          is_active?: boolean | null
          member_count?: number | null
          notes?: string | null
          order_number?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          remaining_amount?: number | null
          sales_person?: string | null
          status?: string
          total_amount?: number | null
          total_people?: number | null
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          adult_count?: number | null
          assistant?: string | null
          child_count?: number | null
          code?: string
          contact_email?: string | null
          contact_person?: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          identity_options?: Json | null
          infant_count?: number | null
          is_active?: boolean | null
          member_count?: number | null
          notes?: string | null
          order_number?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          remaining_amount?: number | null
          sales_person?: string | null
          status?: string
          total_amount?: number | null
          total_people?: number | null
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string | null
          created_at: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          placeholder: string | null
          sort_order: number | null
          type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          placeholder?: string | null
          sort_order?: number | null
          type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          placeholder?: string | null
          sort_order?: number | null
          type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_methods_credit_account_id_fkey'
            columns: ['credit_account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_methods_debit_account_id_fkey'
            columns: ['debit_account_id']
            isOneToOne: false
            referencedRelation: 'chart_of_accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_methods_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      payment_request_items: {
        Row: {
          advanced_by: string | null
          advanced_by_name: string | null
          category: string | null
          confirmation_item_id: string | null
          created_at: string | null
          created_by: string | null
          custom_request_date: string | null
          description: string
          id: string
          item_number: string | null
          notes: string | null
          payment_method: string | null
          payment_method_id: string | null
          quantity: number | null
          request_id: string | null
          sort_order: number | null
          subtotal: number | null
          supplier_id: string | null
          supplier_name: string | null
          tour_id: string | null
          tour_request_id: string | null
          unitprice: number | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          advanced_by?: string | null
          advanced_by_name?: string | null
          category?: string | null
          confirmation_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_request_date?: string | null
          description: string
          id?: string
          item_number?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          quantity?: number | null
          request_id?: string | null
          sort_order?: number | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          tour_id?: string | null
          tour_request_id?: string | null
          unitprice?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          advanced_by?: string | null
          advanced_by_name?: string | null
          category?: string | null
          confirmation_item_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_request_date?: string | null
          description?: string
          id?: string
          item_number?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          quantity?: number | null
          request_id?: string | null
          sort_order?: number | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          tour_id?: string | null
          tour_request_id?: string | null
          unitprice?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payment_request_items_confirmation_item_id_fkey'
            columns: ['confirmation_item_id']
            isOneToOne: false
            referencedRelation: 'tour_confirmation_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'payment_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_request_items_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
      payment_requests: {
        Row: {
          accounting_subject_id: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          batch_id: string | null
          budget_warning: boolean | null
          code: string
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          expense_type: string | null
          id: string
          is_special_billing: boolean | null
          items: Json | null
          notes: string | null
          order_id: string | null
          order_number: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method_id: string | null
          request_category: string | null
          request_date: string | null
          request_number: string | null
          request_type: string
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number | null
          tour_code: string | null
          tour_id: string | null
          tour_name: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          accounting_subject_id?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          budget_warning?: boolean | null
          code: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expense_type?: string | null
          id?: string
          is_special_billing?: boolean | null
          items?: Json | null
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method_id?: string | null
          request_category?: string | null
          request_date?: string | null
          request_number?: string | null
          request_type: string
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          accounting_subject_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          budget_warning?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expense_type?: string | null
          id?: string
          is_special_billing?: boolean | null
          items?: Json | null
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method_id?: string | null
          request_category?: string | null
          request_date?: string | null
          request_number?: string | null
          request_type?: string
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          tour_code?: string | null
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payment_requests_accounting_subject_id_fkey'
            columns: ['accounting_subject_id']
            isOneToOne: false
            referencedRelation: 'accounting_subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_requests_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_requests_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_requests_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'payment_requests_paid_by_fkey'
            columns: ['paid_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_requests_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_requests_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_requests_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_requests_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          order_id: string | null
          payer: string | null
          payment_date: string
          payment_method_id: string | null
          payment_number: string
          payment_type: string | null
          received_by: string | null
          status: string | null
          tour_id: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payer?: string | null
          payment_date: string
          payment_method_id?: string | null
          payment_number: string
          payment_type?: string | null
          received_by?: string | null
          status?: string | null
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payer?: string | null
          payment_date?: string
          payment_method_id?: string | null
          payment_number?: string
          payment_type?: string | null
          received_by?: string | null
          status?: string | null
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payments_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_payment_method_id_fkey'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      payroll_periods: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          end_date: string
          id: string
          month: number
          notes: string | null
          paid_at: string | null
          start_date: string
          status: string
          updated_at: string | null
          workspace_id: string
          year: number
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          month: number
          notes?: string | null
          paid_at?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
          workspace_id: string
          year: number
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          month?: number
          notes?: string | null
          paid_at?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
          workspace_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: 'payroll_periods_confirmed_by_fkey'
            columns: ['confirmed_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payroll_periods_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      payroll_records: {
        Row: {
          actual_work_days: number
          allowance_details: Json | null
          allowances: number
          base_salary: number
          bonus: number
          created_at: string | null
          deduction_details: Json | null
          employee_id: string
          gross_salary: number
          id: string
          late_count: number
          late_deduction: number
          meal_allowance: number
          net_salary: number
          notes: string | null
          other_additions: number
          other_deductions: number
          overtime_details: Json | null
          overtime_hours: number
          overtime_pay: number
          paid_leave_days: number
          payroll_period_id: string
          total_deductions: number
          transportation_allowance: number
          unpaid_leave_days: number
          unpaid_leave_deduction: number
          updated_at: string | null
          work_days: number
          workspace_id: string
        }
        Insert: {
          actual_work_days?: number
          allowance_details?: Json | null
          allowances?: number
          base_salary?: number
          bonus?: number
          created_at?: string | null
          deduction_details?: Json | null
          employee_id: string
          gross_salary?: number
          id?: string
          late_count?: number
          late_deduction?: number
          meal_allowance?: number
          net_salary?: number
          notes?: string | null
          other_additions?: number
          other_deductions?: number
          overtime_details?: Json | null
          overtime_hours?: number
          overtime_pay?: number
          paid_leave_days?: number
          payroll_period_id: string
          total_deductions?: number
          transportation_allowance?: number
          unpaid_leave_days?: number
          unpaid_leave_deduction?: number
          updated_at?: string | null
          work_days?: number
          workspace_id: string
        }
        Update: {
          actual_work_days?: number
          allowance_details?: Json | null
          allowances?: number
          base_salary?: number
          bonus?: number
          created_at?: string | null
          deduction_details?: Json | null
          employee_id?: string
          gross_salary?: number
          id?: string
          late_count?: number
          late_deduction?: number
          meal_allowance?: number
          net_salary?: number
          notes?: string | null
          other_additions?: number
          other_deductions?: number
          overtime_details?: Json | null
          overtime_hours?: number
          overtime_pay?: number
          paid_leave_days?: number
          payroll_period_id?: string
          total_deductions?: number
          transportation_allowance?: number
          unpaid_leave_days?: number
          unpaid_leave_deduction?: number
          updated_at?: string | null
          work_days?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payroll_records_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payroll_records_payroll_period_id_fkey'
            columns: ['payroll_period_id']
            isOneToOne: false
            referencedRelation: 'payroll_periods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payroll_records_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      personal_canvases: {
        Row: {
          canvas_number: number
          content: Json | null
          created_at: string | null
          employee_id: string
          id: string
          layout: Json | null
          title: string
          type: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          canvas_number: number
          content?: Json | null
          created_at?: string | null
          employee_id: string
          id?: string
          layout?: Json | null
          title: string
          type?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          canvas_number?: number
          content?: Json | null
          created_at?: string | null
          employee_id?: string
          id?: string
          layout?: Json | null
          title?: string
          type?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      personal_expenses: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          category_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          exchange_rate: number | null
          expense_date: string
          expense_time: string | null
          id: string
          is_foreign_transaction: boolean | null
          is_settled: boolean | null
          is_split: boolean | null
          location: string | null
          payment_method: string | null
          receipt_url: string | null
          settlement_amount: number | null
          settlement_currency: string | null
          split_expense_id: string | null
          split_group_id: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          exchange_rate?: number | null
          expense_date?: string
          expense_time?: string | null
          id?: string
          is_foreign_transaction?: boolean | null
          is_settled?: boolean | null
          is_split?: boolean | null
          location?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          settlement_amount?: number | null
          settlement_currency?: string | null
          split_expense_id?: string | null
          split_group_id?: string | null
          tags?: string[] | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          exchange_rate?: number | null
          expense_date?: string
          expense_time?: string | null
          id?: string
          is_foreign_transaction?: boolean | null
          is_settled?: boolean | null
          is_split?: boolean | null
          location?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          settlement_amount?: number | null
          settlement_currency?: string | null
          split_expense_id?: string | null
          split_group_id?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'personal_expenses_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'personal_expenses_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'expense_categories'
            referencedColumns: ['id']
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_date: string
          created_at: string
          exercise_id: number
          exercise_name: string
          id: string
          max_reps: number | null
          max_weight: number | null
          one_rep_max: number | null
          session_id: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          achieved_date: string
          created_at?: string
          exercise_id: number
          exercise_name: string
          id?: string
          max_reps?: number | null
          max_weight?: number | null
          one_rep_max?: number | null
          session_id?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          achieved_date?: string
          created_at?: string
          exercise_id?: number
          exercise_name?: string
          id?: string
          max_reps?: number | null
          max_weight?: number | null
          one_rep_max?: number | null
          session_id?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'personal_records_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_ai_queries: {
        Row: {
          created_at: string | null
          id: string
          pnr_id: string | null
          queried_by: string | null
          query_context: Json | null
          query_text: string
          response_metadata: Json | null
          response_text: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pnr_id?: string | null
          queried_by?: string | null
          query_context?: Json | null
          query_text: string
          response_metadata?: Json | null
          response_text?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pnr_id?: string | null
          queried_by?: string | null
          query_context?: Json | null
          query_text?: string
          response_metadata?: Json | null
          response_text?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_ai_queries_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_ai_queries_queried_by_fkey'
            columns: ['queried_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_ai_queries_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_fare_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_checked_at: string | null
          last_fare: number | null
          notify_channel_id: string | null
          notify_employee_ids: string[] | null
          pnr_id: string
          threshold_amount: number | null
          threshold_percent: number | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_checked_at?: string | null
          last_fare?: number | null
          notify_channel_id?: string | null
          notify_employee_ids?: string[] | null
          pnr_id: string
          threshold_amount?: number | null
          threshold_percent?: number | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_checked_at?: string | null
          last_fare?: number | null
          notify_channel_id?: string | null
          notify_employee_ids?: string[] | null
          pnr_id?: string
          threshold_amount?: number | null
          threshold_percent?: number | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_fare_alerts_notify_channel_id_fkey'
            columns: ['notify_channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_fare_alerts_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_fare_alerts_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_fare_history: {
        Row: {
          base_fare: number | null
          created_at: string | null
          currency: string | null
          fare_basis: string | null
          id: string
          pnr_id: string
          raw_fare_data: Json | null
          recorded_at: string | null
          recorded_by: string | null
          source: string | null
          taxes: number | null
          total_fare: number
          workspace_id: string
        }
        Insert: {
          base_fare?: number | null
          created_at?: string | null
          currency?: string | null
          fare_basis?: string | null
          id?: string
          pnr_id: string
          raw_fare_data?: Json | null
          recorded_at?: string | null
          recorded_by?: string | null
          source?: string | null
          taxes?: number | null
          total_fare: number
          workspace_id: string
        }
        Update: {
          base_fare?: number | null
          created_at?: string | null
          currency?: string | null
          fare_basis?: string | null
          id?: string
          pnr_id?: string
          raw_fare_data?: Json | null
          recorded_at?: string | null
          recorded_by?: string | null
          source?: string | null
          taxes?: number | null
          total_fare?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_fare_history_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_fare_history_recorded_by_fkey'
            columns: ['recorded_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_fare_history_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_flight_status_history: {
        Row: {
          airline_code: string
          booking_status: string | null
          delay_minutes: number | null
          external_data: Json | null
          flight_date: string
          flight_number: string
          gate_info: string | null
          id: string
          new_arrival_time: string | null
          new_departure_time: string | null
          operational_status: string | null
          pnr_id: string
          recorded_at: string | null
          remarks: string | null
          segment_id: string | null
          source: string | null
          workspace_id: string
        }
        Insert: {
          airline_code: string
          booking_status?: string | null
          delay_minutes?: number | null
          external_data?: Json | null
          flight_date: string
          flight_number: string
          gate_info?: string | null
          id?: string
          new_arrival_time?: string | null
          new_departure_time?: string | null
          operational_status?: string | null
          pnr_id: string
          recorded_at?: string | null
          remarks?: string | null
          segment_id?: string | null
          source?: string | null
          workspace_id: string
        }
        Update: {
          airline_code?: string
          booking_status?: string | null
          delay_minutes?: number | null
          external_data?: Json | null
          flight_date?: string
          flight_number?: string
          gate_info?: string | null
          id?: string
          new_arrival_time?: string | null
          new_departure_time?: string | null
          operational_status?: string | null
          pnr_id?: string
          recorded_at?: string | null
          remarks?: string | null
          segment_id?: string | null
          source?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_flight_status_history_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_flight_status_history_segment_id_fkey'
            columns: ['segment_id']
            isOneToOne: false
            referencedRelation: 'pnr_segments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_flight_status_history_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_passengers: {
        Row: {
          created_at: string | null
          customer_id: string | null
          date_of_birth: string | null
          given_name: string | null
          id: string
          order_member_id: string | null
          passenger_type: string | null
          pnr_id: string
          sequence_number: number | null
          surname: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          date_of_birth?: string | null
          given_name?: string | null
          id?: string
          order_member_id?: string | null
          passenger_type?: string | null
          pnr_id: string
          sequence_number?: number | null
          surname: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          date_of_birth?: string | null
          given_name?: string | null
          id?: string
          order_member_id?: string | null
          passenger_type?: string | null
          pnr_id?: string
          sequence_number?: number | null
          surname?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_passengers_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_queue_items: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          pnr_id: string
          priority: number | null
          queue_type: string
          reminder_at: string | null
          resolution_notes: string | null
          status: string | null
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          pnr_id: string
          priority?: number | null
          queue_type: string
          reminder_at?: string | null
          resolution_notes?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          pnr_id?: string
          priority?: number | null
          queue_type?: string
          reminder_at?: string | null
          resolution_notes?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_queue_items_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_queue_items_completed_by_fkey'
            columns: ['completed_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_queue_items_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_queue_items_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_queue_items_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_records: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_date: string | null
          current_fare: number | null
          fare_currency: string | null
          has_schedule_change: boolean | null
          id: string
          is_ticketed: boolean | null
          notes: string | null
          office_id: string | null
          queue_count: number | null
          raw_content: string | null
          record_locator: string
          ticket_issued_at: string | null
          ticket_numbers: string[] | null
          ticketing_deadline: string | null
          ticketing_status: string | null
          tour_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          current_fare?: number | null
          fare_currency?: string | null
          has_schedule_change?: boolean | null
          id?: string
          is_ticketed?: boolean | null
          notes?: string | null
          office_id?: string | null
          queue_count?: number | null
          raw_content?: string | null
          record_locator: string
          ticket_issued_at?: string | null
          ticket_numbers?: string[] | null
          ticketing_deadline?: string | null
          ticketing_status?: string | null
          tour_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          current_fare?: number | null
          fare_currency?: string | null
          has_schedule_change?: boolean | null
          id?: string
          is_ticketed?: boolean | null
          notes?: string | null
          office_id?: string | null
          queue_count?: number | null
          raw_content?: string | null
          record_locator?: string
          ticket_issued_at?: string | null
          ticket_numbers?: string[] | null
          ticketing_deadline?: string | null
          ticketing_status?: string | null
          tour_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_records_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_records_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_remarks: {
        Row: {
          content: string
          created_at: string | null
          id: string
          pnr_id: string
          remark_type: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          pnr_id: string
          remark_type?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          pnr_id?: string
          remark_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_remarks_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_schedule_changes: {
        Row: {
          change_type: string
          created_at: string | null
          detected_at: string | null
          id: string
          new_arrival_time: string | null
          new_departure_date: string | null
          new_departure_time: string | null
          new_flight_number: string | null
          notes: string | null
          original_arrival_time: string | null
          original_departure_date: string | null
          original_departure_time: string | null
          original_flight_number: string | null
          pnr_id: string
          processed_at: string | null
          processed_by: string | null
          requires_refund: boolean | null
          requires_reissue: boolean | null
          requires_revalidation: boolean | null
          segment_id: string | null
          status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          change_type: string
          created_at?: string | null
          detected_at?: string | null
          id?: string
          new_arrival_time?: string | null
          new_departure_date?: string | null
          new_departure_time?: string | null
          new_flight_number?: string | null
          notes?: string | null
          original_arrival_time?: string | null
          original_departure_date?: string | null
          original_departure_time?: string | null
          original_flight_number?: string | null
          pnr_id: string
          processed_at?: string | null
          processed_by?: string | null
          requires_refund?: boolean | null
          requires_reissue?: boolean | null
          requires_revalidation?: boolean | null
          segment_id?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          change_type?: string
          created_at?: string | null
          detected_at?: string | null
          id?: string
          new_arrival_time?: string | null
          new_departure_date?: string | null
          new_departure_time?: string | null
          new_flight_number?: string | null
          notes?: string | null
          original_arrival_time?: string | null
          original_departure_date?: string | null
          original_departure_time?: string | null
          original_flight_number?: string | null
          pnr_id?: string
          processed_at?: string | null
          processed_by?: string | null
          requires_refund?: boolean | null
          requires_reissue?: boolean | null
          requires_revalidation?: boolean | null
          segment_id?: string | null
          status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_schedule_changes_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_schedule_changes_processed_by_fkey'
            columns: ['processed_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_schedule_changes_segment_id_fkey'
            columns: ['segment_id']
            isOneToOne: false
            referencedRelation: 'pnr_segments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_schedule_changes_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_segments: {
        Row: {
          airline_code: string
          arrival_day_offset: number | null
          arrival_time: string | null
          booking_class: string | null
          created_at: string | null
          day_of_week: number | null
          departure_date: string
          departure_time: string | null
          destination: string
          equipment: string | null
          flight_number: string
          id: string
          origin: string
          pnr_id: string
          quantity: number | null
          segment_number: number | null
          status_code: string | null
        }
        Insert: {
          airline_code: string
          arrival_day_offset?: number | null
          arrival_time?: string | null
          booking_class?: string | null
          created_at?: string | null
          day_of_week?: number | null
          departure_date: string
          departure_time?: string | null
          destination: string
          equipment?: string | null
          flight_number: string
          id?: string
          origin: string
          pnr_id: string
          quantity?: number | null
          segment_number?: number | null
          status_code?: string | null
        }
        Update: {
          airline_code?: string
          arrival_day_offset?: number | null
          arrival_time?: string | null
          booking_class?: string | null
          created_at?: string | null
          day_of_week?: number | null
          departure_date?: string
          departure_time?: string | null
          destination?: string
          equipment?: string | null
          flight_number?: string
          id?: string
          origin?: string
          pnr_id?: string
          quantity?: number | null
          segment_number?: number | null
          status_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_segments_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
        ]
      }
      pnr_ssr_elements: {
        Row: {
          airline_code: string | null
          created_at: string | null
          free_text: string | null
          id: string
          passenger_id: string | null
          pnr_id: string
          segment_id: string | null
          ssr_code: string
          status: string | null
        }
        Insert: {
          airline_code?: string | null
          created_at?: string | null
          free_text?: string | null
          id?: string
          passenger_id?: string | null
          pnr_id: string
          segment_id?: string | null
          ssr_code: string
          status?: string | null
        }
        Update: {
          airline_code?: string | null
          created_at?: string | null
          free_text?: string | null
          id?: string
          passenger_id?: string | null
          pnr_id?: string
          segment_id?: string | null
          ssr_code?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pnr_ssr_elements_passenger_id_fkey'
            columns: ['passenger_id']
            isOneToOne: false
            referencedRelation: 'pnr_passengers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_ssr_elements_pnr_id_fkey'
            columns: ['pnr_id']
            isOneToOne: false
            referencedRelation: 'pnr_records'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnr_ssr_elements_segment_id_fkey'
            columns: ['segment_id']
            isOneToOne: false
            referencedRelation: 'pnr_segments'
            referencedColumns: ['id']
          },
        ]
      }
      pnrs: {
        Row: {
          cancellation_deadline: string | null
          created_at: string | null
          created_by: string | null
          employee_id: string | null
          id: string
          notes: string | null
          other_info: string[] | null
          passenger_names: string[]
          raw_pnr: string
          record_locator: string
          segments: Json | null
          special_requests: string[] | null
          status: string | null
          ticketing_deadline: string | null
          tour_id: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          cancellation_deadline?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          other_info?: string[] | null
          passenger_names?: string[]
          raw_pnr: string
          record_locator: string
          segments?: Json | null
          special_requests?: string[] | null
          status?: string | null
          ticketing_deadline?: string | null
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          cancellation_deadline?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          other_info?: string[] | null
          passenger_names?: string[]
          raw_pnr?: string
          record_locator?: string
          segments?: Json | null
          special_requests?: string[] | null
          status?: string | null
          ticketing_deadline?: string | null
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pnrs_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnrs_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnrs_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnrs_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnrs_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pnrs_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      posting_rules: {
        Row: {
          created_at: string | null
          event_type: Database['public']['Enums']['accounting_event_type']
          id: string
          is_active: boolean | null
          rule_config: Json
          rule_name: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: Database['public']['Enums']['accounting_event_type']
          id?: string
          is_active?: boolean | null
          rule_config: Json
          rule_name: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: Database['public']['Enums']['accounting_event_type']
          id?: string
          is_active?: boolean | null
          rule_config?: Json
          rule_name?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'posting_rules_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      premium_experiences: {
        Row: {
          advance_booking_days: number | null
          available_seasons: string[] | null
          awards: string[] | null
          best_for_age_group: string | null
          best_time_of_day: string | null
          booking_contact: string | null
          booking_email: string | null
          booking_phone: string | null
          cancellation_policy: string | null
          category: string
          certifications: string[] | null
          city_id: string
          combine_with: string[] | null
          commission_rate: number | null
          country_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string
          description_en: string | null
          difficulty_level: string | null
          display_order: number | null
          dress_code: string | null
          duration_hours: number | null
          eco_friendly: boolean | null
          english_name: string | null
          exclusivity_level: string
          expert_credentials: string[] | null
          expert_name: string | null
          expert_profile: string | null
          expert_title: string | null
          group_size_max: number | null
          group_size_min: number | null
          highlights: string[] | null
          id: string
          images: string[] | null
          inclusions: Json | null
          internal_notes: string | null
          is_active: boolean | null
          is_featured: boolean | null
          language_support: string[] | null
          latitude: number | null
          longitude: number | null
          media_features: string[] | null
          meeting_point: string | null
          meeting_point_coords: Json | null
          minimum_participants: number | null
          name: string
          name_local: string | null
          net_price_per_person: number | null
          physical_requirement: string | null
          pickup_service: boolean | null
          price_excludes: string[] | null
          price_includes: string[] | null
          price_per_person_max: number | null
          price_per_person_min: number | null
          ratings: Json | null
          recommended_for: string[] | null
          region_id: string | null
          related_attractions: string[] | null
          restrictions: string[] | null
          review_count: number | null
          specific_location: string | null
          sub_category: string[] | null
          suitable_for_children: boolean | null
          supports_local_community: boolean | null
          sustainability_practices: string[] | null
          tagline: string | null
          thumbnail: string | null
          transportation_included: boolean | null
          updated_at: string | null
          updated_by: string | null
          video_url: string | null
          what_makes_it_special: string | null
          what_to_bring: string[] | null
        }
        Insert: {
          advance_booking_days?: number | null
          available_seasons?: string[] | null
          awards?: string[] | null
          best_for_age_group?: string | null
          best_time_of_day?: string | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_phone?: string | null
          cancellation_policy?: string | null
          category: string
          certifications?: string[] | null
          city_id: string
          combine_with?: string[] | null
          commission_rate?: number | null
          country_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description: string
          description_en?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          dress_code?: string | null
          duration_hours?: number | null
          eco_friendly?: boolean | null
          english_name?: string | null
          exclusivity_level: string
          expert_credentials?: string[] | null
          expert_name?: string | null
          expert_profile?: string | null
          expert_title?: string | null
          group_size_max?: number | null
          group_size_min?: number | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          inclusions?: Json | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          language_support?: string[] | null
          latitude?: number | null
          longitude?: number | null
          media_features?: string[] | null
          meeting_point?: string | null
          meeting_point_coords?: Json | null
          minimum_participants?: number | null
          name: string
          name_local?: string | null
          net_price_per_person?: number | null
          physical_requirement?: string | null
          pickup_service?: boolean | null
          price_excludes?: string[] | null
          price_includes?: string[] | null
          price_per_person_max?: number | null
          price_per_person_min?: number | null
          ratings?: Json | null
          recommended_for?: string[] | null
          region_id?: string | null
          related_attractions?: string[] | null
          restrictions?: string[] | null
          review_count?: number | null
          specific_location?: string | null
          sub_category?: string[] | null
          suitable_for_children?: boolean | null
          supports_local_community?: boolean | null
          sustainability_practices?: string[] | null
          tagline?: string | null
          thumbnail?: string | null
          transportation_included?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          video_url?: string | null
          what_makes_it_special?: string | null
          what_to_bring?: string[] | null
        }
        Update: {
          advance_booking_days?: number | null
          available_seasons?: string[] | null
          awards?: string[] | null
          best_for_age_group?: string | null
          best_time_of_day?: string | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_phone?: string | null
          cancellation_policy?: string | null
          category?: string
          certifications?: string[] | null
          city_id?: string
          combine_with?: string[] | null
          commission_rate?: number | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string
          description_en?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          dress_code?: string | null
          duration_hours?: number | null
          eco_friendly?: boolean | null
          english_name?: string | null
          exclusivity_level?: string
          expert_credentials?: string[] | null
          expert_name?: string | null
          expert_profile?: string | null
          expert_title?: string | null
          group_size_max?: number | null
          group_size_min?: number | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          inclusions?: Json | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          language_support?: string[] | null
          latitude?: number | null
          longitude?: number | null
          media_features?: string[] | null
          meeting_point?: string | null
          meeting_point_coords?: Json | null
          minimum_participants?: number | null
          name?: string
          name_local?: string | null
          net_price_per_person?: number | null
          physical_requirement?: string | null
          pickup_service?: boolean | null
          price_excludes?: string[] | null
          price_includes?: string[] | null
          price_per_person_max?: number | null
          price_per_person_min?: number | null
          ratings?: Json | null
          recommended_for?: string[] | null
          region_id?: string | null
          related_attractions?: string[] | null
          restrictions?: string[] | null
          review_count?: number | null
          specific_location?: string | null
          sub_category?: string[] | null
          suitable_for_children?: boolean | null
          supports_local_community?: boolean | null
          sustainability_practices?: string[] | null
          tagline?: string | null
          thumbnail?: string | null
          transportation_included?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          video_url?: string | null
          what_makes_it_special?: string | null
          what_to_bring?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: 'premium_experiences_city_id_fkey'
            columns: ['city_id']
            isOneToOne: false
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'premium_experiences_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'premium_experiences_region_id_fkey'
            columns: ['region_id']
            isOneToOne: false
            referencedRelation: 'regions'
            referencedColumns: ['id']
          },
        ]
      }
      price_list_items: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          id: string
          item_code: string
          item_name: string
          minimum_order: number | null
          notes: string | null
          supplier_id: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          item_code: string
          item_name: string
          minimum_order?: number | null
          notes?: string | null
          supplier_id?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          item_code?: string
          item_name?: string
          minimum_order?: number | null
          notes?: string | null
          supplier_id?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      pricing_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          customer_id: string | null
          display_name: string | null
          email: string | null
          employee_id: string | null
          id: string
          identity_verified_at: string | null
          is_beta_tester: boolean | null
          is_employee: boolean | null
          is_traveler: boolean | null
          linked_birthday: string | null
          linked_id_number: string | null
          name: string | null
          nickname: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          customer_id?: string | null
          display_name?: string | null
          email?: string | null
          employee_id?: string | null
          id: string
          identity_verified_at?: string | null
          is_beta_tester?: boolean | null
          is_employee?: boolean | null
          is_traveler?: boolean | null
          linked_birthday?: string | null
          linked_id_number?: string | null
          name?: string | null
          nickname?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          customer_id?: string | null
          display_name?: string | null
          email?: string | null
          employee_id?: string | null
          id?: string
          identity_verified_at?: string | null
          is_beta_tester?: boolean | null
          is_employee?: boolean | null
          is_traveler?: boolean | null
          linked_birthday?: string | null
          linked_id_number?: string | null
          name?: string | null
          nickname?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          date: string
          id: string
          measurement_id: string | null
          notes: string | null
          photo_type: string
          photo_url: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          measurement_id?: string | null
          notes?: string | null
          photo_type: string
          photo_url: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          measurement_id?: string | null
          notes?: string | null
          photo_type?: string
          photo_url?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'progress_photos_measurement_id_fkey'
            columns: ['measurement_id']
            isOneToOne: false
            referencedRelation: 'body_measurements'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'progress_photos_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          collaborators: string[] | null
          created_at: string | null
          deadline: string | null
          id: number
          name: string
          notes: string | null
          owner: string | null
          progress: number | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          collaborators?: string[] | null
          created_at?: string | null
          deadline?: string | null
          id?: number
          name: string
          notes?: string | null
          owner?: string | null
          progress?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          collaborators?: string[] | null
          created_at?: string | null
          deadline?: string | null
          id?: number
          name?: string
          notes?: string | null
          owner?: string | null
          progress?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_confirmation_logs: {
        Row: {
          action: string
          confirmed_by_email: string | null
          confirmed_by_name: string | null
          confirmed_by_phone: string | null
          confirmed_by_staff_id: string | null
          confirmed_by_type: string | null
          confirmed_version: number | null
          created_at: string | null
          id: string
          ip_address: string | null
          notes: string | null
          quote_id: string
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          confirmed_by_email?: string | null
          confirmed_by_name?: string | null
          confirmed_by_phone?: string | null
          confirmed_by_staff_id?: string | null
          confirmed_by_type?: string | null
          confirmed_version?: number | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          quote_id: string
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          confirmed_by_email?: string | null
          confirmed_by_name?: string | null
          confirmed_by_phone?: string | null
          confirmed_by_staff_id?: string | null
          confirmed_by_type?: string | null
          confirmed_version?: number | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          quote_id?: string
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'quote_confirmation_logs_confirmed_by_staff_id_fkey'
            columns: ['confirmed_by_staff_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quote_confirmation_logs_quote_id_fkey'
            columns: ['quote_id']
            isOneToOne: false
            referencedRelation: 'quotes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quote_confirmation_logs_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      quotes: {
        Row: {
          accommodation_days: number | null
          adult_count: number | null
          airport_code: string | null
          balance_amount: number | null
          categories: Json | null
          child_count: number | null
          code: string | null
          confirmation_ip: string | null
          confirmation_notes: string | null
          confirmation_status: string | null
          confirmation_token: string | null
          confirmation_token_expires_at: string | null
          confirmation_user_agent: string | null
          confirmed_at: string | null
          confirmed_by_email: string | null
          confirmed_by_name: string | null
          confirmed_by_phone: string | null
          confirmed_by_staff_id: string | null
          confirmed_by_type: string | null
          confirmed_version: number | null
          contact_address: string | null
          contact_phone: string | null
          converted_to_tour: boolean | null
          country_id: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          current_version_index: number | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          days: number | null
          destination: string | null
          end_date: string | null
          expense_description: string | null
          group_size: number | null
          handler_name: string | null
          id: string
          infant_count: number | null
          is_active: boolean | null
          is_pinned: boolean | null
          issue_date: string | null
          itinerary_id: string | null
          name: string | null
          nights: number | null
          notes: string | null
          number_of_people: number | null
          other_city_ids: string[] | null
          participant_counts: Json | null
          proposal_package_id: string | null
          quick_quote_items: Json | null
          quote_type: string | null
          received_amount: number | null
          selling_prices: Json | null
          shared_with_workspaces: string[] | null
          start_date: string | null
          status: string
          tier_pricings: Json | null
          total_amount: number | null
          total_cost: number | null
          tour_code: string | null
          tour_id: string | null
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          version: number | null
          versions: Json | null
          workspace_id: string
        }
        Insert: {
          accommodation_days?: number | null
          adult_count?: number | null
          airport_code?: string | null
          balance_amount?: number | null
          categories?: Json | null
          child_count?: number | null
          code?: string | null
          confirmation_ip?: string | null
          confirmation_notes?: string | null
          confirmation_status?: string | null
          confirmation_token?: string | null
          confirmation_token_expires_at?: string | null
          confirmation_user_agent?: string | null
          confirmed_at?: string | null
          confirmed_by_email?: string | null
          confirmed_by_name?: string | null
          confirmed_by_phone?: string | null
          confirmed_by_staff_id?: string | null
          confirmed_by_type?: string | null
          confirmed_version?: number | null
          contact_address?: string | null
          contact_phone?: string | null
          converted_to_tour?: boolean | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          current_version_index?: number | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          days?: number | null
          destination?: string | null
          end_date?: string | null
          expense_description?: string | null
          group_size?: number | null
          handler_name?: string | null
          id: string
          infant_count?: number | null
          is_active?: boolean | null
          is_pinned?: boolean | null
          issue_date?: string | null
          itinerary_id?: string | null
          name?: string | null
          nights?: number | null
          notes?: string | null
          number_of_people?: number | null
          other_city_ids?: string[] | null
          participant_counts?: Json | null
          proposal_package_id?: string | null
          quick_quote_items?: Json | null
          quote_type?: string | null
          received_amount?: number | null
          selling_prices?: Json | null
          shared_with_workspaces?: string[] | null
          start_date?: string | null
          status?: string
          tier_pricings?: Json | null
          total_amount?: number | null
          total_cost?: number | null
          tour_code?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          version?: number | null
          versions?: Json | null
          workspace_id: string
        }
        Update: {
          accommodation_days?: number | null
          adult_count?: number | null
          airport_code?: string | null
          balance_amount?: number | null
          categories?: Json | null
          child_count?: number | null
          code?: string | null
          confirmation_ip?: string | null
          confirmation_notes?: string | null
          confirmation_status?: string | null
          confirmation_token?: string | null
          confirmation_token_expires_at?: string | null
          confirmation_user_agent?: string | null
          confirmed_at?: string | null
          confirmed_by_email?: string | null
          confirmed_by_name?: string | null
          confirmed_by_phone?: string | null
          confirmed_by_staff_id?: string | null
          confirmed_by_type?: string | null
          confirmed_version?: number | null
          contact_address?: string | null
          contact_phone?: string | null
          converted_to_tour?: boolean | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          current_version_index?: number | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          days?: number | null
          destination?: string | null
          end_date?: string | null
          expense_description?: string | null
          group_size?: number | null
          handler_name?: string | null
          id?: string
          infant_count?: number | null
          is_active?: boolean | null
          is_pinned?: boolean | null
          issue_date?: string | null
          itinerary_id?: string | null
          name?: string | null
          nights?: number | null
          notes?: string | null
          number_of_people?: number | null
          other_city_ids?: string[] | null
          participant_counts?: Json | null
          proposal_package_id?: string | null
          quick_quote_items?: Json | null
          quote_type?: string | null
          received_amount?: number | null
          selling_prices?: Json | null
          shared_with_workspaces?: string[] | null
          start_date?: string | null
          status?: string
          tier_pricings?: Json | null
          total_amount?: number | null
          total_cost?: number | null
          tour_code?: string | null
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          version?: number | null
          versions?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'quotes_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quotes_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quotes_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quotes_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quotes_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quotes_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number | null
          key: string
          reset_at: string
        }
        Insert: {
          count?: number | null
          key: string
          reset_at: string
        }
        Update: {
          count?: number | null
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          account_info: string | null
          account_last_digits: string | null
          accounting_subject_id: string | null
          actual_amount: number | null
          amount: number
          auth_code: string | null
          bank_name: string | null
          batch_id: string | null
          card_last_four: string | null
          check_bank: string | null
          check_date: string | null
          check_number: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          deleted_at: string | null
          email: string | null
          fees: number | null
          handler_name: string | null
          id: string
          link: string | null
          linkpay_order_number: string | null
          notes: string | null
          order_id: string | null
          order_number: string | null
          pay_dateline: string | null
          payment_date: string
          payment_method: string
          payment_method_id: string
          payment_name: string | null
          receipt_account: string | null
          receipt_amount: number
          receipt_date: string | null
          receipt_number: string
          receipt_type: number
          status: string
          sync_status: string | null
          total_amount: number | null
          tour_id: string | null
          tour_name: string | null
          transaction_id: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          account_info?: string | null
          account_last_digits?: string | null
          accounting_subject_id?: string | null
          actual_amount?: number | null
          amount: number
          auth_code?: string | null
          bank_name?: string | null
          batch_id?: string | null
          card_last_four?: string | null
          check_bank?: string | null
          check_date?: string | null
          check_number?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          email?: string | null
          fees?: number | null
          handler_name?: string | null
          id?: string
          link?: string | null
          linkpay_order_number?: string | null
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          pay_dateline?: string | null
          payment_date: string
          payment_method: string
          payment_method_id: string
          payment_name?: string | null
          receipt_account?: string | null
          receipt_amount: number
          receipt_date?: string | null
          receipt_number: string
          receipt_type?: number
          status?: string
          sync_status?: string | null
          total_amount?: number | null
          tour_id?: string | null
          tour_name?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          account_info?: string | null
          account_last_digits?: string | null
          accounting_subject_id?: string | null
          actual_amount?: number | null
          amount?: number
          auth_code?: string | null
          bank_name?: string | null
          batch_id?: string | null
          card_last_four?: string | null
          check_bank?: string | null
          check_date?: string | null
          check_number?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          email?: string | null
          fees?: number | null
          handler_name?: string | null
          id?: string
          link?: string | null
          linkpay_order_number?: string | null
          notes?: string | null
          order_id?: string | null
          order_number?: string | null
          pay_dateline?: string | null
          payment_date?: string
          payment_method?: string
          payment_method_id?: string
          payment_name?: string | null
          receipt_account?: string | null
          receipt_amount?: number
          receipt_date?: string | null
          receipt_number?: string
          receipt_type?: number
          status?: string
          sync_status?: string | null
          total_amount?: number | null
          tour_id?: string | null
          tour_name?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fk_receipts_payment_method'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_accounting_subject_id_fkey'
            columns: ['accounting_subject_id']
            isOneToOne: false
            referencedRelation: 'accounting_subjects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'receipts_payment_method_id_fkey'
            columns: ['payment_method_id']
            isOneToOne: false
            referencedRelation: 'payment_methods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      ref_airlines: {
        Row: {
          alliance: string | null
          country: string | null
          created_at: string | null
          english_name: string | null
          iata_code: string
          icao_code: string | null
          is_active: boolean | null
          name_zh: string | null
        }
        Insert: {
          alliance?: string | null
          country?: string | null
          created_at?: string | null
          english_name?: string | null
          iata_code: string
          icao_code?: string | null
          is_active?: boolean | null
          name_zh?: string | null
        }
        Update: {
          alliance?: string | null
          country?: string | null
          created_at?: string | null
          english_name?: string | null
          iata_code?: string
          icao_code?: string | null
          is_active?: boolean | null
          name_zh?: string | null
        }
        Relationships: []
      }
      ref_airports: {
        Row: {
          city_code: string | null
          city_name_en: string | null
          city_name_zh: string | null
          country_code: string | null
          created_at: string | null
          english_name: string | null
          iata_code: string
          icao_code: string | null
          is_favorite: boolean | null
          latitude: number | null
          longitude: number | null
          name_zh: string | null
          timezone: string | null
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          city_code?: string | null
          city_name_en?: string | null
          city_name_zh?: string | null
          country_code?: string | null
          created_at?: string | null
          english_name?: string | null
          iata_code: string
          icao_code?: string | null
          is_favorite?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name_zh?: string | null
          timezone?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          city_code?: string | null
          city_name_en?: string | null
          city_name_zh?: string | null
          country_code?: string | null
          created_at?: string | null
          english_name?: string | null
          iata_code?: string
          icao_code?: string | null
          is_favorite?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name_zh?: string | null
          timezone?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ref_airports_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      ref_countries: {
        Row: {
          code: string
          name_zh: string
          name_en: string
          continent: string | null
          sub_region: string | null
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          code: string
          name_zh: string
          name_en: string
          continent?: string | null
          sub_region?: string | null
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          code?: string
          name_zh?: string
          name_en?: string
          continent?: string | null
          sub_region?: string | null
          is_active?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      ref_airports_backup: {
        Row: {
          city_code: string | null
          city_name_en: string | null
          city_name_zh: string | null
          country_code: string | null
          created_at: string | null
          english_name: string | null
          iata_code: string | null
          icao_code: string | null
          is_favorite: boolean | null
          latitude: number | null
          longitude: number | null
          name_zh: string | null
          timezone: string | null
          usage_count: number | null
          workspace_id: string | null
        }
        Insert: {
          city_code?: string | null
          city_name_en?: string | null
          city_name_zh?: string | null
          country_code?: string | null
          created_at?: string | null
          english_name?: string | null
          iata_code?: string | null
          icao_code?: string | null
          is_favorite?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name_zh?: string | null
          timezone?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Update: {
          city_code?: string | null
          city_name_en?: string | null
          city_name_zh?: string | null
          country_code?: string | null
          created_at?: string | null
          english_name?: string | null
          iata_code?: string | null
          icao_code?: string | null
          is_favorite?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name_zh?: string | null
          timezone?: string | null
          usage_count?: number | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      ref_booking_classes: {
        Row: {
          cabin_type: string | null
          code: string
          created_at: string | null
          description: string | null
          priority: number | null
        }
        Insert: {
          cabin_type?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          priority?: number | null
        }
        Update: {
          cabin_type?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          priority?: number | null
        }
        Relationships: []
      }
      ref_ssr_codes: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description_en: string | null
          description_zh: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description_en?: string | null
          description_zh?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description_en?: string | null
          description_zh?: string | null
        }
        Relationships: []
      }
      ref_status_codes: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description_en: string | null
          description_zh: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description_en?: string | null
          description_zh?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description_en?: string | null
          description_zh?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          account_info: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          disbursement_order_id: string | null
          handler_name: string | null
          id: string
          linkpay_order_number: string | null
          linkpay_response: string | null
          order_id: string | null
          original_receipt_id: string | null
          refund_amount: number
          refund_date: string
          refund_number: string
          refund_reason: string | null
          refund_type: number
          status: number
          tour_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          account_info?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          disbursement_order_id?: string | null
          handler_name?: string | null
          id?: string
          linkpay_order_number?: string | null
          linkpay_response?: string | null
          order_id?: string | null
          original_receipt_id?: string | null
          refund_amount: number
          refund_date: string
          refund_number: string
          refund_reason?: string | null
          refund_type: number
          status?: number
          tour_id?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          account_info?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          disbursement_order_id?: string | null
          handler_name?: string | null
          id?: string
          linkpay_order_number?: string | null
          linkpay_response?: string | null
          order_id?: string | null
          original_receipt_id?: string | null
          refund_amount?: number
          refund_date?: string
          refund_number?: string
          refund_reason?: string | null
          refund_type?: number
          status?: number
          tour_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'refunds_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'refunds_disbursement_order_id_fkey'
            columns: ['disbursement_order_id']
            isOneToOne: false
            referencedRelation: 'disbursement_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'refunds_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'refunds_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'refunds_original_receipt_id_fkey'
            columns: ['original_receipt_id']
            isOneToOne: false
            referencedRelation: 'receipts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'refunds_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'refunds_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'refunds_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      region_stats: {
        Row: {
          attractions_count: number | null
          city_id: string
          cost_templates_count: number | null
          quotes_count: number | null
          tours_count: number | null
          updated_at: string | null
        }
        Insert: {
          attractions_count?: number | null
          city_id: string
          cost_templates_count?: number | null
          quotes_count?: number | null
          tours_count?: number | null
          updated_at?: string | null
        }
        Update: {
          attractions_count?: number | null
          city_id?: string
          cost_templates_count?: number | null
          quotes_count?: number | null
          tours_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'region_stats_city_id_fkey'
            columns: ['city_id']
            isOneToOne: true
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
        ]
      }
      regions: {
        Row: {
          country_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          country_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'regions_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'regions_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      request_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          note: string | null
          parent_document_id: string | null
          received_at: string | null
          received_from: string | null
          reply_type: string | null
          request_id: string
          sent_at: string | null
          sent_to: string | null
          sent_via: string | null
          status: string
          title: string | null
          updated_at: string | null
          version: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          note?: string | null
          parent_document_id?: string | null
          received_at?: string | null
          received_from?: string | null
          reply_type?: string | null
          request_id: string
          sent_at?: string | null
          sent_to?: string | null
          sent_via?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
          version: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          note?: string | null
          parent_document_id?: string | null
          received_at?: string | null
          received_from?: string | null
          reply_type?: string | null
          request_id?: string
          sent_at?: string | null
          sent_to?: string | null
          sent_via?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
          version?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'request_documents_parent_document_id_fkey'
            columns: ['parent_document_id']
            isOneToOne: false
            referencedRelation: 'request_documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'request_documents_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'tour_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'request_documents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      request_response_items: {
        Row: {
          available_end_date: string | null
          available_start_date: string | null
          created_at: string | null
          created_by: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          license_plate: string | null
          notes: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          response_id: string
          unit_price: number | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          available_end_date?: string | null
          available_start_date?: string | null
          created_at?: string | null
          created_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          license_plate?: string | null
          notes?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          response_id: string
          unit_price?: number | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          available_end_date?: string | null
          available_start_date?: string | null
          created_at?: string | null
          created_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          license_plate?: string | null
          notes?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          response_id?: string
          unit_price?: number | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'request_response_items_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'request_response_items_response_id_fkey'
            columns: ['response_id']
            isOneToOne: false
            referencedRelation: 'request_responses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'request_response_items_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'request_response_items_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      request_responses: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          request_id: string
          responder_workspace_id: string
          response_date: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          request_id: string
          responder_workspace_id: string
          response_date?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          request_id?: string
          responder_workspace_id?: string
          response_date?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'request_responses_responder_workspace_id_fkey'
            columns: ['responder_workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          address_en: string | null
          avg_price_dinner: number | null
          avg_price_lunch: number | null
          booking_contact: string | null
          booking_email: string | null
          booking_notes: string | null
          booking_phone: string | null
          category: string | null
          city_id: string
          commission_rate: number | null
          country_id: string
          created_at: string | null
          created_by: string | null
          cuisine_type: string[] | null
          currency: string | null
          data_verified: boolean | null
          description: string | null
          description_en: string | null
          dietary_options: string[] | null
          display_order: number | null
          english_name: string | null
          facilities: Json | null
          fax: string | null
          google_maps_url: string | null
          group_friendly: boolean | null
          group_menu_available: boolean | null
          group_menu_options: Json | null
          group_menu_price: number | null
          highlights: string[] | null
          id: string
          images: string[] | null
          internal_notes: string | null
          is_active: boolean | null
          is_featured: boolean | null
          latitude: number | null
          longitude: number | null
          max_group_size: number | null
          meal_type: string[] | null
          menu_images: string[] | null
          min_group_size: number | null
          name: string
          name_local: string | null
          notes: string | null
          opening_hours: Json | null
          phone: string | null
          price_range: string | null
          private_room: boolean | null
          private_room_capacity: number | null
          rating: number | null
          region_id: string | null
          reservation_required: boolean | null
          reservation_url: string | null
          review_count: number | null
          specialties: string[] | null
          thumbnail: string | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          address_en?: string | null
          avg_price_dinner?: number | null
          avg_price_lunch?: number | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_notes?: string | null
          booking_phone?: string | null
          category?: string | null
          city_id: string
          commission_rate?: number | null
          country_id: string
          created_at?: string | null
          created_by?: string | null
          cuisine_type?: string[] | null
          currency?: string | null
          data_verified?: boolean | null
          description?: string | null
          description_en?: string | null
          dietary_options?: string[] | null
          display_order?: number | null
          english_name?: string | null
          facilities?: Json | null
          fax?: string | null
          google_maps_url?: string | null
          group_friendly?: boolean | null
          group_menu_available?: boolean | null
          group_menu_options?: Json | null
          group_menu_price?: number | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_group_size?: number | null
          meal_type?: string[] | null
          menu_images?: string[] | null
          min_group_size?: number | null
          name: string
          name_local?: string | null
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          price_range?: string | null
          private_room?: boolean | null
          private_room_capacity?: number | null
          rating?: number | null
          region_id?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          review_count?: number | null
          specialties?: string[] | null
          thumbnail?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          address_en?: string | null
          avg_price_dinner?: number | null
          avg_price_lunch?: number | null
          booking_contact?: string | null
          booking_email?: string | null
          booking_notes?: string | null
          booking_phone?: string | null
          category?: string | null
          city_id?: string
          commission_rate?: number | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          cuisine_type?: string[] | null
          currency?: string | null
          data_verified?: boolean | null
          description?: string | null
          description_en?: string | null
          dietary_options?: string[] | null
          display_order?: number | null
          english_name?: string | null
          facilities?: Json | null
          fax?: string | null
          google_maps_url?: string | null
          group_friendly?: boolean | null
          group_menu_available?: boolean | null
          group_menu_options?: Json | null
          group_menu_price?: number | null
          highlights?: string[] | null
          id?: string
          images?: string[] | null
          internal_notes?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_group_size?: number | null
          meal_type?: string[] | null
          menu_images?: string[] | null
          min_group_size?: number | null
          name?: string
          name_local?: string | null
          notes?: string | null
          opening_hours?: Json | null
          phone?: string | null
          price_range?: string | null
          private_room?: boolean | null
          private_room_capacity?: number | null
          rating?: number | null
          region_id?: string | null
          reservation_required?: boolean | null
          reservation_url?: string | null
          review_count?: number | null
          specialties?: string[] | null
          thumbnail?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'restaurants_city_id_fkey'
            columns: ['city_id']
            isOneToOne: false
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'restaurants_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'restaurants_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'restaurants_region_id_fkey'
            columns: ['region_id']
            isOneToOne: false
            referencedRelation: 'regions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'restaurants_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      rich_documents: {
        Row: {
          canvas_id: string
          content: string
          created_at: string | null
          created_by: string | null
          format_data: Json | null
          id: string
          is_favorite: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          canvas_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          format_data?: Json | null
          id?: string
          is_favorite?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          canvas_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          format_data?: Json | null
          id?: string
          is_favorite?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'rich_documents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rich_documents_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rich_documents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      role_tab_permissions: {
        Row: {
          can_read: boolean | null
          can_write: boolean | null
          created_at: string | null
          id: string
          module_code: string
          role_id: string
          tab_code: string | null
          updated_at: string | null
        }
        Insert: {
          can_read?: boolean | null
          can_write?: boolean | null
          created_at?: string | null
          id?: string
          module_code: string
          role_id: string
          tab_code?: string | null
          updated_at?: string | null
        }
        Update: {
          can_read?: boolean | null
          can_write?: boolean | null
          created_at?: string | null
          id?: string
          module_code?: string
          role_id?: string
          tab_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'role_tab_permissions_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'workspace_roles'
            referencedColumns: ['id']
          },
        ]
      }
      selector_field_roles: {
        Row: {
          field_id: string
          role_id: string
        }
        Insert: {
          field_id: string
          role_id: string
        }
        Update: {
          field_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'selector_field_roles_field_id_fkey'
            columns: ['field_id']
            isOneToOne: false
            referencedRelation: 'workspace_selector_fields'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'selector_field_roles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'workspace_roles'
            referencedColumns: ['id']
          },
        ]
      }
      shared_order_lists: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          author_id: string
          channel_id: string
          created_at: string | null
          created_by: string
          id: string
          order_ids: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          author_id?: string
          channel_id: string
          created_at?: string | null
          created_by: string
          id?: string
          order_ids?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          author_id?: string
          channel_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          order_ids?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'shared_order_lists_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shared_order_lists_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      social_group_members: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          group_id: string
          id: string
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          group_id: string
          id?: string
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          group_id?: string
          id?: string
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'social_group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'social_groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'social_group_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      social_group_tags: {
        Row: {
          group_id: string
          id: string
          tag: string
        }
        Insert: {
          group_id: string
          id?: string
          tag: string
        }
        Update: {
          group_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: 'social_group_tags_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'social_groups'
            referencedColumns: ['id']
          },
        ]
      }
      social_groups: {
        Row: {
          category: string | null
          cover_image: string | null
          created_at: string | null
          created_by: string
          current_members: number | null
          description: string | null
          end_time: string | null
          estimated_cost: number | null
          event_date: string | null
          gender_limit: string | null
          id: string
          is_private: boolean | null
          latitude: number | null
          location_address: string | null
          location_name: string | null
          longitude: number | null
          max_members: number | null
          require_approval: boolean | null
          start_time: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          created_by: string
          current_members?: number | null
          description?: string | null
          end_time?: string | null
          estimated_cost?: number | null
          event_date?: string | null
          gender_limit?: string | null
          id?: string
          is_private?: boolean | null
          latitude?: number | null
          location_address?: string | null
          location_name?: string | null
          longitude?: number | null
          max_members?: number | null
          require_approval?: boolean | null
          start_time?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          created_by?: string
          current_members?: number | null
          description?: string | null
          end_time?: string | null
          estimated_cost?: number | null
          event_date?: string | null
          gender_limit?: string | null
          id?: string
          is_private?: boolean | null
          latitude?: number | null
          location_address?: string | null
          location_name?: string | null
          longitude?: number | null
          max_members?: number | null
          require_approval?: boolean | null
          start_time?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'social_groups_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      supplier_categories: {
        Row: {
          color: string | null
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_employees: {
        Row: {
          app_user_id: string | null
          code: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          line_id: string | null
          name: string
          phone: string | null
          role: string | null
          supplier_id: string
          updated_at: string | null
          vehicle_capacity: number | null
          vehicle_plate: string | null
          vehicle_type: string | null
          workspace_id: string
        }
        Insert: {
          app_user_id?: string | null
          code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          line_id?: string | null
          name: string
          phone?: string | null
          role?: string | null
          supplier_id: string
          updated_at?: string | null
          vehicle_capacity?: number | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          workspace_id: string
        }
        Update: {
          app_user_id?: string | null
          code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          line_id?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          supplier_id?: string
          updated_at?: string | null
          vehicle_capacity?: number | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      supplier_payment_accounts: {
        Row: {
          account_holder: string
          account_name: string
          account_number: string
          account_type: string | null
          bank_branch: string | null
          bank_code: string | null
          bank_name: string
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          note: string | null
          supplier_id: string
          swift_code: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_holder: string
          account_name: string
          account_number: string
          account_type?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          bank_name: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          note?: string | null
          supplier_id: string
          swift_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_holder?: string
          account_name?: string
          account_number?: string
          account_type?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          bank_name?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          note?: string | null
          supplier_id?: string
          swift_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'supplier_payment_accounts_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      supplier_price_list: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          item_name: string
          note: string | null
          seasonality: string | null
          supplier_id: string
          unit: string
          unit_price: number
          updated_at: string
          updated_by: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_name: string
          note?: string | null
          seasonality?: string | null
          supplier_id: string
          unit: string
          unit_price: number
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_name?: string
          note?: string | null
          seasonality?: string | null
          supplier_id?: string
          unit?: string
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'supplier_price_list_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      supplier_request_responses: {
        Row: {
          attachments: Json | null
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          quoted_price: number | null
          request_id: string
          responded_by: string | null
          response_type: string
          supplier_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          quoted_price?: number | null
          request_id: string
          responded_by?: string | null
          response_type: string
          supplier_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          quoted_price?: number | null
          request_id?: string
          responded_by?: string | null
          response_type?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supplier_request_responses_responded_by_fkey'
            columns: ['responded_by']
            isOneToOne: false
            referencedRelation: 'supplier_users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplier_request_responses_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      supplier_service_areas: {
        Row: {
          city_id: string
          created_at: string
          created_by: string | null
          id: string
          supplier_id: string
          updated_by: string | null
        }
        Insert: {
          city_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          supplier_id: string
          updated_by?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          supplier_id?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'supplier_cities_city_id_fkey'
            columns: ['city_id']
            isOneToOne: false
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplier_cities_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'supplier_service_areas_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      supplier_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          name: string
          phone: string | null
          role: string | null
          supplier_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          name: string
          phone?: string | null
          role?: string | null
          supplier_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          supplier_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'supplier_users_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      suppliers: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          address: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_branch: string | null
          bank_code_legacy: string | null
          bank_name: string | null
          category_id: string | null
          code: string
          contact: Json | null
          contact_person: string | null
          country: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          display_order: number | null
          email: string | null
          english_name: string | null
          fax: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number | null
          region: string | null
          status: string
          tax_id: string | null
          total_orders: number | null
          total_spent: number | null
          type: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_code_legacy?: string | null
          bank_name?: string | null
          category_id?: string | null
          code: string
          contact?: Json | null
          contact_person?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          display_order?: number | null
          email?: string | null
          english_name?: string | null
          fax?: string | null
          id: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          region?: string | null
          status?: string
          tax_id?: string | null
          total_orders?: number | null
          total_spent?: number | null
          type?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_code_legacy?: string | null
          bank_name?: string | null
          category_id?: string | null
          code?: string
          contact?: Json | null
          contact_person?: string | null
          country?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          display_order?: number | null
          email?: string | null
          english_name?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          region?: string | null
          status?: string
          tax_id?: string | null
          total_orders?: number | null
          total_spent?: number | null
          type?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'suppliers_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'supplier_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'suppliers_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'suppliers_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      syncqueue: {
        Row: {
          created_at: string | null
          data: Json
          error_message: string | null
          id: string
          operation: string
          retry_count: number | null
          status: string | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          error_message?: string | null
          id?: string
          operation: string
          retry_count?: number | null
          status?: string | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          error_message?: string | null
          id?: string
          operation?: string
          retry_count?: number | null
          status?: string | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          settings: Json
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          settings?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          settings?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'system_settings_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          created_at: string | null
          due_date: string | null
          id: number
          name: string
          notes: string | null
          progress: number | null
          project_id: number | null
          status: string | null
          task_type: string
          updated_at: string | null
          workflow_template: string | null
        }
        Insert: {
          assignee?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: number
          name: string
          notes?: string | null
          progress?: number | null
          project_id?: number | null
          status?: string | null
          task_type?: string
          updated_at?: string | null
          workflow_template?: string | null
        }
        Update: {
          assignee?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: number
          name?: string
          notes?: string | null
          progress?: number | null
          project_id?: number | null
          status?: string | null
          task_type?: string
          updated_at?: string | null
          workflow_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      templates: {
        Row: {
          category: string
          content: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          preview: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          assignee: string | null
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          enabled_quick_actions: string[] | null
          id: string
          is_public: boolean | null
          needs_creator_notification: boolean | null
          notes: Json | null
          priority: number
          related_items: Json | null
          status: string
          sub_tasks: Json | null
          task_type: string | null
          title: string
          tour_id: string | null
          tour_request_id: string | null
          updated_at: string | null
          updated_by: string | null
          visibility: string[] | null
          workspace_id: string
        }
        Insert: {
          assignee?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          enabled_quick_actions?: string[] | null
          id?: string
          is_public?: boolean | null
          needs_creator_notification?: boolean | null
          notes?: Json | null
          priority?: number
          related_items?: Json | null
          status?: string
          sub_tasks?: Json | null
          task_type?: string | null
          title: string
          tour_id?: string | null
          tour_request_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string[] | null
          workspace_id: string
        }
        Update: {
          assignee?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          enabled_quick_actions?: string[] | null
          id?: string
          is_public?: boolean | null
          needs_creator_notification?: boolean | null
          notes?: Json | null
          priority?: number
          related_items?: Json | null
          status?: string
          sub_tasks?: Json | null
          task_type?: string | null
          title?: string
          tour_id?: string | null
          tour_request_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'todos_assignee_fkey'
            columns: ['assignee']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'todos_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_addons: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          price: number | null
          quantity: number | null
          tour_id: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id: string
          name: string
          price?: number | null
          quantity?: number | null
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number | null
          quantity?: number | null
          tour_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_addons_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_addons_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_addons_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_addons_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_addons_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_bonus_settings: {
        Row: {
          bonus: number
          bonus_type: number
          created_at: string | null
          employee_id: string | null
          id: string
          tour_id: string
          type: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          bonus?: number
          bonus_type?: number
          created_at?: string | null
          employee_id?: string | null
          id?: string
          tour_id: string
          type: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          bonus?: number
          bonus_type?: number
          created_at?: string | null
          employee_id?: string | null
          id?: string
          tour_id?: string
          type?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_bonus_settings_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_bonus_settings_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_bonus_settings_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_bonus_settings_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_confirmation_items: {
        Row: {
          actual_cost: number | null
          booking_reference: string | null
          booking_status: string | null
          category: string
          contact_info: Json | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          day_label: string | null
          description: string | null
          expected_cost: number | null
          google_maps_url: string | null
          id: string
          itinerary_item_id: string | null
          latitude: number | null
          leader_expense: number | null
          leader_expense_at: string | null
          leader_expense_note: string | null
          longitude: number | null
          notes: string | null
          quantity: number | null
          receipt_images: string[] | null
          request_id: string | null
          resource_id: string | null
          resource_type: string | null
          service_date: string
          service_date_end: string | null
          sheet_id: string
          sort_order: number | null
          subtotal: number | null
          supplier_id: string | null
          supplier_name: string
          title: string
          type_data: Json | null
          unit_price: number | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          booking_reference?: string | null
          booking_status?: string | null
          category: string
          contact_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          day_label?: string | null
          description?: string | null
          expected_cost?: number | null
          google_maps_url?: string | null
          id?: string
          itinerary_item_id?: string | null
          latitude?: number | null
          leader_expense?: number | null
          leader_expense_at?: string | null
          leader_expense_note?: string | null
          longitude?: number | null
          notes?: string | null
          quantity?: number | null
          receipt_images?: string[] | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          service_date: string
          service_date_end?: string | null
          sheet_id: string
          sort_order?: number | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name: string
          title: string
          type_data?: Json | null
          unit_price?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          booking_reference?: string | null
          booking_status?: string | null
          category?: string
          contact_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          day_label?: string | null
          description?: string | null
          expected_cost?: number | null
          google_maps_url?: string | null
          id?: string
          itinerary_item_id?: string | null
          latitude?: number | null
          leader_expense?: number | null
          leader_expense_at?: string | null
          leader_expense_note?: string | null
          longitude?: number | null
          notes?: string | null
          quantity?: number | null
          receipt_images?: string[] | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          service_date?: string
          service_date_end?: string | null
          sheet_id?: string
          sort_order?: number | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_name?: string
          title?: string
          type_data?: Json | null
          unit_price?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_confirmation_items_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_confirmation_items_itinerary_item_id_fkey'
            columns: ['itinerary_item_id']
            isOneToOne: false
            referencedRelation: 'tour_itinerary_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_confirmation_items_sheet_id_fkey'
            columns: ['sheet_id']
            isOneToOne: false
            referencedRelation: 'tour_confirmation_sheets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_confirmation_items_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_confirmation_items_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_confirmation_sheets: {
        Row: {
          assistant: string | null
          created_at: string | null
          created_by: string | null
          departure_date: string | null
          exchange_rate: number | null
          flight_info: string | null
          foreign_currency: string | null
          id: string
          itinerary_id: string | null
          itinerary_version: number | null
          notes: string | null
          pax: number | null
          petty_cash: number | null
          return_date: string | null
          sales_person: string | null
          status: string
          total_actual_cost: number | null
          total_expected_cost: number | null
          tour_code: string
          tour_id: string
          tour_leader_id: string | null
          tour_leader_name: string | null
          tour_name: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          assistant?: string | null
          created_at?: string | null
          created_by?: string | null
          departure_date?: string | null
          exchange_rate?: number | null
          flight_info?: string | null
          foreign_currency?: string | null
          id?: string
          itinerary_id?: string | null
          itinerary_version?: number | null
          notes?: string | null
          pax?: number | null
          petty_cash?: number | null
          return_date?: string | null
          sales_person?: string | null
          status?: string
          total_actual_cost?: number | null
          total_expected_cost?: number | null
          tour_code: string
          tour_id: string
          tour_leader_id?: string | null
          tour_leader_name?: string | null
          tour_name: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          assistant?: string | null
          created_at?: string | null
          created_by?: string | null
          departure_date?: string | null
          exchange_rate?: number | null
          flight_info?: string | null
          foreign_currency?: string | null
          id?: string
          itinerary_id?: string | null
          itinerary_version?: number | null
          notes?: string | null
          pax?: number | null
          petty_cash?: number | null
          return_date?: string | null
          sales_person?: string | null
          status?: string
          total_actual_cost?: number | null
          total_expected_cost?: number | null
          tour_code?: string
          tour_id?: string
          tour_leader_id?: string | null
          tour_leader_name?: string | null
          tour_name?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_confirmation_sheets_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_confirmation_sheets_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_confirmation_sheets_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_control_forms: {
        Row: {
          created_at: string | null
          created_by: string | null
          form_data: Json
          id: string
          package_id: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          form_data?: Json
          id?: string
          package_id: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          form_data?: Json
          id?: string
          package_id?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_control_forms_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_custom_cost_fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_name: string
          id: string
          tour_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_name: string
          id?: string
          tour_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_name?: string
          id?: string
          tour_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_custom_cost_fields_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_custom_cost_fields_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
      tour_custom_cost_values: {
        Row: {
          created_at: string | null
          field_id: string
          id: string
          member_id: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          field_id: string
          id?: string
          member_id: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string
          id?: string
          member_id?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_custom_cost_values_field_id_fkey'
            columns: ['field_id']
            isOneToOne: false
            referencedRelation: 'tour_custom_cost_fields'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_custom_cost_values_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['order_member_id']
          },
          {
            foreignKeyName: 'tour_custom_cost_values_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'order_members'
            referencedColumns: ['id']
          },
        ]
      }
      tour_departure_data: {
        Row: {
          bus_info: Json | null
          created_at: string | null
          created_by: string | null
          emergency_contact: Json | null
          flight_info: Json | null
          guide_info: Json | null
          hotel_info: Json | null
          id: string
          notes: string | null
          tour_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bus_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          emergency_contact?: Json | null
          flight_info?: Json | null
          guide_info?: Json | null
          hotel_info?: Json | null
          id?: string
          notes?: string | null
          tour_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bus_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          emergency_contact?: Json | null
          flight_info?: Json | null
          guide_info?: Json | null
          hotel_info?: Json | null
          id?: string
          notes?: string | null
          tour_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_departure_data_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: true
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_departure_data_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: true
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
      tour_destinations: {
        Row: {
          airport_code: string
          city: string
          country: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          airport_code: string
          city: string
          country: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          airport_code?: string
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tour_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          public_url: string
          tour_id: string
          updated_at: string | null
          updated_by: string | null
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          public_url: string
          tour_id: string
          updated_at?: string | null
          updated_by?: string | null
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          public_url?: string
          tour_id?: string
          updated_at?: string | null
          updated_by?: string | null
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_documents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_documents_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_documents_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_documents_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_documents_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_expenses: {
        Row: {
          actual_amount: number
          created_at: string | null
          expense_id: number
          itinerary_id: string
          leader_id: string
          notes: string | null
        }
        Insert: {
          actual_amount: number
          created_at?: string | null
          expense_id?: number
          itinerary_id: string
          leader_id: string
          notes?: string | null
        }
        Update: {
          actual_amount?: number
          created_at?: string | null
          expense_id?: number
          itinerary_id?: string
          leader_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'Tour_Expenses_itinerary_id_fkey'
            columns: ['itinerary_id']
            isOneToOne: false
            referencedRelation: 'itineraries'
            referencedColumns: ['id']
          },
        ]
      }
      tour_files: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          note: string | null
          related_item_id: string | null
          related_request_id: string | null
          tags: string[] | null
          title: string | null
          tour_id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          note?: string | null
          related_item_id?: string | null
          related_request_id?: string | null
          tags?: string[] | null
          title?: string | null
          tour_id: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          note?: string | null
          related_item_id?: string | null
          related_request_id?: string | null
          tags?: string[] | null
          title?: string | null
          tour_id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_files_related_request_id_fkey'
            columns: ['related_request_id']
            isOneToOne: false
            referencedRelation: 'tour_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_files_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_files_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_files_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_folder_templates: {
        Row: {
          created_at: string
          default_category: Database['public']['Enums']['file_category'] | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          default_category?: Database['public']['Enums']['file_category'] | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          default_category?: Database['public']['Enums']['file_category'] | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_folder_templates_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_itinerary_days: {
        Row: {
          id: string
          tour_id: string | null
          itinerary_id: string | null
          workspace_id: string | null
          day_number: number | null
          title: string | null
          route: string | null
          note: string | null
          blocks: Json | null
          is_same_accommodation: boolean | null
          breakfast_preset: string | null
          lunch_preset: string | null
          dinner_preset: string | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          tour_id?: string | null
          itinerary_id?: string | null
          workspace_id?: string | null
          day_number?: number | null
          title?: string | null
          route?: string | null
          note?: string | null
          blocks?: Json | null
          is_same_accommodation?: boolean | null
          breakfast_preset?: string | null
          lunch_preset?: string | null
          dinner_preset?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          tour_id?: string | null
          itinerary_id?: string | null
          workspace_id?: string | null
          day_number?: number | null
          title?: string | null
          route?: string | null
          note?: string | null
          blocks?: Json | null
          is_same_accommodation?: boolean | null
          breakfast_preset?: string | null
          lunch_preset?: string | null
          dinner_preset?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      tour_itinerary_items: {
        Row: {
          actual_expense: number | null
          adult_price: number | null
          assigned_at: string | null
          assigned_by: string | null
          assignee_id: string | null
          booking_confirmed_at: string | null
          booking_reference: string | null
          booking_status: string | null
          category: string | null
          child_price: number | null
          confirmation_date: string | null
          confirmation_item_id: string | null
          confirmation_note: string | null
          confirmation_status: string | null
          confirmed_cost: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          day_number: number | null
          description: string | null
          driver_name: string | null
          driver_phone: string | null
          estimated_cost: number | null
          expense_at: string | null
          expense_note: string | null
          google_maps_url: string | null
          handled_by: string | null
          id: string
          infant_price: number | null
          is_reserved: boolean | null
          itinerary_id: string | null
          latitude: number | null
          leader_status: string | null
          longitude: number | null
          override_at: string | null
          override_by: string | null
          override_description: string | null
          override_title: string | null
          pricing_type: string | null
          quantity: number | null
          quote_item_id: string | null
          quote_note: string | null
          quote_status: string | null
          quoted_cost: number | null
          receipt_images: string[] | null
          reply_content: Json | null
          reply_cost: number | null
          request_id: string | null
          request_reply_at: string | null
          request_sent_at: string | null
          request_status: string | null
          reserved_at: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          room_details: Json | null
          service_date: string | null
          service_date_end: string | null
          show_on_brochure: boolean
          show_on_quote: boolean | null
          show_on_web: boolean
          sort_order: number | null
          sub_category: string | null
          supplier_id: string | null
          supplier_name: string | null
          title: string | null
          total_cost: number | null
          tour_id: string | null
          unit_price: number | null
          updated_at: string | null
          updated_by: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
          workspace_id: string
        }
        Insert: {
          actual_expense?: number | null
          adult_price?: number | null
          assigned_at?: string | null
          assigned_by?: string | null
          assignee_id?: string | null
          booking_confirmed_at?: string | null
          booking_reference?: string | null
          booking_status?: string | null
          category?: string | null
          child_price?: number | null
          confirmation_date?: string | null
          confirmation_item_id?: string | null
          confirmation_note?: string | null
          confirmation_status?: string | null
          confirmed_cost?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          day_number?: number | null
          description?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_cost?: number | null
          expense_at?: string | null
          expense_note?: string | null
          google_maps_url?: string | null
          handled_by?: string | null
          id?: string
          infant_price?: number | null
          is_reserved?: boolean | null
          itinerary_id?: string | null
          latitude?: number | null
          leader_status?: string | null
          longitude?: number | null
          override_at?: string | null
          override_by?: string | null
          override_description?: string | null
          override_title?: string | null
          pricing_type?: string | null
          quantity?: number | null
          quote_item_id?: string | null
          quote_note?: string | null
          quote_status?: string | null
          quoted_cost?: number | null
          receipt_images?: string[] | null
          reply_content?: Json | null
          reply_cost?: number | null
          request_id?: string | null
          request_reply_at?: string | null
          request_sent_at?: string | null
          request_status?: string | null
          reserved_at?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          room_details?: Json | null
          service_date?: string | null
          service_date_end?: string | null
          show_on_brochure?: boolean
          show_on_quote?: boolean | null
          show_on_web?: boolean
          sort_order?: number | null
          sub_category?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          title?: string | null
          total_cost?: number | null
          tour_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          workspace_id: string
        }
        Update: {
          actual_expense?: number | null
          adult_price?: number | null
          assigned_at?: string | null
          assigned_by?: string | null
          assignee_id?: string | null
          booking_confirmed_at?: string | null
          booking_reference?: string | null
          booking_status?: string | null
          category?: string | null
          child_price?: number | null
          confirmation_date?: string | null
          confirmation_item_id?: string | null
          confirmation_note?: string | null
          confirmation_status?: string | null
          confirmed_cost?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          day_number?: number | null
          description?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_cost?: number | null
          expense_at?: string | null
          expense_note?: string | null
          google_maps_url?: string | null
          handled_by?: string | null
          id?: string
          infant_price?: number | null
          is_reserved?: boolean | null
          itinerary_id?: string | null
          latitude?: number | null
          leader_status?: string | null
          longitude?: number | null
          override_at?: string | null
          override_by?: string | null
          override_description?: string | null
          override_title?: string | null
          pricing_type?: string | null
          quantity?: number | null
          quote_item_id?: string | null
          quote_note?: string | null
          quote_status?: string | null
          quoted_cost?: number | null
          receipt_images?: string[] | null
          reply_content?: Json | null
          reply_cost?: number | null
          request_id?: string | null
          request_reply_at?: string | null
          request_sent_at?: string | null
          request_status?: string | null
          reserved_at?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          room_details?: Json | null
          service_date?: string | null
          service_date_end?: string | null
          show_on_brochure?: boolean
          show_on_quote?: boolean | null
          show_on_web?: boolean
          sort_order?: number | null
          sub_category?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          title?: string | null
          total_cost?: number | null
          tour_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_itinerary_items_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_itinerary_items_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_itinerary_items_itinerary_id_fkey'
            columns: ['itinerary_id']
            isOneToOne: false
            referencedRelation: 'itineraries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_itinerary_items_override_by_fkey'
            columns: ['override_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_itinerary_items_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_itinerary_items_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_itinerary_items_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      tour_leaders: {
        Row: {
          address: string | null
          code: string | null
          created_at: string | null
          display_order: number | null
          domestic_phone: string | null
          email: string | null
          english_name: string | null
          id: string
          languages: string[] | null
          license_number: string | null
          name: string
          national_id: string | null
          notes: string | null
          overseas_phone: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          photo: string | null
          specialties: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          display_order?: number | null
          domestic_phone?: string | null
          email?: string | null
          english_name?: string | null
          id?: string
          languages?: string[] | null
          license_number?: string | null
          name: string
          national_id?: string | null
          notes?: string | null
          overseas_phone?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          photo?: string | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          display_order?: number | null
          domestic_phone?: string | null
          email?: string | null
          english_name?: string | null
          id?: string
          languages?: string[] | null
          license_number?: string | null
          name?: string
          national_id?: string | null
          notes?: string | null
          overseas_phone?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          photo?: string | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tour_meal_settings: {
        Row: {
          created_at: string | null
          day_number: number
          display_order: number | null
          enabled: boolean | null
          id: string
          meal_type: string
          restaurant_name: string | null
          tour_id: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_number: number
          display_order?: number | null
          enabled?: boolean | null
          id?: string
          meal_type: string
          restaurant_name?: string | null
          tour_id: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_number?: number
          display_order?: number | null
          enabled?: boolean | null
          id?: string
          meal_type?: string
          restaurant_name?: string | null
          tour_id?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_meal_settings_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_meal_settings_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_meal_settings_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_member_fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_name: string
          field_value: string | null
          id: string
          order_member_id: string
          tour_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_name: string
          field_value?: string | null
          id?: string
          order_member_id: string
          tour_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_name?: string
          field_value?: string | null
          id?: string
          order_member_id?: string
          tour_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_member_fields_order_member_id_fkey'
            columns: ['order_member_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['order_member_id']
          },
          {
            foreignKeyName: 'tour_member_fields_order_member_id_fkey'
            columns: ['order_member_id']
            isOneToOne: false
            referencedRelation: 'order_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_member_fields_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_member_fields_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
      tour_members: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          dietary_requirements: string | null
          id: string
          member_type: string
          room_type: string | null
          roommate_id: string | null
          special_requests: string | null
          tour_id: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          dietary_requirements?: string | null
          id?: string
          member_type: string
          room_type?: string | null
          roommate_id?: string | null
          special_requests?: string | null
          tour_id: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          dietary_requirements?: string | null
          id?: string
          member_type?: string
          room_type?: string | null
          roommate_id?: string | null
          special_requests?: string | null
          tour_id?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_members_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_members_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_members_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_members_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_members_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      tour_refunds: {
        Row: {
          created_at: string | null
          id: string
          member_id: string | null
          notes: string | null
          order_id: string | null
          processed_by: string | null
          processing_status: string | null
          refund_amount: number
          refund_date: string | null
          refund_reason: string
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          order_id?: string | null
          processed_by?: string | null
          processing_status?: string | null
          refund_amount: number
          refund_date?: string | null
          refund_reason: string
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          order_id?: string | null
          processed_by?: string | null
          processing_status?: string | null
          refund_amount?: number
          refund_date?: string | null
          refund_reason?: string
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tour_request_items: {
        Row: {
          corner_confirmed: boolean | null
          corner_notes: string | null
          created_at: string | null
          created_by: string | null
          day_number: number | null
          handled_by: string | null
          handled_note: string | null
          id: string
          item_category: string | null
          item_name: string
          local_confirmed_at: string | null
          local_cost: number | null
          local_currency: string | null
          local_notes: string | null
          local_status: string | null
          request_id: string
          service_date: string | null
          sort_order: number | null
          source: string | null
          source_item_id: string | null
          tour_id: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          corner_confirmed?: boolean | null
          corner_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          day_number?: number | null
          handled_by?: string | null
          handled_note?: string | null
          id?: string
          item_category?: string | null
          item_name: string
          local_confirmed_at?: string | null
          local_cost?: number | null
          local_currency?: string | null
          local_notes?: string | null
          local_status?: string | null
          request_id: string
          service_date?: string | null
          sort_order?: number | null
          source?: string | null
          source_item_id?: string | null
          tour_id: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          corner_confirmed?: boolean | null
          corner_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          day_number?: number | null
          handled_by?: string | null
          handled_note?: string | null
          id?: string
          item_category?: string | null
          item_name?: string
          local_confirmed_at?: string | null
          local_cost?: number | null
          local_currency?: string | null
          local_notes?: string | null
          local_status?: string | null
          request_id?: string
          service_date?: string | null
          sort_order?: number | null
          source?: string | null
          source_item_id?: string | null
          tour_id?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      tour_request_member_vouchers: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          member_name: string | null
          request_id: string
          status: string | null
          unit_price: number | null
          updated_at: string | null
          voucher_code: string | null
          voucher_data: Json | null
          voucher_file_url: string | null
          voucher_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          member_name?: string | null
          request_id: string
          status?: string | null
          unit_price?: number | null
          updated_at?: string | null
          voucher_code?: string | null
          voucher_data?: Json | null
          voucher_file_url?: string | null
          voucher_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          member_name?: string | null
          request_id?: string
          status?: string | null
          unit_price?: number | null
          updated_at?: string | null
          voucher_code?: string | null
          voucher_data?: Json | null
          voucher_file_url?: string | null
          voucher_type?: string
        }
        Relationships: []
      }
      tour_request_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          forwarded_at: string | null
          forwarded_message_id: string | null
          forwarded_to_channel: boolean | null
          id: string
          is_important: boolean | null
          is_read: boolean | null
          is_read_by_staff: boolean | null
          is_read_by_supplier: boolean | null
          read_at: string | null
          request_id: string
          sender_id: string
          sender_name: string | null
          sender_type: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          forwarded_at?: string | null
          forwarded_message_id?: string | null
          forwarded_to_channel?: boolean | null
          id?: string
          is_important?: boolean | null
          is_read?: boolean | null
          is_read_by_staff?: boolean | null
          is_read_by_supplier?: boolean | null
          read_at?: string | null
          request_id: string
          sender_id: string
          sender_name?: string | null
          sender_type: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          forwarded_at?: string | null
          forwarded_message_id?: string | null
          forwarded_to_channel?: boolean | null
          id?: string
          is_important?: boolean | null
          is_read?: boolean | null
          is_read_by_staff?: boolean | null
          is_read_by_supplier?: boolean | null
          read_at?: string | null
          request_id?: string
          sender_id?: string
          sender_name?: string | null
          sender_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tour_requests: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          assigned_employee_id: string | null
          assigned_employee_name: string | null
          close_note: string | null
          closed_at: string | null
          closed_by: string | null
          code: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          covered_item_ids: Json | null
          created_at: string | null
          created_by: string | null
          hidden: boolean | null
          id: string
          is_selected: boolean | null
          items: Json
          line_group_id: string | null
          line_group_name: string | null
          note: string | null
          package_status: string | null
          recipient_workspace_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          replied_at: string | null
          replied_by: string | null
          request_scope: string | null
          request_type: string
          selected_tier: number | null
          sent_at: string | null
          sent_to: string | null
          sent_via: string | null
          source_id: string | null
          source_type: string | null
          status: string
          supplier_contact: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_response: Json | null
          target_workspace_id: string | null
          tour_id: string
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          assigned_employee_id?: string | null
          assigned_employee_name?: string | null
          close_note?: string | null
          closed_at?: string | null
          closed_by?: string | null
          code?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          covered_item_ids?: Json | null
          created_at?: string | null
          created_by?: string | null
          hidden?: boolean | null
          id?: string
          is_selected?: boolean | null
          items?: Json
          line_group_id?: string | null
          line_group_name?: string | null
          note?: string | null
          package_status?: string | null
          recipient_workspace_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          replied_at?: string | null
          replied_by?: string | null
          request_scope?: string | null
          request_type: string
          selected_tier?: number | null
          sent_at?: string | null
          sent_to?: string | null
          sent_via?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_response?: Json | null
          target_workspace_id?: string | null
          tour_id: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          assigned_employee_id?: string | null
          assigned_employee_name?: string | null
          close_note?: string | null
          closed_at?: string | null
          closed_by?: string | null
          code?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          covered_item_ids?: Json | null
          created_at?: string | null
          created_by?: string | null
          hidden?: boolean | null
          id?: string
          is_selected?: boolean | null
          items?: Json
          line_group_id?: string | null
          line_group_name?: string | null
          note?: string | null
          package_status?: string | null
          recipient_workspace_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          replied_at?: string | null
          replied_by?: string | null
          request_scope?: string | null
          request_type?: string
          selected_tier?: number | null
          sent_at?: string | null
          sent_to?: string | null
          sent_via?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_response?: Json | null
          target_workspace_id?: string | null
          tour_id?: string
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_requests_recipient_workspace_id_fkey'
            columns: ['recipient_workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_requests_target_workspace_id_fkey'
            columns: ['target_workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_requests_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_requests_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_requests_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_role_assignments: {
        Row: {
          created_at: string
          employee_id: string
          field_id: string | null
          id: string
          order_id: string | null
          role_id: string | null
          tour_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          field_id?: string | null
          id?: string
          order_id?: string | null
          role_id?: string | null
          tour_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          field_id?: string | null
          id?: string
          order_id?: string | null
          role_id?: string | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_role_assignments_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_role_assignments_field_id_fkey'
            columns: ['field_id']
            isOneToOne: false
            referencedRelation: 'workspace_selector_fields'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_role_assignments_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_role_assignments_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'tour_role_assignments_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'workspace_roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_role_assignments_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_role_assignments_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
      tour_room_assignments: {
        Row: {
          bed_number: number | null
          created_at: string | null
          id: string
          order_member_id: string
          room_id: string
          updated_at: string | null
        }
        Insert: {
          bed_number?: number | null
          created_at?: string | null
          id?: string
          order_member_id: string
          room_id: string
          updated_at?: string | null
        }
        Update: {
          bed_number?: number | null
          created_at?: string | null
          id?: string
          order_member_id?: string
          room_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_room_assignments_order_member_id_fkey'
            columns: ['order_member_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['order_member_id']
          },
          {
            foreignKeyName: 'tour_room_assignments_order_member_id_fkey'
            columns: ['order_member_id']
            isOneToOne: false
            referencedRelation: 'order_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_room_assignments_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'tour_rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_room_assignments_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'tour_rooms_status'
            referencedColumns: ['id']
          },
        ]
      }
      tour_rooms: {
        Row: {
          amount: number | null
          booking_code: string | null
          capacity: number
          created_at: string | null
          created_by: string | null
          display_order: number | null
          hotel_name: string | null
          id: string
          night_number: number
          notes: string | null
          room_number: string | null
          room_type: string
          tour_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          booking_code?: string | null
          capacity?: number
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          hotel_name?: string | null
          id?: string
          night_number?: number
          notes?: string | null
          room_number?: string | null
          room_type: string
          tour_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          booking_code?: string | null
          capacity?: number
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          hotel_name?: string | null
          id?: string
          night_number?: number
          notes?: string | null
          room_number?: string | null
          room_type?: string
          tour_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_rooms_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_rooms_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
      tour_table_assignments: {
        Row: {
          created_at: string | null
          id: string
          order_member_id: string
          table_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_member_id: string
          table_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_member_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_table_assignments_order_member_id_fkey'
            columns: ['order_member_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['order_member_id']
          },
          {
            foreignKeyName: 'tour_table_assignments_order_member_id_fkey'
            columns: ['order_member_id']
            isOneToOne: false
            referencedRelation: 'order_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_table_assignments_table_id_fkey'
            columns: ['table_id']
            isOneToOne: false
            referencedRelation: 'tour_tables'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_table_assignments_table_id_fkey'
            columns: ['table_id']
            isOneToOne: false
            referencedRelation: 'tour_tables_status'
            referencedColumns: ['id']
          },
        ]
      }
      tour_tables: {
        Row: {
          capacity: number
          created_at: string | null
          display_order: number | null
          id: string
          meal_setting_id: string
          table_number: number
          tour_id: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          meal_setting_id: string
          table_number: number
          tour_id: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          meal_setting_id?: string
          table_number?: number
          tour_id?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_tables_meal_setting_id_fkey'
            columns: ['meal_setting_id']
            isOneToOne: false
            referencedRelation: 'tour_meal_settings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_tables_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_tables_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_tables_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_vehicle_assignments: {
        Row: {
          created_at: string | null
          id: string
          order_member_id: string
          seat_number: number | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_member_id: string
          seat_number?: number | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_member_id?: string
          seat_number?: number | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tour_vehicle_assignments_order_member_id_fkey'
            columns: ['order_member_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['order_member_id']
          },
          {
            foreignKeyName: 'tour_vehicle_assignments_order_member_id_fkey'
            columns: ['order_member_id']
            isOneToOne: false
            referencedRelation: 'order_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_vehicle_assignments_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'tour_vehicles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_vehicle_assignments_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'tour_vehicles_status'
            referencedColumns: ['id']
          },
        ]
      }
      tour_vehicles: {
        Row: {
          capacity: number
          created_at: string | null
          display_order: number | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          license_plate: string | null
          notes: string | null
          tour_id: string
          updated_at: string | null
          vehicle_name: string
          vehicle_type: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string | null
          display_order?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          license_plate?: string | null
          notes?: string | null
          tour_id: string
          updated_at?: string | null
          vehicle_name: string
          vehicle_type?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          display_order?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          license_plate?: string | null
          notes?: string | null
          tour_id?: string
          updated_at?: string | null
          vehicle_name?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_vehicles_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_vehicles_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
      tours: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          airport_code: string | null
          archive_reason: string | null
          archived: boolean | null
          checkin_qrcode: string | null
          closed_by: string | null
          closing_date: string | null
          closing_status: string | null
          code: string
          confirmed_requirements: Json | null
          contract_archived_date: string | null
          contract_completed: boolean | null
          contract_content: string | null
          contract_created_at: string | null
          contract_notes: string | null
          contract_status: string
          contract_template: string | null
          controller_id: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          current_participants: number | null
          custom_cost_fields: Json | null
          days_count: number | null
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          departure_date: string | null
          description: string | null
          enable_checkin: boolean | null
          envelope_records: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          itinerary_id: string | null
          last_unlocked_at: string | null
          last_unlocked_by: string | null
          location: string | null
          locked_at: string | null
          locked_by: string | null
          locked_itinerary_id: string | null
          locked_itinerary_version: number | null
          locked_quote_id: string | null
          locked_quote_version: number | null
          max_participants: number | null
          modification_reason: string | null
          name: string
          outbound_flight: Json | null
          price: number | null
          profit: number
          quote_cost_structure: Json | null
          quote_id: string | null
          return_date: string | null
          return_flight: Json | null
          selling_price_per_person: number | null
          status: string
          total_cost: number
          total_revenue: number
          tour_leader_id: string | null
          tour_type: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          airport_code?: string | null
          archive_reason?: string | null
          archived?: boolean | null
          checkin_qrcode?: string | null
          closed_by?: string | null
          closing_date?: string | null
          closing_status?: string | null
          code: string
          confirmed_requirements?: Json | null
          contract_archived_date?: string | null
          contract_completed?: boolean | null
          contract_content?: string | null
          contract_created_at?: string | null
          contract_notes?: string | null
          contract_status?: string
          contract_template?: string | null
          controller_id?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          current_participants?: number | null
          custom_cost_fields?: Json | null
          days_count?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          departure_date?: string | null
          description?: string | null
          enable_checkin?: boolean | null
          envelope_records?: string | null
          features?: Json | null
          id: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          itinerary_id?: string | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_itinerary_id?: string | null
          locked_itinerary_version?: number | null
          locked_quote_id?: string | null
          locked_quote_version?: number | null
          max_participants?: number | null
          modification_reason?: string | null
          name: string
          outbound_flight?: Json | null
          price?: number | null
          profit?: number
          quote_cost_structure?: Json | null
          quote_id?: string | null
          return_date?: string | null
          return_flight?: Json | null
          selling_price_per_person?: number | null
          status?: string
          total_cost?: number
          total_revenue?: number
          tour_leader_id?: string | null
          tour_type?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          airport_code?: string | null
          archive_reason?: string | null
          archived?: boolean | null
          checkin_qrcode?: string | null
          closed_by?: string | null
          closing_date?: string | null
          closing_status?: string | null
          code?: string
          confirmed_requirements?: Json | null
          contract_archived_date?: string | null
          contract_completed?: boolean | null
          contract_content?: string | null
          contract_created_at?: string | null
          contract_notes?: string | null
          contract_status?: string
          contract_template?: string | null
          controller_id?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          current_participants?: number | null
          custom_cost_fields?: Json | null
          days_count?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          departure_date?: string | null
          description?: string | null
          enable_checkin?: boolean | null
          envelope_records?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          itinerary_id?: string | null
          last_unlocked_at?: string | null
          last_unlocked_by?: string | null
          location?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_itinerary_id?: string | null
          locked_itinerary_version?: number | null
          locked_quote_id?: string | null
          locked_quote_version?: number | null
          max_participants?: number | null
          modification_reason?: string | null
          name?: string
          outbound_flight?: Json | null
          price?: number | null
          profit?: number
          quote_cost_structure?: Json | null
          quote_id?: string | null
          return_date?: string | null
          return_flight?: Json | null
          selling_price_per_person?: number | null
          status?: string
          total_cost?: number
          total_revenue?: number
          tour_leader_id?: string | null
          tour_type?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tours_closed_by_fkey'
            columns: ['closed_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_controller_id_fkey'
            columns: ['controller_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_tour_leader_id_fkey'
            columns: ['tour_leader_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['order_member_id']
          },
          {
            foreignKeyName: 'tours_tour_leader_id_fkey'
            columns: ['tour_leader_id']
            isOneToOne: false
            referencedRelation: 'order_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tours_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          order_id: string | null
          status: string | null
          tour_id: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id: string
          order_id?: string | null
          status?: string | null
          tour_id?: string | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
          tour_id?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      transportation_rates: {
        Row: {
          category: string | null
          cost_vnd: number | null
          country_id: string | null
          country_name: string
          created_at: string | null
          created_by: string | null
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          display_order: number
          id: string
          is_active: boolean
          is_backup: boolean | null
          kkday_cost: number | null
          kkday_profit: number | null
          kkday_selling_price: number | null
          notes: string | null
          price: number
          price_twd: number | null
          route: string | null
          supplier: string | null
          trip_type: string | null
          unit: string
          updated_at: string | null
          updated_by: string | null
          vehicle_type: string
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          cost_vnd?: number | null
          country_id?: string | null
          country_name: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_backup?: boolean | null
          kkday_cost?: number | null
          kkday_profit?: number | null
          kkday_selling_price?: number | null
          notes?: string | null
          price?: number
          price_twd?: number | null
          route?: string | null
          supplier?: string | null
          trip_type?: string | null
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
          vehicle_type: string
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          cost_vnd?: number | null
          country_id?: string | null
          country_name?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_backup?: boolean | null
          kkday_cost?: number | null
          kkday_profit?: number | null
          kkday_selling_price?: number | null
          notes?: string | null
          price?: number
          price_twd?: number | null
          route?: string | null
          supplier?: string | null
          trip_type?: string | null
          unit?: string
          updated_at?: string | null
          updated_by?: string | null
          vehicle_type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transportation_rates_country_id_fkey'
            columns: ['country_id']
            isOneToOne: false
            referencedRelation: 'countries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transportation_rates_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transportation_rates_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transportation_rates_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transportation_rates_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      travel_card_templates: {
        Row: {
          category: string
          code: string
          created_at: string | null
          icon: string
          id: string
          label_zh: string
          sort_order: number | null
          translations: Json
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          icon: string
          id?: string
          label_zh: string
          sort_order?: number | null
          translations?: Json
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          icon?: string
          id?: string
          label_zh?: string
          sort_order?: number | null
          translations?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      travel_invoices: {
        Row: {
          allowance_amount: number | null
          allowance_date: string | null
          allowance_items: Json | null
          allowance_no: string | null
          allowanced_by: string | null
          barcode: string | null
          buyer_email: string | null
          buyer_info: Json
          buyer_mobile: string | null
          buyer_name: string
          buyer_ubn: string | null
          created_at: string
          created_by: string
          id: string
          invoice_date: string
          invoice_number: string | null
          is_batch: boolean | null
          items: Json
          merchant_id: string | null
          order_id: string | null
          qrcode_l: string | null
          qrcode_r: string | null
          random_num: string | null
          status: string
          tax_type: string
          total_amount: number
          tour_id: string | null
          transaction_no: string
          updated_at: string
          updated_by: string | null
          void_date: string | null
          void_reason: string | null
          voided_by: string | null
          workspace_id: string | null
        }
        Insert: {
          allowance_amount?: number | null
          allowance_date?: string | null
          allowance_items?: Json | null
          allowance_no?: string | null
          allowanced_by?: string | null
          barcode?: string | null
          buyer_email?: string | null
          buyer_info?: Json
          buyer_mobile?: string | null
          buyer_name: string
          buyer_ubn?: string | null
          created_at?: string
          created_by: string
          id?: string
          invoice_date: string
          invoice_number?: string | null
          is_batch?: boolean | null
          items?: Json
          merchant_id?: string | null
          order_id?: string | null
          qrcode_l?: string | null
          qrcode_r?: string | null
          random_num?: string | null
          status?: string
          tax_type?: string
          total_amount: number
          tour_id?: string | null
          transaction_no: string
          updated_at?: string
          updated_by?: string | null
          void_date?: string | null
          void_reason?: string | null
          voided_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          allowance_amount?: number | null
          allowance_date?: string | null
          allowance_items?: Json | null
          allowance_no?: string | null
          allowanced_by?: string | null
          barcode?: string | null
          buyer_email?: string | null
          buyer_info?: Json
          buyer_mobile?: string | null
          buyer_name?: string
          buyer_ubn?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          is_batch?: boolean | null
          items?: Json
          merchant_id?: string | null
          order_id?: string | null
          qrcode_l?: string | null
          qrcode_r?: string | null
          random_num?: string | null
          status?: string
          tax_type?: string
          total_amount?: number
          tour_id?: string | null
          transaction_no?: string
          updated_at?: string
          updated_by?: string | null
          void_date?: string | null
          void_reason?: string | null
          voided_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'travel_invoices_allowanced_by_fkey'
            columns: ['allowanced_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoices_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoices_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoices_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'travel_invoices_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoices_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoices_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoices_voided_by_fkey'
            columns: ['voided_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'travel_invoices_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_badges: {
        Row: {
          badge_type: string
          earned_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_badges_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_conversation_members: {
        Row: {
          conversation_id: string
          employee_id: string | null
          id: string
          is_muted: boolean | null
          joined_at: string | null
          last_read_at: string | null
          last_read_message_id: string | null
          left_at: string | null
          member_type: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          employee_id?: string | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          member_type?: string | null
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          employee_id?: string | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          member_type?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_conversation_members_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'traveler_conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_conversation_members_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_conversations: {
        Row: {
          auto_open_before_days: number | null
          avatar_url: string | null
          close_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_open: boolean | null
          last_message_at: string | null
          last_message_id: string | null
          last_message_preview: string | null
          name: string | null
          open_at: string | null
          split_group_id: string | null
          tour_id: string | null
          trip_id: string | null
          type: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          auto_open_before_days?: number | null
          avatar_url?: string | null
          close_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_open?: boolean | null
          last_message_at?: string | null
          last_message_id?: string | null
          last_message_preview?: string | null
          name?: string | null
          open_at?: string | null
          split_group_id?: string | null
          tour_id?: string | null
          trip_id?: string | null
          type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          auto_open_before_days?: number | null
          avatar_url?: string | null
          close_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_open?: boolean | null
          last_message_at?: string | null
          last_message_id?: string | null
          last_message_preview?: string | null
          name?: string | null
          open_at?: string | null
          split_group_id?: string | null
          tour_id?: string | null
          trip_id?: string | null
          type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_last_message'
            columns: ['last_message_id']
            isOneToOne: false
            referencedRelation: 'traveler_messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_conversations_split_group_id_fkey'
            columns: ['split_group_id']
            isOneToOne: false
            referencedRelation: 'traveler_split_groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_conversations_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_conversations_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_conversations_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'traveler_trips'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_conversations_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_expense_splits: {
        Row: {
          amount: number
          expense_id: string
          id: string
          is_settled: boolean | null
          settled_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          expense_id: string
          id?: string
          is_settled?: boolean | null
          settled_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          expense_id?: string
          id?: string
          is_settled?: boolean | null
          settled_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_expense_splits_expense_id_fkey'
            columns: ['expense_id']
            isOneToOne: false
            referencedRelation: 'traveler_expenses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_expense_splits_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          expense_date: string | null
          id: string
          paid_by: string
          receipt_url: string | null
          split_group_id: string | null
          title: string
          trip_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          paid_by: string
          receipt_url?: string | null
          split_group_id?: string | null
          title: string
          trip_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          paid_by?: string
          receipt_url?: string | null
          split_group_id?: string | null
          title?: string
          trip_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_traveler_expenses_split_group'
            columns: ['split_group_id']
            isOneToOne: false
            referencedRelation: 'traveler_split_groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_expenses_paid_by_fkey'
            columns: ['paid_by']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_expenses_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'traveler_trips'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_friends: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string | null
          friend_id: string
          id: string
          invite_code: string | null
          invite_message: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          friend_id: string
          id?: string
          invite_code?: string | null
          invite_message?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          friend_id?: string
          id?: string
          invite_code?: string | null
          invite_message?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_friends_friend_id_fkey'
            columns: ['friend_id']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_friends_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_messages: {
        Row: {
          attachments: Json | null
          content: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          metadata: Json | null
          reactions: Json | null
          reply_to_id: string | null
          sender_id: string
          type: string
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          metadata?: Json | null
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id: string
          type?: string
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          metadata?: Json | null
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'traveler_conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_messages_reply_to_id_fkey'
            columns: ['reply_to_id']
            isOneToOne: false
            referencedRelation: 'traveler_messages'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_profiles: {
        Row: {
          active_group_count: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          customer_id: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          id_number: string | null
          id_verified_at: string | null
          is_founding_member: boolean | null
          is_profile_complete: boolean | null
          last_synced_at: string | null
          location: string | null
          member_level: string | null
          member_number: number | null
          phone: string | null
          sync_version: number | null
          updated_at: string | null
          user_type: string | null
          username: string | null
        }
        Insert: {
          active_group_count?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          customer_id?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          id_number?: string | null
          id_verified_at?: string | null
          is_founding_member?: boolean | null
          is_profile_complete?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          member_level?: string | null
          member_number?: number | null
          phone?: string | null
          sync_version?: number | null
          updated_at?: string | null
          user_type?: string | null
          username?: string | null
        }
        Update: {
          active_group_count?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          customer_id?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          id_number?: string | null
          id_verified_at?: string | null
          is_founding_member?: boolean | null
          is_profile_complete?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          member_level?: string | null
          member_number?: number | null
          phone?: string | null
          sync_version?: number | null
          updated_at?: string | null
          user_type?: string | null
          username?: string | null
        }
        Relationships: []
      }
      traveler_settlements: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          currency: string | null
          from_user: string
          id: string
          note: string | null
          split_group_id: string | null
          status: string | null
          to_user: string
          trip_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          from_user: string
          id?: string
          note?: string | null
          split_group_id?: string | null
          status?: string | null
          to_user: string
          trip_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          from_user?: string
          id?: string
          note?: string | null
          split_group_id?: string | null
          status?: string | null
          to_user?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_traveler_settlements_split_group'
            columns: ['split_group_id']
            isOneToOne: false
            referencedRelation: 'traveler_split_groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_settlements_from_user_fkey'
            columns: ['from_user']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_settlements_to_user_fkey'
            columns: ['to_user']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_settlements_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'traveler_trips'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_split_group_members: {
        Row: {
          display_name: string | null
          group_id: string
          id: string
          is_virtual: boolean | null
          joined_at: string | null
          nickname: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          display_name?: string | null
          group_id: string
          id?: string
          is_virtual?: boolean | null
          joined_at?: string | null
          nickname?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          display_name?: string | null
          group_id?: string
          id?: string
          is_virtual?: boolean | null
          joined_at?: string | null
          nickname?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_split_group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'traveler_split_groups'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_split_groups: {
        Row: {
          cover_image: string | null
          created_at: string | null
          created_by: string
          default_currency: string | null
          description: string | null
          id: string
          name: string
          trip_id: string | null
          updated_at: string | null
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          created_by: string
          default_currency?: string | null
          description?: string | null
          id?: string
          name: string
          trip_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          created_by?: string
          default_currency?: string | null
          description?: string | null
          id?: string
          name?: string
          trip_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_split_groups_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_split_groups_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'traveler_trips'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_tour_cache: {
        Row: {
          cached_at: string | null
          chinese_name: string | null
          departure_date: string | null
          english_name: string | null
          id: string
          id_number: string
          identity: string | null
          itinerary_id: string | null
          itinerary_title: string | null
          itinerary_updated_at: string | null
          location: string | null
          member_type: string | null
          needs_refresh: boolean | null
          order_code: string | null
          order_id: string
          order_member_id: string
          order_status: string | null
          outbound_flight: Json | null
          return_date: string | null
          return_flight: Json | null
          source_updated_at: string | null
          tour_code: string
          tour_id: string
          tour_name: string | null
          tour_status: string | null
          traveler_id: string
        }
        Insert: {
          cached_at?: string | null
          chinese_name?: string | null
          departure_date?: string | null
          english_name?: string | null
          id?: string
          id_number: string
          identity?: string | null
          itinerary_id?: string | null
          itinerary_title?: string | null
          itinerary_updated_at?: string | null
          location?: string | null
          member_type?: string | null
          needs_refresh?: boolean | null
          order_code?: string | null
          order_id: string
          order_member_id: string
          order_status?: string | null
          outbound_flight?: Json | null
          return_date?: string | null
          return_flight?: Json | null
          source_updated_at?: string | null
          tour_code: string
          tour_id: string
          tour_name?: string | null
          tour_status?: string | null
          traveler_id: string
        }
        Update: {
          cached_at?: string | null
          chinese_name?: string | null
          departure_date?: string | null
          english_name?: string | null
          id?: string
          id_number?: string
          identity?: string | null
          itinerary_id?: string | null
          itinerary_title?: string | null
          itinerary_updated_at?: string | null
          location?: string | null
          member_type?: string | null
          needs_refresh?: boolean | null
          order_code?: string | null
          order_id?: string
          order_member_id?: string
          order_status?: string | null
          outbound_flight?: Json | null
          return_date?: string | null
          return_flight?: Json | null
          source_updated_at?: string | null
          tour_code?: string
          tour_id?: string
          tour_name?: string | null
          tour_status?: string | null
          traveler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_tour_cache_traveler_id_fkey'
            columns: ['traveler_id']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_trip_accommodations: {
        Row: {
          address: string | null
          booking_platform: string | null
          check_in_date: string | null
          check_out_date: string | null
          confirmation_number: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          room_count: number | null
          room_type: string | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          booking_platform?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          confirmation_number?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          room_count?: number | null
          room_type?: string | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          booking_platform?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          confirmation_number?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          room_count?: number | null
          room_type?: string | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_trip_accommodations_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'traveler_trips'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_trip_briefings: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          sort_order: number | null
          title: string
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          sort_order?: number | null
          title: string
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          sort_order?: number | null
          title?: string
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_trip_briefings_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'traveler_trips'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_trip_flights: {
        Row: {
          airline: string | null
          arrival_airport: string | null
          arrival_airport_code: string | null
          arrival_date: string | null
          arrival_time: string | null
          cabin_class: string | null
          created_at: string | null
          departure_airport: string | null
          departure_airport_code: string | null
          departure_date: string | null
          departure_time: string | null
          flight_no: string | null
          flight_type: string | null
          id: string
          meeting_location: string | null
          meeting_time: string | null
          pnr: string | null
          ticket_number: string | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_airport_code?: string | null
          arrival_date?: string | null
          arrival_time?: string | null
          cabin_class?: string | null
          created_at?: string | null
          departure_airport?: string | null
          departure_airport_code?: string | null
          departure_date?: string | null
          departure_time?: string | null
          flight_no?: string | null
          flight_type?: string | null
          id?: string
          meeting_location?: string | null
          meeting_time?: string | null
          pnr?: string | null
          ticket_number?: string | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_airport_code?: string | null
          arrival_date?: string | null
          arrival_time?: string | null
          cabin_class?: string | null
          created_at?: string | null
          departure_airport?: string | null
          departure_airport_code?: string | null
          departure_date?: string | null
          departure_time?: string | null
          flight_no?: string | null
          flight_type?: string | null
          id?: string
          meeting_location?: string | null
          meeting_time?: string | null
          pnr?: string | null
          ticket_number?: string | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_trip_flights_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'traveler_trips'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_trip_invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invite_code: string
          invitee_id: string | null
          inviter_id: string
          role: string | null
          status: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          invitee_id?: string | null
          inviter_id: string
          role?: string | null
          status?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          invitee_id?: string | null
          inviter_id?: string
          role?: string | null
          status?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_trip_invitations_invitee_id_fkey'
            columns: ['invitee_id']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_trip_invitations_inviter_id_fkey'
            columns: ['inviter_id']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_trip_invitations_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'traveler_trips'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_trip_itinerary_items: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          day_number: number | null
          description: string | null
          end_time: string | null
          estimated_cost: number | null
          icon: string | null
          id: string
          item_date: string | null
          latitude: number | null
          location_address: string | null
          location_name: string | null
          location_url: string | null
          longitude: number | null
          notes: string | null
          sort_order: number | null
          start_time: string | null
          title: string
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          day_number?: number | null
          description?: string | null
          end_time?: string | null
          estimated_cost?: number | null
          icon?: string | null
          id?: string
          item_date?: string | null
          latitude?: number | null
          location_address?: string | null
          location_name?: string | null
          location_url?: string | null
          longitude?: number | null
          notes?: string | null
          sort_order?: number | null
          start_time?: string | null
          title: string
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          day_number?: number | null
          description?: string | null
          end_time?: string | null
          estimated_cost?: number | null
          icon?: string | null
          id?: string
          item_date?: string | null
          latitude?: number | null
          location_address?: string | null
          location_name?: string | null
          location_url?: string | null
          longitude?: number | null
          notes?: string | null
          sort_order?: number | null
          start_time?: string | null
          title?: string
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_trip_itinerary_items_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'traveler_trips'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_trip_members: {
        Row: {
          id: string
          joined_at: string | null
          nickname: string | null
          role: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          nickname?: string | null
          role?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          nickname?: string | null
          role?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_trip_members_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'traveler_trips'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'traveler_trip_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      traveler_trips: {
        Row: {
          cover_image: string | null
          created_at: string | null
          created_by: string
          default_currency: string | null
          description: string | null
          end_date: string | null
          erp_tour_id: string | null
          id: string
          start_date: string | null
          status: string | null
          title: string
          tour_code: string | null
          trip_source: string | null
          updated_at: string | null
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          created_by: string
          default_currency?: string | null
          description?: string | null
          end_date?: string | null
          erp_tour_id?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          title: string
          tour_code?: string | null
          trip_source?: string | null
          updated_at?: string | null
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          created_by?: string
          default_currency?: string | null
          description?: string | null
          end_date?: string | null
          erp_tour_id?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          title?: string
          tour_code?: string | null
          trip_source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'traveler_trips_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'traveler_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      trip_members: {
        Row: {
          app_user_id: string | null
          assigned_itinerary_id: string
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          invited_by: string | null
          name: string
          phone: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          app_user_id?: string | null
          assigned_itinerary_id: string
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          invited_by?: string | null
          name: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          app_user_id?: string | null
          assigned_itinerary_id?: string
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          invited_by?: string | null
          name?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trip_members_assigned_itinerary_id_fkey'
            columns: ['assigned_itinerary_id']
            isOneToOne: false
            referencedRelation: 'customer_assigned_itineraries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trip_members_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trip_members_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
        ]
      }
      trip_members_v2: {
        Row: {
          assigned_itinerary_id: string
          customer_id: string
          esim_activation_date: string | null
          esim_data_plan: string | null
          esim_expiry_date: string | null
          esim_provider: string | null
          esim_url: string | null
          id: string
          joined_at: string
          payment_balance_due_date: string | null
          payment_currency: string | null
          payment_deposit_amount: number | null
          payment_deposit_paid_at: string | null
          payment_paid_amount: number | null
          payment_records: Json | null
          payment_status: string | null
          payment_total_amount: number | null
          role: string
          room_assignments: Json | null
          visa_application_date: string | null
          visa_country: string | null
          visa_expiry_date: string | null
          visa_notes: string | null
          visa_status: string | null
          visa_type: string | null
        }
        Insert: {
          assigned_itinerary_id: string
          customer_id: string
          esim_activation_date?: string | null
          esim_data_plan?: string | null
          esim_expiry_date?: string | null
          esim_provider?: string | null
          esim_url?: string | null
          id?: string
          joined_at?: string
          payment_balance_due_date?: string | null
          payment_currency?: string | null
          payment_deposit_amount?: number | null
          payment_deposit_paid_at?: string | null
          payment_paid_amount?: number | null
          payment_records?: Json | null
          payment_status?: string | null
          payment_total_amount?: number | null
          role?: string
          room_assignments?: Json | null
          visa_application_date?: string | null
          visa_country?: string | null
          visa_expiry_date?: string | null
          visa_notes?: string | null
          visa_status?: string | null
          visa_type?: string | null
        }
        Update: {
          assigned_itinerary_id?: string
          customer_id?: string
          esim_activation_date?: string | null
          esim_data_plan?: string | null
          esim_expiry_date?: string | null
          esim_provider?: string | null
          esim_url?: string | null
          id?: string
          joined_at?: string
          payment_balance_due_date?: string | null
          payment_currency?: string | null
          payment_deposit_amount?: number | null
          payment_deposit_paid_at?: string | null
          payment_paid_amount?: number | null
          payment_records?: Json | null
          payment_status?: string | null
          payment_total_amount?: number | null
          role?: string
          room_assignments?: Json | null
          visa_application_date?: string | null
          visa_country?: string | null
          visa_expiry_date?: string | null
          visa_notes?: string | null
          visa_status?: string | null
          visa_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'trip_members_v2_assigned_itinerary_id_fkey'
            columns: ['assigned_itinerary_id']
            isOneToOne: false
            referencedRelation: 'assigned_itineraries'
            referencedColumns: ['id']
          },
        ]
      }
      usa_esta: {
        Row: {
          applicant_name_zh: string
          application_code: string
          application_number: string | null
          birth_city: string | null
          birth_country: string | null
          cbp_membership_number: string | null
          company_address_en: string | null
          company_address_zh: string | null
          company_name_en: string | null
          company_name_zh: string | null
          company_phone: string | null
          contact_address_en: string | null
          contact_address_zh: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          emergency_contact_country_code: string | null
          emergency_contact_email: string | null
          emergency_contact_firstname_en: string | null
          emergency_contact_firstname_zh: string | null
          emergency_contact_phone: string | null
          emergency_contact_surname_en: string | null
          emergency_contact_surname_zh: string | null
          employment_status: string | null
          esta_validity_end: string | null
          esta_validity_start: string | null
          father_firstname_en: string | null
          father_firstname_zh: string | null
          father_surname_en: string | null
          father_surname_zh: string | null
          had_citizenship_acquired_date: string | null
          had_citizenship_renounced_date: string | null
          had_other_citizenship: boolean | null
          had_other_citizenship_country: string | null
          has_other_citizenship: boolean | null
          has_other_names: boolean | null
          has_other_passport_or_id: boolean | null
          id: string
          is_cbp_global_entry_member: boolean | null
          is_transit_to_another_country: boolean | null
          job_title_en: string | null
          job_title_zh: string | null
          mother_firstname_en: string | null
          mother_firstname_zh: string | null
          mother_surname_en: string | null
          mother_surname_zh: string | null
          no_social_media: boolean | null
          order_id: string | null
          other_citizenship_country: string | null
          other_citizenship_method: string | null
          other_citizenship_method_detail: string | null
          other_document_country: string | null
          other_document_expiry_year: number | null
          other_document_number: string | null
          other_document_type: string | null
          other_name_firstname_en: string | null
          other_name_firstname_zh: string | null
          other_name_surname_en: string | null
          other_name_surname_zh: string | null
          passport_validity_over_2_years: boolean
          provides_social_media: boolean | null
          q1_has_health_issues: boolean | null
          q2_has_criminal_record: boolean | null
          q3_has_drug_violation: boolean | null
          q4_involved_in_terrorism: boolean | null
          q5_committed_fraud: boolean | null
          q6_illegal_employment: boolean | null
          q7_denied_when: string | null
          q7_denied_where: string | null
          q7_visa_denied: boolean | null
          q8_overstayed: boolean | null
          q9_countries_visited: string[] | null
          q9_visit_end_month: number | null
          q9_visit_end_year: number | null
          q9_visit_purpose: string | null
          q9_visit_purpose_detail: string | null
          q9_visit_start_month: number | null
          q9_visit_start_year: number | null
          q9_visited_restricted_countries: boolean | null
          social_media_id_1: string | null
          social_media_id_2: string | null
          social_media_platform_1: string | null
          social_media_platform_2: string | null
          status: string | null
          tour_id: string | null
          transit_destination_country: string | null
          updated_at: string | null
          updated_by: string | null
          us_contact_address_en: string | null
          us_contact_city_en: string | null
          us_contact_name_en: string | null
          us_contact_phone: string | null
          us_contact_state_en: string | null
          us_stay_address_en: string | null
          us_stay_city_en: string | null
          us_stay_state_en: string | null
          workspace_id: string
        }
        Insert: {
          applicant_name_zh: string
          application_code: string
          application_number?: string | null
          birth_city?: string | null
          birth_country?: string | null
          cbp_membership_number?: string | null
          company_address_en?: string | null
          company_address_zh?: string | null
          company_name_en?: string | null
          company_name_zh?: string | null
          company_phone?: string | null
          contact_address_en?: string | null
          contact_address_zh?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          emergency_contact_country_code?: string | null
          emergency_contact_email?: string | null
          emergency_contact_firstname_en?: string | null
          emergency_contact_firstname_zh?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_surname_en?: string | null
          emergency_contact_surname_zh?: string | null
          employment_status?: string | null
          esta_validity_end?: string | null
          esta_validity_start?: string | null
          father_firstname_en?: string | null
          father_firstname_zh?: string | null
          father_surname_en?: string | null
          father_surname_zh?: string | null
          had_citizenship_acquired_date?: string | null
          had_citizenship_renounced_date?: string | null
          had_other_citizenship?: boolean | null
          had_other_citizenship_country?: string | null
          has_other_citizenship?: boolean | null
          has_other_names?: boolean | null
          has_other_passport_or_id?: boolean | null
          id?: string
          is_cbp_global_entry_member?: boolean | null
          is_transit_to_another_country?: boolean | null
          job_title_en?: string | null
          job_title_zh?: string | null
          mother_firstname_en?: string | null
          mother_firstname_zh?: string | null
          mother_surname_en?: string | null
          mother_surname_zh?: string | null
          no_social_media?: boolean | null
          order_id?: string | null
          other_citizenship_country?: string | null
          other_citizenship_method?: string | null
          other_citizenship_method_detail?: string | null
          other_document_country?: string | null
          other_document_expiry_year?: number | null
          other_document_number?: string | null
          other_document_type?: string | null
          other_name_firstname_en?: string | null
          other_name_firstname_zh?: string | null
          other_name_surname_en?: string | null
          other_name_surname_zh?: string | null
          passport_validity_over_2_years: boolean
          provides_social_media?: boolean | null
          q1_has_health_issues?: boolean | null
          q2_has_criminal_record?: boolean | null
          q3_has_drug_violation?: boolean | null
          q4_involved_in_terrorism?: boolean | null
          q5_committed_fraud?: boolean | null
          q6_illegal_employment?: boolean | null
          q7_denied_when?: string | null
          q7_denied_where?: string | null
          q7_visa_denied?: boolean | null
          q8_overstayed?: boolean | null
          q9_countries_visited?: string[] | null
          q9_visit_end_month?: number | null
          q9_visit_end_year?: number | null
          q9_visit_purpose?: string | null
          q9_visit_purpose_detail?: string | null
          q9_visit_start_month?: number | null
          q9_visit_start_year?: number | null
          q9_visited_restricted_countries?: boolean | null
          social_media_id_1?: string | null
          social_media_id_2?: string | null
          social_media_platform_1?: string | null
          social_media_platform_2?: string | null
          status?: string | null
          tour_id?: string | null
          transit_destination_country?: string | null
          updated_at?: string | null
          updated_by?: string | null
          us_contact_address_en?: string | null
          us_contact_city_en?: string | null
          us_contact_name_en?: string | null
          us_contact_phone?: string | null
          us_contact_state_en?: string | null
          us_stay_address_en?: string | null
          us_stay_city_en?: string | null
          us_stay_state_en?: string | null
          workspace_id: string
        }
        Update: {
          applicant_name_zh?: string
          application_code?: string
          application_number?: string | null
          birth_city?: string | null
          birth_country?: string | null
          cbp_membership_number?: string | null
          company_address_en?: string | null
          company_address_zh?: string | null
          company_name_en?: string | null
          company_name_zh?: string | null
          company_phone?: string | null
          contact_address_en?: string | null
          contact_address_zh?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          emergency_contact_country_code?: string | null
          emergency_contact_email?: string | null
          emergency_contact_firstname_en?: string | null
          emergency_contact_firstname_zh?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_surname_en?: string | null
          emergency_contact_surname_zh?: string | null
          employment_status?: string | null
          esta_validity_end?: string | null
          esta_validity_start?: string | null
          father_firstname_en?: string | null
          father_firstname_zh?: string | null
          father_surname_en?: string | null
          father_surname_zh?: string | null
          had_citizenship_acquired_date?: string | null
          had_citizenship_renounced_date?: string | null
          had_other_citizenship?: boolean | null
          had_other_citizenship_country?: string | null
          has_other_citizenship?: boolean | null
          has_other_names?: boolean | null
          has_other_passport_or_id?: boolean | null
          id?: string
          is_cbp_global_entry_member?: boolean | null
          is_transit_to_another_country?: boolean | null
          job_title_en?: string | null
          job_title_zh?: string | null
          mother_firstname_en?: string | null
          mother_firstname_zh?: string | null
          mother_surname_en?: string | null
          mother_surname_zh?: string | null
          no_social_media?: boolean | null
          order_id?: string | null
          other_citizenship_country?: string | null
          other_citizenship_method?: string | null
          other_citizenship_method_detail?: string | null
          other_document_country?: string | null
          other_document_expiry_year?: number | null
          other_document_number?: string | null
          other_document_type?: string | null
          other_name_firstname_en?: string | null
          other_name_firstname_zh?: string | null
          other_name_surname_en?: string | null
          other_name_surname_zh?: string | null
          passport_validity_over_2_years?: boolean
          provides_social_media?: boolean | null
          q1_has_health_issues?: boolean | null
          q2_has_criminal_record?: boolean | null
          q3_has_drug_violation?: boolean | null
          q4_involved_in_terrorism?: boolean | null
          q5_committed_fraud?: boolean | null
          q6_illegal_employment?: boolean | null
          q7_denied_when?: string | null
          q7_denied_where?: string | null
          q7_visa_denied?: boolean | null
          q8_overstayed?: boolean | null
          q9_countries_visited?: string[] | null
          q9_visit_end_month?: number | null
          q9_visit_end_year?: number | null
          q9_visit_purpose?: string | null
          q9_visit_purpose_detail?: string | null
          q9_visit_start_month?: number | null
          q9_visit_start_year?: number | null
          q9_visited_restricted_countries?: boolean | null
          social_media_id_1?: string | null
          social_media_id_2?: string | null
          social_media_platform_1?: string | null
          social_media_platform_2?: string | null
          status?: string | null
          tour_id?: string | null
          transit_destination_country?: string | null
          updated_at?: string | null
          updated_by?: string | null
          us_contact_address_en?: string | null
          us_contact_city_en?: string | null
          us_contact_name_en?: string | null
          us_contact_phone?: string | null
          us_contact_state_en?: string | null
          us_stay_address_en?: string | null
          us_stay_city_en?: string | null
          us_stay_state_en?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usa_esta_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usa_esta_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usa_esta_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usa_esta_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usa_esta_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
          {
            foreignKeyName: 'usa_esta_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usa_esta_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usa_esta_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usa_esta_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string | null
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_badges_badge_id_fkey_badges'
            columns: ['badge_id']
            isOneToOne: false
            referencedRelation: 'badges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_badges_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_points_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points_change: number
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points_change: number
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points_change?: number
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_points_transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          preference_key: string
          preference_value: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preference_key: string
          preference_value: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preference_key?: string
          preference_value?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          permissions: string[] | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permissions?: string[] | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permissions?: string[] | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vendor_costs: {
        Row: {
          cost: number
          created_at: string | null
          id: string
          updated_at: string | null
          vendor_name: string
          visa_type: string
        }
        Insert: {
          cost?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          vendor_name: string
          visa_type: string
        }
        Update: {
          cost?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          vendor_name?: string
          visa_type?: string
        }
        Relationships: []
      }
      visas: {
        Row: {
          _needs_sync: boolean | null
          _synced_at: string | null
          actual_submission_date: string | null
          applicant_name: string
          code: string
          contact_person: string
          contact_phone: string
          cost: number | null
          country: string
          created_at: string | null
          created_by: string | null
          documents_returned_date: string | null
          expected_issue_date: string | null
          fee: number | null
          id: string
          is_active: boolean | null
          is_urgent: boolean | null
          notes: string | null
          order_id: string
          order_number: string
          pickup_date: string | null
          received_date: string | null
          status: string | null
          submission_date: string | null
          tour_id: string
          updated_at: string | null
          updated_by: string | null
          vendor: string | null
          visa_type: string
          workspace_id: string
        }
        Insert: {
          _needs_sync?: boolean | null
          _synced_at?: string | null
          actual_submission_date?: string | null
          applicant_name: string
          code: string
          contact_person: string
          contact_phone: string
          cost?: number | null
          country: string
          created_at?: string | null
          created_by?: string | null
          documents_returned_date?: string | null
          expected_issue_date?: string | null
          fee?: number | null
          id?: string
          is_active?: boolean | null
          is_urgent?: boolean | null
          notes?: string | null
          order_id: string
          order_number: string
          pickup_date?: string | null
          received_date?: string | null
          status?: string | null
          submission_date?: string | null
          tour_id: string
          updated_at?: string | null
          updated_by?: string | null
          vendor?: string | null
          visa_type: string
          workspace_id: string
        }
        Update: {
          _needs_sync?: boolean | null
          _synced_at?: string | null
          actual_submission_date?: string | null
          applicant_name?: string
          code?: string
          contact_person?: string
          contact_phone?: string
          cost?: number | null
          country?: string
          created_at?: string | null
          created_by?: string | null
          documents_returned_date?: string | null
          expected_issue_date?: string | null
          fee?: number | null
          id?: string
          is_active?: boolean | null
          is_urgent?: boolean | null
          notes?: string | null
          order_id?: string
          order_number?: string
          pickup_date?: string | null
          received_date?: string | null
          status?: string | null
          submission_date?: string | null
          tour_id?: string
          updated_at?: string | null
          updated_by?: string | null
          vendor?: string | null
          visa_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fk_visas_workspace'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'visas_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'visas_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
      wishlist_selections: {
        Row: {
          admin_replied_at: string | null
          admin_replied_by: string | null
          admin_reply: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          selected_item_ids: string[]
          status: string
          template_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          admin_replied_at?: string | null
          admin_replied_by?: string | null
          admin_reply?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          selected_item_ids?: string[]
          status?: string
          template_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          admin_replied_at?: string | null
          admin_replied_by?: string | null
          admin_reply?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          selected_item_ids?: string[]
          status?: string
          template_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'wishlist_selections_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'wishlist_templates'
            referencedColumns: ['id']
          },
        ]
      }
      wishlist_template_items: {
        Row: {
          address: string | null
          attraction_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          google_maps_url: string | null
          id: string
          image_url: string | null
          is_recommended: boolean
          item_type: string
          name: string
          notes: string | null
          phone: string | null
          price_range: string | null
          region: string | null
          tags: string[] | null
          template_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          attraction_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          google_maps_url?: string | null
          id?: string
          image_url?: string | null
          is_recommended?: boolean
          item_type?: string
          name: string
          notes?: string | null
          phone?: string | null
          price_range?: string | null
          region?: string | null
          tags?: string[] | null
          template_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          attraction_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          google_maps_url?: string | null
          id?: string
          image_url?: string | null
          is_recommended?: boolean
          item_type?: string
          name?: string
          notes?: string | null
          phone?: string | null
          price_range?: string | null
          region?: string | null
          tags?: string[] | null
          template_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'wishlist_template_items_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'wishlist_templates'
            referencedColumns: ['id']
          },
        ]
      }
      wishlist_templates: {
        Row: {
          cover_image: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          slug: string
          status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'wishlist_templates_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wishlist_templates_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workload_summary: {
        Row: {
          completed_tasks: number | null
          id: number
          in_progress_tasks: number | null
          person: string
          total_tasks: number | null
          updated_at: string | null
          urgent_tasks: number | null
          workload_level: string | null
        }
        Insert: {
          completed_tasks?: number | null
          id?: number
          in_progress_tasks?: number | null
          person: string
          total_tasks?: number | null
          updated_at?: string | null
          urgent_tasks?: number | null
          workload_level?: string | null
        }
        Update: {
          completed_tasks?: number | null
          id?: number
          in_progress_tasks?: number | null
          person?: string
          total_tasks?: number | null
          updated_at?: string | null
          urgent_tasks?: number | null
          workload_level?: string | null
        }
        Relationships: []
      }
      workspace_bonus_defaults: {
        Row: {
          bonus: number
          bonus_type: number
          created_at: string | null
          employee_id: string | null
          id: string
          type: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          bonus?: number
          bonus_type?: number
          created_at?: string | null
          employee_id?: string | null
          id?: string
          type: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          bonus?: number
          bonus_type?: number
          created_at?: string | null
          employee_id?: string | null
          id?: string
          type?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_bonus_defaults_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_bonus_defaults_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_features: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          enabled_at: string | null
          enabled_by: string | null
          feature_code: string
          id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          enabled_at?: string | null
          enabled_by?: string | null
          feature_code: string
          id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          enabled_at?: string | null
          enabled_by?: string | null
          feature_code?: string
          id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_features_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_items: {
        Row: {
          content: Json | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_pinned: boolean | null
          item_type: string
          owner: string
          priority: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          item_type: string
          owner: string
          priority?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          item_type?: string
          owner?: string
          priority?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workspace_line_config: {
        Row: {
          bot_basic_id: string | null
          bot_display_name: string | null
          bot_user_id: string | null
          channel_access_token: string | null
          channel_secret: string | null
          connected_at: string | null
          created_at: string | null
          id: string
          is_connected: boolean | null
          login_channel_id: string | null
          login_channel_secret: string | null
          setup_step: number | null
          updated_at: string | null
          webhook_url: string | null
          workspace_id: string | null
        }
        Insert: {
          bot_basic_id?: string | null
          bot_display_name?: string | null
          bot_user_id?: string | null
          channel_access_token?: string | null
          channel_secret?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          login_channel_id?: string | null
          login_channel_secret?: string | null
          setup_step?: number | null
          updated_at?: string | null
          webhook_url?: string | null
          workspace_id?: string | null
        }
        Update: {
          bot_basic_id?: string | null
          bot_display_name?: string | null
          bot_user_id?: string | null
          channel_access_token?: string | null
          channel_secret?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          login_channel_id?: string | null
          login_channel_secret?: string | null
          setup_step?: number | null
          updated_at?: string | null
          webhook_url?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_line_config_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: true
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_countries: {
        Row: {
          workspace_id: string
          country_code: string
          is_enabled: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          workspace_id: string
          country_code: string
          is_enabled?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string
          country_code?: string
          is_enabled?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_countries_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_countries_country_code_fkey'
            columns: ['country_code']
            isOneToOne: false
            referencedRelation: 'ref_countries'
            referencedColumns: ['code']
          },
        ]
      }
      ref_destinations: {
        Row: {
          code: string
          short_alias: string | null
          country_code: string
          name_zh: string | null
          name_zh_tw: string | null
          name_zh_cn: string | null
          name_en: string | null
          name_ja: string | null
          name_ko: string | null
          name_th: string | null
          type: string | null
          parent_code: string | null
          default_airport: string | null
          google_maps_url: string | null
          google_place_id: string | null
          latitude: number | null
          longitude: number | null
          created_at: string | null
        }
        Insert: {
          code: string
          short_alias?: string | null
          country_code: string
          name_zh?: string | null
          name_zh_tw?: string | null
          name_zh_cn?: string | null
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string | null
          name_th?: string | null
          type?: string | null
          parent_code?: string | null
          default_airport?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string | null
        }
        Update: {
          code?: string
          short_alias?: string | null
          country_code?: string
          name_zh?: string | null
          name_zh_tw?: string | null
          name_zh_cn?: string | null
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string | null
          name_th?: string | null
          type?: string | null
          parent_code?: string | null
          default_airport?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ref_destinations_parent_code_fkey'
            columns: ['parent_code']
            isOneToOne: false
            referencedRelation: 'ref_destinations'
            referencedColumns: ['code']
          },
        ]
      }
      workspace_modules: {
        Row: {
          created_at: string | null
          enabled_at: string | null
          expires_at: string | null
          id: string
          is_enabled: boolean | null
          module_name: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          enabled_at?: string | null
          expires_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_name: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          enabled_at?: string | null
          expires_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_name?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_modules_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_admin: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_admin?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_admin?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_roles_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_selector_fields: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          level: string
          name: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          level: string
          name: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          level?: string
          name?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_selector_fields_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspaces: {
        Row: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          address: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_branch: string | null
          bank_name: string | null
          code: string
          company_seal_url: string | null
          contract_seal_image_url: string | null
          created_at: string | null
          created_by: string | null
          default_password: string | null
          description: string | null
          email: string | null
          employee_number_prefix: string | null
          fax: string | null
          icon: string | null
          id: string
          invoice_seal_image_url: string | null
          is_active: boolean | null
          legal_name: string | null
          logo_url: string | null
          max_employees: number | null
          name: string
          payment_config: Json | null
          personal_seal_url: string | null
          phone: string | null
          premium_enabled: boolean | null
          subtitle: string | null
          tax_id: string | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          code?: string
          company_seal_url?: string | null
          contract_seal_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          default_password?: string | null
          description?: string | null
          email?: string | null
          employee_number_prefix?: string | null
          fax?: string | null
          icon?: string | null
          id?: string
          invoice_seal_image_url?: string | null
          is_active?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          max_employees?: number | null
          name: string
          payment_config?: Json | null
          personal_seal_url?: string | null
          phone?: string | null
          premium_enabled?: boolean | null
          subtitle?: string | null
          tax_id?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          _deleted?: boolean | null
          _needs_sync?: boolean | null
          _synced_at?: string | null
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          code?: string
          company_seal_url?: string | null
          contract_seal_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          default_password?: string | null
          description?: string | null
          email?: string | null
          employee_number_prefix?: string | null
          fax?: string | null
          icon?: string | null
          id?: string
          invoice_seal_image_url?: string | null
          is_active?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          max_employees?: number | null
          name?: string
          payment_config?: Json | null
          personal_seal_url?: string | null
          phone?: string | null
          premium_enabled?: boolean | null
          subtitle?: string | null
          tax_id?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'workspaces_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspaces_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      fleet_schedules_with_vehicle: {
        Row: {
          capacity: number | null
          client_name: string | null
          client_workspace_id: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          destination: string | null
          driver_id: string | null
          driver_name: string | null
          driver_phone: string | null
          effective_driver_name: string | null
          effective_driver_phone: string | null
          end_date: string | null
          id: string | null
          license_plate: string | null
          notes: string | null
          pickup_location: string | null
          rental_fee: number | null
          route_notes: string | null
          start_date: string | null
          status: string | null
          tour_code: string | null
          tour_id: string | null
          tour_name: string | null
          updated_at: string | null
          vehicle_id: string | null
          vehicle_name: string | null
          vehicle_type: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fleet_schedules_driver_id_fkey'
            columns: ['driver_id']
            isOneToOne: false
            referencedRelation: 'fleet_drivers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fleet_schedules_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'fleet_vehicles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fleet_schedules_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      leader_schedules_with_leader: {
        Row: {
          created_at: string | null
          created_by: string | null
          destination: string | null
          end_date: string | null
          id: string | null
          languages: string[] | null
          leader_id: string | null
          leader_name: string | null
          leader_phone: string | null
          notes: string | null
          specialties: string[] | null
          start_date: string | null
          status: string | null
          tour_code: string | null
          tour_id: string | null
          tour_name: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'leader_schedules_leader_id_fkey'
            columns: ['leader_id']
            isOneToOne: false
            referencedRelation: 'tour_leaders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leader_schedules_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leader_schedules_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leader_schedules_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      my_erp_tours: {
        Row: {
          chinese_name: string | null
          destination: string | null
          end_date: string | null
          english_name: string | null
          id: string | null
          member_category: string | null
          member_type: string | null
          order_code: string | null
          order_id: string | null
          order_member_id: string | null
          order_status: string | null
          start_date: string | null
          status: string | null
          title: string | null
          tour_code: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'order_members_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_members_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders_invoice_summary'
            referencedColumns: ['order_id']
          },
        ]
      }
      my_tours: {
        Row: {
          cached_at: string | null
          chinese_name: string | null
          destination: string | null
          end_date: string | null
          english_name: string | null
          id: string | null
          identity: string | null
          itinerary_title: string | null
          member_type: string | null
          order_code: string | null
          order_status: string | null
          outbound_flight: Json | null
          return_flight: Json | null
          source_updated_at: string | null
          start_date: string | null
          status: string | null
          title: string | null
          tour_code: string | null
        }
        Insert: {
          cached_at?: string | null
          chinese_name?: string | null
          destination?: string | null
          end_date?: string | null
          english_name?: string | null
          id?: string | null
          identity?: string | null
          itinerary_title?: string | null
          member_type?: string | null
          order_code?: string | null
          order_status?: string | null
          outbound_flight?: Json | null
          return_flight?: Json | null
          source_updated_at?: string | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          tour_code?: string | null
        }
        Update: {
          cached_at?: string | null
          chinese_name?: string | null
          destination?: string | null
          end_date?: string | null
          english_name?: string | null
          id?: string | null
          identity?: string | null
          itinerary_title?: string | null
          member_type?: string | null
          order_code?: string | null
          order_status?: string | null
          outbound_flight?: Json | null
          return_flight?: Json | null
          source_updated_at?: string | null
          start_date?: string | null
          status?: string | null
          title?: string | null
          tour_code?: string | null
        }
        Relationships: []
      }
      orders_invoice_summary: {
        Row: {
          contact_person: string | null
          invoiceable_amount: number | null
          invoiced_amount: number | null
          order_id: string | null
          order_number: string | null
          paid_amount: number | null
          total_amount: number | null
          tour_id: string | null
          workspace_id: string | null
        }
        Insert: {
          contact_person?: string | null
          invoiceable_amount?: never
          invoiced_amount?: never
          order_id?: string | null
          order_number?: string | null
          paid_amount?: never
          total_amount?: number | null
          tour_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          contact_person?: string | null
          invoiceable_amount?: never
          invoiced_amount?: never
          order_id?: string | null
          order_number?: string | null
          paid_amount?: never
          total_amount?: number | null
          tour_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'orders_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_rooms_status: {
        Row: {
          assigned_count: number | null
          capacity: number | null
          display_order: number | null
          hotel_name: string | null
          id: string | null
          is_full: boolean | null
          night_number: number | null
          notes: string | null
          remaining_beds: number | null
          room_number: string | null
          room_type: string | null
          tour_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_rooms_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_rooms_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
      tour_tables_status: {
        Row: {
          assigned_count: number | null
          capacity: number | null
          day_number: number | null
          display_order: number | null
          id: string | null
          is_full: boolean | null
          meal_setting_id: string | null
          meal_type: string | null
          restaurant_name: string | null
          table_number: number | null
          tour_id: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_tables_meal_setting_id_fkey'
            columns: ['meal_setting_id']
            isOneToOne: false
            referencedRelation: 'tour_meal_settings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_tables_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_tables_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_tables_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      tour_vehicles_status: {
        Row: {
          assigned_count: number | null
          capacity: number | null
          display_order: number | null
          driver_name: string | null
          driver_phone: string | null
          id: string | null
          is_full: boolean | null
          license_plate: string | null
          notes: string | null
          remaining_seats: number | null
          tour_id: string | null
          vehicle_name: string | null
          vehicle_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tour_vehicles_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'my_erp_tours'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tour_vehicles_tour_id_fkey'
            columns: ['tour_id']
            isOneToOne: false
            referencedRelation: 'tours'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      add_employee_to_tour_conversation: {
        Args: { p_employee_id: string; p_role?: string; p_tour_id: string }
        Returns: undefined
      }
      auto_open_tour_conversations: { Args: never; Returns: number }
      auto_open_tour_conversations_with_logging: {
        Args: never
        Returns: undefined
      }
      can_manage_workspace: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      check_leader_schedule_conflict: {
        Args: {
          p_end_date: string
          p_exclude_id?: string
          p_leader_id: string
          p_start_date: string
        }
        Returns: boolean
      }
      check_my_tours_updates: {
        Args: { p_last_synced_at?: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      check_vehicle_schedule_conflict: {
        Args: {
          p_end_date: string
          p_exclude_id?: string
          p_start_date: string
          p_vehicle_id: string
        }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      confirm_quote_by_customer: {
        Args: {
          p_email?: string
          p_ip_address?: string
          p_name: string
          p_notes?: string
          p_phone?: string
          p_token: string
          p_user_agent?: string
        }
        Returns: Json
      }
      confirm_quote_by_staff: {
        Args: {
          p_notes?: string
          p_quote_id: string
          p_staff_id: string
          p_staff_name: string
        }
        Returns: Json
      }
      create_atomic_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category_id: string
          p_description: string
          p_transaction_date: string
          p_transaction_type: string
        }
        Returns: undefined
      }
      create_default_leave_types: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      ensure_traveler_profile: {
        Args: {
          p_avatar_url?: string
          p_email?: string
          p_full_name?: string
          p_user_id: string
        }
        Returns: string
      }
      generate_confirmation_token: { Args: never; Returns: string }
      generate_voucher_no: { Args: { p_workspace_id: string }; Returns: string }
      get_account_id_by_code: {
        Args: { p_code: string; p_workspace_id: string }
        Returns: string
      }
      get_cron_job_status: {
        Args: never
        Returns: {
          job_name: string
          last_run: string
          next_run: string
          schedule: string
          status: string
        }[]
      }
      get_current_employee_id: { Args: never; Returns: string }
      get_current_traveler_id: { Args: never; Returns: string }
      get_current_user_workspace: { Args: never; Returns: string }
      get_my_tour_details: { Args: { p_tour_code: string }; Returns: Json }
      get_or_create_direct_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_or_create_dm_channel: {
        Args: {
          p_user_1_id: string
          p_user_2_id: string
          p_workspace_id: string
        }
        Returns: {
          _deleted: boolean | null
          _needs_sync: boolean | null
          _synced_at: string | null
          archived_at: string | null
          channel_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          dm_target_id: string | null
          group_id: string | null
          id: string
          is_announcement: boolean
          is_archived: boolean | null
          is_company_wide: boolean | null
          is_favorite: boolean | null
          is_pinned: boolean | null
          name: string
          order: number | null
          scope: string | null
          tour_id: string | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          visibility: Database['public']['Enums']['channel_visibility'] | null
          workspace_id: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'channels'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_order_invoiceable_amount: {
        Args: { p_order_id: string }
        Returns: number
      }
      get_order_invoiced_amount: {
        Args: { p_order_id: string }
        Returns: number
      }
      get_person_workload: {
        Args: { person_name: string }
        Returns: {
          in_progress_tasks: number
          total_projects: number
          total_tasks: number
          urgent_tasks: number
        }[]
      }
      get_projects_overview: {
        Args: never
        Returns: {
          completed_projects: number
          in_progress_projects: number
          pending_projects: number
          total_projects: number
          urgent_projects: number
        }[]
      }
      get_tour_conversations: {
        Args: { p_workspace_id: string }
        Returns: {
          conversation_id: string
          conversation_type: string
          departure_date: string
          is_open: boolean
          last_message_at: string
          last_message_preview: string
          member_count: number
          open_at: string
          tour_code: string
          tour_id: string
          tour_name: string
          traveler_count: number
          unread_count: number
        }[]
      }
      get_tour_pnl: {
        Args: {
          p_workspace_id: string
          p_year_end: string
          p_year_start: string
        }
        Returns: {
          actual_cost: number
          actual_profit: number
          actual_revenue: number
          closing_date: string
          code: string
          cost_diff: number
          departure_date: string
          estimated_cost: number
          estimated_profit: number
          estimated_revenue: number
          id: string
          max_participants: number
          name: string
          return_date: string
          revenue_diff: number
          status: string
        }[]
      }
      get_unread_count: { Args: { p_conversation_id: string }; Returns: number }
      get_unread_counts_batch: {
        Args: { p_conversation_ids: string[] }
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      get_user_permission: {
        Args: { p_itinerary_id: string; p_user_id: string }
        Returns: string
      }
      get_user_project_ids: { Args: { uid: string }; Returns: string[] }
      get_user_workspace_id: { Args: never; Returns: string }
      has_permission: { Args: { permission_name: string }; Returns: boolean }
      increment_points: {
        Args: { customer_id_param: string; points_param: number }
        Returns: undefined
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { p_user_id: string }; Returns: boolean }
      is_employee: { Args: never; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_traveler: { Args: never; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      refresh_all_region_stats: { Args: never; Returns: undefined }
      refresh_traveler_tour_cache: {
        Args: { p_traveler_id?: string }
        Returns: number
      }
      revoke_quote_confirmation: {
        Args: {
          p_quote_id: string
          p_reason: string
          p_staff_id: string
          p_staff_name: string
        }
        Returns: Json
      }
      run_auto_open_now: {
        Args: never
        Returns: {
          executed_at: string
          opened_count: number
        }[]
      }
      run_invoice_reminder_now: {
        Args: never
        Returns: {
          executed_at: string
          sent_count: number
        }[]
      }
      seed_tenant_base_data: {
        Args: { source_workspace_id: string; target_workspace_id: string }
        Returns: undefined
      }
      send_daily_invoice_reminder: { Args: never; Returns: number }
      send_quote_confirmation: {
        Args: {
          p_expires_in_days?: number
          p_quote_id: string
          p_staff_id?: string
        }
        Returns: Json
      }
      send_tour_message: {
        Args: {
          p_attachments?: Json
          p_content: string
          p_conversation_id: string
          p_type?: string
        }
        Returns: string
      }
      set_current_workspace: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      sync_my_tours: { Args: never; Returns: Json }
      sync_passport_to_order_members: {
        Args: {
          p_birth_date?: string
          p_customer_id: string
          p_gender?: string
          p_id_number?: string
          p_passport_expiry?: string
          p_passport_image_url?: string
          p_passport_name?: string
          p_passport_number?: string
        }
        Returns: number
      }
      toggle_tour_conversation: {
        Args: {
          p_is_open: boolean
          p_send_welcome?: boolean
          p_tour_id: string
        }
        Returns: undefined
      }
      update_city_stats: { Args: { p_city_id: string }; Returns: undefined }
    }
    Enums: {
      accounting_event_status: 'posted' | 'reversed'
      accounting_event_type:
        | 'customer_receipt_posted'
        | 'supplier_payment_posted'
        | 'group_settlement_posted'
        | 'bonus_paid'
        | 'tax_paid'
        | 'manual_voucher'
      calendar_visibility: 'private' | 'workspace' | 'company_wide'
      channel_visibility: 'private' | 'public'
      confirmation_type: 'accommodation' | 'flight'
      file_category:
        | 'contract'
        | 'quote'
        | 'itinerary'
        | 'passport'
        | 'visa'
        | 'ticket'
        | 'voucher'
        | 'invoice'
        | 'insurance'
        | 'photo'
        | 'email_attachment'
        | 'other'
        | 'request'
        | 'cancellation'
        | 'confirmation'
      folder_type: 'root' | 'tour' | 'customer' | 'supplier' | 'template' | 'custom'
      subledger_type: 'customer' | 'supplier' | 'bank' | 'group' | 'employee'
      task_priority: 'low' | 'normal' | 'high' | 'critical'
      task_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
      verification_status: 'verified' | 'unverified' | 'rejected'
      voucher_status: 'draft' | 'posted' | 'reversed' | 'locked'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      accounting_event_status: ['posted', 'reversed'],
      accounting_event_type: [
        'customer_receipt_posted',
        'supplier_payment_posted',
        'group_settlement_posted',
        'bonus_paid',
        'tax_paid',
        'manual_voucher',
      ],
      calendar_visibility: ['private', 'workspace', 'company_wide'],
      channel_visibility: ['private', 'public'],
      confirmation_type: ['accommodation', 'flight'],
      file_category: [
        'contract',
        'quote',
        'itinerary',
        'passport',
        'visa',
        'ticket',
        'voucher',
        'invoice',
        'insurance',
        'photo',
        'email_attachment',
        'other',
        'request',
        'cancellation',
        'confirmation',
      ],
      folder_type: ['root', 'tour', 'customer', 'supplier', 'template', 'custom'],
      subledger_type: ['customer', 'supplier', 'bank', 'group', 'employee'],
      task_priority: ['low', 'normal', 'high', 'critical'],
      task_status: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      verification_status: ['verified', 'unverified', 'rejected'],
      voucher_status: ['draft', 'posted', 'reversed', 'locked'],
    },
  },
} as const
