export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          details: string | null
          district: string | null
          id: string
          is_default: boolean
          label: string
          landmark: string | null
          lat: number | null
          lng: number | null
          phone: string | null
          recipient_name: string | null
          user_id: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          details?: string | null
          district?: string | null
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          recipient_name?: string | null
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          details?: string | null
          district?: string | null
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          recipient_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          action: string
          created_at: string
          id: number
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_category: string | null
          event_label: string | null
          event_name: string
          event_value: number | null
          id: string
          metadata: Json | null
          page_url: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_category?: string | null
          event_label?: string | null
          event_name: string
          event_value?: number | null
          id?: string
          metadata?: Json | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_category?: string | null
          event_label?: string | null
          event_name?: string
          event_value?: number | null
          id?: string
          metadata?: Json | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      application_events: {
        Row: {
          actor_id: string | null
          application_id: string
          body: string | null
          created_at: string
          from_stage: string | null
          id: number
          internal: boolean
          kind: string
          to_stage: string | null
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          body?: string | null
          created_at?: string
          from_stage?: string | null
          id?: never
          internal?: boolean
          kind: string
          to_stage?: string | null
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          body?: string | null
          created_at?: string
          from_stage?: string | null
          id?: never
          internal?: boolean
          kind?: string
          to_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          ai_summary: Json | null
          answers: Json
          available_from: string | null
          cover_letter: string | null
          created_at: string
          cv_path: string | null
          expected_salary: number | null
          freelance_id: string
          id: string
          job_id: string
          knocked_out: boolean
          match_breakdown: Json
          match_score: number | null
          proposed_rate: number | null
          rating: number | null
          reject_reason: string | null
          stage: string
          stage_changed_at: string
          status: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          ai_summary?: Json | null
          answers?: Json
          available_from?: string | null
          cover_letter?: string | null
          created_at?: string
          cv_path?: string | null
          expected_salary?: number | null
          freelance_id: string
          id?: string
          job_id: string
          knocked_out?: boolean
          match_breakdown?: Json
          match_score?: number | null
          proposed_rate?: number | null
          rating?: number | null
          reject_reason?: string | null
          stage?: string
          stage_changed_at?: string
          status?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          ai_summary?: Json | null
          answers?: Json
          available_from?: string | null
          cover_letter?: string | null
          created_at?: string
          cv_path?: string | null
          expected_salary?: number | null
          freelance_id?: string
          id?: string
          job_id?: string
          knocked_out?: boolean
          match_breakdown?: Json
          match_score?: number | null
          proposed_rate?: number | null
          rating?: number | null
          reject_reason?: string | null
          stage?: string
          stage_changed_at?: string
          status?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          path: string | null
          row_counts: Json | null
          size_bytes: number | null
          started_at: string
          verified: boolean
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          path?: string | null
          row_counts?: Json | null
          size_bytes?: number | null
          started_at?: string
          verified?: boolean
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          path?: string | null
          row_counts?: Json | null
          size_bytes?: number | null
          started_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      banned_keywords: {
        Row: {
          keyword: string
          reason: string
          severity: string
        }
        Insert: {
          keyword: string
          reason: string
          severity: string
        }
        Update: {
          keyword?: string
          reason?: string
          severity?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          client_id: string
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          order_id: string | null
          provider_id: string
          service_id: string
          starts_at: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          ends_at: string
          id?: string
          notes?: string | null
          order_id?: string | null
          provider_id: string
          service_id: string
          starts_at: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          provider_id?: string
          service_id?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_metrics: {
        Row: {
          boost_id: string
          campaign_id: string | null
          clicks: number
          conversions: number
          created_at: string
          date: string
          id: string
          revenue_generated: number
          views: number
        }
        Insert: {
          boost_id: string
          campaign_id?: string | null
          clicks?: number
          conversions?: number
          created_at?: string
          date?: string
          id?: string
          revenue_generated?: number
          views?: number
        }
        Update: {
          boost_id?: string
          campaign_id?: string | null
          clicks?: number
          conversions?: number
          created_at?: string
          date?: string
          id?: string
          revenue_generated?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "boost_metrics_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "boosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      boosts: {
        Row: {
          boost_type: string
          campaign_id: string | null
          created_at: string
          creative_type: string | null
          creative_url: string | null
          description: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          period: string
          price_paid: number
          starts_at: string
          target_id: string | null
          target_name: string | null
          user_id: string
          zone_radius_km: number
        }
        Insert: {
          boost_type: string
          campaign_id?: string | null
          created_at?: string
          creative_type?: string | null
          creative_url?: string | null
          description?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          period: string
          price_paid: number
          starts_at?: string
          target_id?: string | null
          target_name?: string | null
          user_id: string
          zone_radius_km?: number
        }
        Update: {
          boost_type?: string
          campaign_id?: string | null
          created_at?: string
          creative_type?: string | null
          creative_url?: string | null
          description?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          period?: string
          price_paid?: number
          starts_at?: string
          target_id?: string | null
          target_name?: string | null
          user_id?: string
          zone_radius_km?: number
        }
        Relationships: [
          {
            foreignKeyName: "boosts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          boosts_count: number | null
          budget_spent: number
          budget_total: number
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          objective: string | null
          start_date: string | null
          status: string
          target_audience: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          boosts_count?: number | null
          budget_spent?: number
          budget_total?: number
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          objective?: string | null
          start_date?: string | null
          status?: string
          target_audience?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          boosts_count?: number | null
          budget_spent?: number
          budget_total?: number
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          objective?: string | null
          start_date?: string | null
          status?: string
          target_audience?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          quantity: number
          service_id: string | null
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          type: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          type: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          type?: string
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          created_at: string
          id: number
          message: string
          release: string | null
          session_id: string | null
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          message: string
          release?: string | null
          session_id?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          message?: string
          release?: string | null
          session_id?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          countries: string[]
          decimals: number
          is_pegged: boolean
          name: string
          symbol: string
          updated_at: string
          xof_per_unit: number
        }
        Insert: {
          code: string
          countries?: string[]
          decimals?: number
          is_pegged?: boolean
          name: string
          symbol: string
          updated_at?: string
          xof_per_unit: number
        }
        Update: {
          code?: string
          countries?: string[]
          decimals?: number
          is_pegged?: boolean
          name?: string
          symbol?: string
          updated_at?: string
          xof_per_unit?: number
        }
        Relationships: []
      }
      customs_rules: {
        Row: {
          apply_vat: boolean
          duty_rate: number
          fixed_fee: number
          from_zone: string
          id: string
          note: string | null
          priority: number
          to_country: string
        }
        Insert: {
          apply_vat?: boolean
          duty_rate?: number
          fixed_fee?: number
          from_zone: string
          id?: string
          note?: string | null
          priority?: number
          to_country: string
        }
        Update: {
          apply_vat?: boolean
          duty_rate?: number
          fixed_fee?: number
          from_zone?: string
          id?: string
          note?: string | null
          priority?: number
          to_country?: string
        }
        Relationships: []
      }
      delivery_requests: {
        Row: {
          accepted_at: string | null
          base_price: number
          buyer_id: string
          cancelled_at: string | null
          commission: number
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_location: Json | null
          distance_km: number
          driver_id: string | null
          id: string
          night_surcharge: boolean | null
          order_id: string
          picked_up_at: string | null
          pickup_address: string | null
          pickup_location: Json | null
          proof_code_verified: boolean
          proof_location: Json | null
          proof_photo_path: string | null
          proof_recipient_name: string | null
          proof_signature_path: string | null
          route_id: string | null
          route_position: number | null
          seller_id: string
          status: string
          surcharge_amount: number | null
          total_delivery_price: number
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          accepted_at?: string | null
          base_price?: number
          buyer_id: string
          cancelled_at?: string | null
          commission?: number
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_location?: Json | null
          distance_km?: number
          driver_id?: string | null
          id?: string
          night_surcharge?: boolean | null
          order_id: string
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_location?: Json | null
          proof_code_verified?: boolean
          proof_location?: Json | null
          proof_photo_path?: string | null
          proof_recipient_name?: string | null
          proof_signature_path?: string | null
          route_id?: string | null
          route_position?: number | null
          seller_id: string
          status?: string
          surcharge_amount?: number | null
          total_delivery_price?: number
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          accepted_at?: string | null
          base_price?: number
          buyer_id?: string
          cancelled_at?: string | null
          commission?: number
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_location?: Json | null
          distance_km?: number
          driver_id?: string | null
          id?: string
          night_surcharge?: boolean | null
          order_id?: string
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_location?: Json | null
          proof_code_verified?: boolean
          proof_location?: Json | null
          proof_photo_path?: string | null
          proof_recipient_name?: string | null
          proof_signature_path?: string | null
          route_id?: string | null
          route_position?: number | null
          seller_id?: string
          status?: string
          surcharge_amount?: number | null
          total_delivery_price?: number
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_route_fk"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          status: string
          total_km: number | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          status?: string
          total_km?: number | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          status?: string
          total_km?: number | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          base_fee: number
          city: string
          country: string
          created_at: string
          district: string | null
          eta_hours: number
          id: string
          is_active: boolean
        }
        Insert: {
          base_fee: number
          city: string
          country: string
          created_at?: string
          district?: string | null
          eta_hours?: number
          id?: string
          is_active?: boolean
        }
        Update: {
          base_fee?: number
          city?: string
          country?: string
          created_at?: string
          district?: string | null
          eta_hours?: number
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      dispute_events: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          content: string | null
          created_at: string
          dispute_id: string
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          dispute_id: string
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          dispute_id?: string
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_events_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          against_user: string
          created_at: string
          description: string | null
          id: string
          opened_by: string
          order_id: string | null
          reason: string
          refund_amount: number | null
          resolution: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          against_user: string
          created_at?: string
          description?: string | null
          id?: string
          opened_by: string
          order_id?: string | null
          reason: string
          refund_amount?: number | null
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          against_user?: string
          created_at?: string
          description?: string | null
          id?: string
          opened_by?: string
          order_id?: string | null
          reason?: string
          refund_amount?: number | null
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_contracts: {
        Row: {
          badge_generated_at: string | null
          badge_number: string | null
          confidentiality_commitment: boolean
          contract_version: string
          honesty_commitment: boolean
          id: string
          ip_address: string | null
          kyc_verified: boolean
          loyalty_commitment: boolean
          no_contact_on_packages: boolean
          oath_accepted: boolean
          signed_at: string
          user_id: string
        }
        Insert: {
          badge_generated_at?: string | null
          badge_number?: string | null
          confidentiality_commitment?: boolean
          contract_version?: string
          honesty_commitment?: boolean
          id?: string
          ip_address?: string | null
          kyc_verified?: boolean
          loyalty_commitment?: boolean
          no_contact_on_packages?: boolean
          oath_accepted?: boolean
          signed_at?: string
          user_id: string
        }
        Update: {
          badge_generated_at?: string | null
          badge_number?: string | null
          confidentiality_commitment?: boolean
          contract_version?: string
          honesty_commitment?: boolean
          id?: string
          ip_address?: string | null
          kyc_verified?: boolean
          loyalty_commitment?: boolean
          no_contact_on_packages?: boolean
          oath_accepted?: boolean
          signed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          average_rating: number | null
          badge: string | null
          commission_balance: number | null
          created_at: string
          id: string
          is_available: boolean | null
          license_number: string | null
          loyalty_points: number | null
          total_deliveries: number | null
          updated_at: string
          user_id: string
          vehicle_type: string
          zone: string
        }
        Insert: {
          average_rating?: number | null
          badge?: string | null
          commission_balance?: number | null
          created_at?: string
          id?: string
          is_available?: boolean | null
          license_number?: string | null
          loyalty_points?: number | null
          total_deliveries?: number | null
          updated_at?: string
          user_id: string
          vehicle_type?: string
          zone?: string
        }
        Update: {
          average_rating?: number | null
          badge?: string | null
          commission_balance?: number | null
          created_at?: string
          id?: string
          is_available?: boolean | null
          license_number?: string | null
          loyalty_points?: number | null
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string
          vehicle_type?: string
          zone?: string
        }
        Relationships: []
      }
      driver_ratings: {
        Row: {
          comment: string | null
          created_at: string
          delivery_id: string
          delivery_time: number
          driver_id: string
          id: string
          overall_score: number | null
          politeness: number
          product_condition: number
          rated_by: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery_id: string
          delivery_time: number
          driver_id: string
          id?: string
          overall_score?: number | null
          politeness: number
          product_condition: number
          rated_by: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery_id?: string
          delivery_time?: number
          driver_id?: string
          id?: string
          overall_score?: number | null
          politeness?: number
          product_condition?: number
          rated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_ratings_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_profiles: {
        Row: {
          about: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          logo_url: string | null
          sector: string | null
          size: string | null
          updated_at: string
          user_id: string
          verified: boolean
          website: string | null
        }
        Insert: {
          about?: string | null
          city?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          logo_url?: string | null
          sector?: string | null
          size?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          about?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          logo_url?: string | null
          sector?: string | null
          size?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      escrow_transactions: {
        Row: {
          created_at: string
          delivery_id: string | null
          driver_amount: number | null
          id: string
          order_id: string | null
          payer_id: string
          platform_commission: number | null
          released_at: string | null
          seller_amount: number | null
          status: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          driver_amount?: number | null
          id?: string
          order_id?: string | null
          payer_id: string
          platform_commission?: number | null
          released_at?: string | null
          seller_amount?: number | null
          status?: string
          total_amount: number
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          driver_amount?: number | null
          id?: string
          order_id?: string | null
          payer_id?: string
          platform_commission?: number | null
          released_at?: string | null
          seller_amount?: number | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          service_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          service_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          service_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string
          enabled: boolean
          key: string
          rollout_percent: number
          updated_at: string
        }
        Insert: {
          description: string
          enabled?: boolean
          key: string
          rollout_percent?: number
          updated_at?: string
        }
        Update: {
          description?: string
          enabled?: boolean
          key?: string
          rollout_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      fedapay_transactions: {
        Row: {
          amount: number
          checkout_id: string | null
          created_at: string
          credited_at: string | null
          currency: string
          fedapay_id: number | null
          id: string
          mode: string | null
          return_path: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_id?: string | null
          created_at?: string
          credited_at?: string | null
          currency?: string
          fedapay_id?: number | null
          id?: string
          mode?: string | null
          return_path?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_id?: string | null
          created_at?: string
          credited_at?: string | null
          currency?: string
          fedapay_id?: number | null
          id?: string
          mode?: string | null
          return_path?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fedapay_transactions_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "pending_checkouts"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      freelance_profiles: {
        Row: {
          alert_preferences: Json | null
          availability: string | null
          bio: string | null
          contract_types: string[]
          created_at: string
          cv_path: string | null
          cv_text: string | null
          cv_url: string | null
          education: string | null
          experience_years: number | null
          hourly_rate: number | null
          id: string
          interests: string[] | null
          languages: string[]
          location: string | null
          open_to_work: boolean
          photo_url: string | null
          portfolio_urls: string[] | null
          realizations: Json | null
          skills: string[] | null
          social_links: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_preferences?: Json | null
          availability?: string | null
          bio?: string | null
          contract_types?: string[]
          created_at?: string
          cv_path?: string | null
          cv_text?: string | null
          cv_url?: string | null
          education?: string | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          interests?: string[] | null
          languages?: string[]
          location?: string | null
          open_to_work?: boolean
          photo_url?: string | null
          portfolio_urls?: string[] | null
          realizations?: Json | null
          skills?: string[] | null
          social_links?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_preferences?: Json | null
          availability?: string | null
          bio?: string | null
          contract_types?: string[]
          created_at?: string
          cv_path?: string | null
          cv_text?: string | null
          cv_url?: string | null
          education?: string | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          interests?: string[] | null
          languages?: string[]
          location?: string | null
          open_to_work?: boolean
          photo_url?: string | null
          portfolio_urls?: string[] | null
          realizations?: Json | null
          skills?: string[] | null
          social_links?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_buy_participants: {
        Row: {
          amount_held: number
          created_at: string
          group_buy_id: string
          id: string
          order_id: string | null
          quantity: number
          shipping_address: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_held: number
          created_at?: string
          group_buy_id: string
          id?: string
          order_id?: string | null
          quantity: number
          shipping_address?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_held?: number
          created_at?: string
          group_buy_id?: string
          id?: string
          order_id?: string | null
          quantity?: number
          shipping_address?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_buy_participants_group_buy_id_fkey"
            columns: ["group_buy_id"]
            isOneToOne: false
            referencedRelation: "group_buys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buy_participants_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      group_buys: {
        Row: {
          created_at: string
          current_qty: number
          deadline: string
          group_price: number
          id: string
          product_id: string
          seller_id: string
          status: string
          target_qty: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          current_qty?: number
          deadline: string
          group_price: number
          id?: string
          product_id: string
          seller_id: string
          status?: string
          target_qty: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          current_qty?: number
          deadline?: string
          group_price?: number
          id?: string
          product_id?: string
          seller_id?: string
          status?: string
          target_qty?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_buys_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buys_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_answers: {
        Row: {
          created_at: string
          duration_s: number | null
          evaluation: Json | null
          id: string
          interview_id: string
          metrics: Json
          question: string
          question_id: string
          transcript: string | null
          video_path: string | null
        }
        Insert: {
          created_at?: string
          duration_s?: number | null
          evaluation?: Json | null
          id?: string
          interview_id: string
          metrics?: Json
          question: string
          question_id: string
          transcript?: string | null
          video_path?: string | null
        }
        Update: {
          created_at?: string
          duration_s?: number | null
          evaluation?: Json | null
          id?: string
          interview_id?: string
          metrics?: Json
          question?: string
          question_id?: string
          transcript?: string | null
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_answers_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          cancel_reason: string | null
          candidate_id: string
          completed_at: string | null
          consent_at: string | null
          created_at: string
          duration_min: number
          employer_id: string
          employer_notes: string | null
          expires_at: string | null
          external_url: string | null
          id: string
          job_id: string
          kind: string
          questions: Json
          report: Json | null
          room_code: string
          scheduled_at: string | null
          scorecard: Json | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          cancel_reason?: string | null
          candidate_id: string
          completed_at?: string | null
          consent_at?: string | null
          created_at?: string
          duration_min?: number
          employer_id: string
          employer_notes?: string | null
          expires_at?: string | null
          external_url?: string | null
          id?: string
          job_id: string
          kind: string
          questions?: Json
          report?: Json | null
          room_code?: string
          scheduled_at?: string | null
          scorecard?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          cancel_reason?: string | null
          candidate_id?: string
          completed_at?: string | null
          consent_at?: string | null
          created_at?: string
          duration_min?: number
          employer_id?: string
          employer_notes?: string | null
          expires_at?: string | null
          external_url?: string | null
          id?: string
          job_id?: string
          kind?: string
          questions?: Json
          report?: Json | null
          room_code?: string
          scheduled_at?: string | null
          scorecard?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          buyer_id: string
          id: string
          issued_at: string
          number: string
          order_id: string
          seller_id: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          amount: number
          buyer_id: string
          id?: string
          issued_at?: string
          number: string
          order_id: string
          seller_id: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          amount?: number
          buyer_id?: string
          id?: string
          issued_at?: string
          number?: string
          order_id?: string
          seller_id?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          ai_interview: boolean
          blind_review: boolean
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          company_name: string | null
          contract_type: string
          country: string | null
          created_at: string
          deadline: string | null
          description: string | null
          education_level: string | null
          employer_id: string
          experience_min: number
          id: string
          interview_questions: Json
          is_active: boolean | null
          job_type: string | null
          languages: string[]
          location: string | null
          nice_to_have: string[]
          openings: number
          pay_period: string
          remote_mode: string
          screening_questions: Json
          skill_weights: Json
          skills_required: string[] | null
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          ai_interview?: boolean
          blind_review?: boolean
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          company_name?: string | null
          contract_type?: string
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          education_level?: string | null
          employer_id: string
          experience_min?: number
          id?: string
          interview_questions?: Json
          is_active?: boolean | null
          job_type?: string | null
          languages?: string[]
          location?: string | null
          nice_to_have?: string[]
          openings?: number
          pay_period?: string
          remote_mode?: string
          screening_questions?: Json
          skill_weights?: Json
          skills_required?: string[] | null
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          ai_interview?: boolean
          blind_review?: boolean
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          company_name?: string | null
          contract_type?: string
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          education_level?: string | null
          employer_id?: string
          experience_min?: number
          id?: string
          interview_questions?: Json
          is_active?: boolean | null
          job_type?: string | null
          languages?: string[]
          location?: string | null
          nice_to_have?: string[]
          openings?: number
          pay_period?: string
          remote_mode?: string
          screening_questions?: Json
          skill_weights?: Json
          skills_required?: string[] | null
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          document_type: string
          document_url: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          document_type: string
          document_url: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          document_type?: string
          document_url?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          account: string
          created_at: string
          credit: number
          debit: number
          id: number
          txn_id: string
        }
        Insert: {
          account: string
          created_at?: string
          credit?: number
          debit?: number
          id?: never
          txn_id: string
        }
        Update: {
          account?: string
          created_at?: string
          credit?: number
          debit?: number
          id?: never
          txn_id?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          country: string
          doc_type: string
          id: string
          is_active: boolean
          published_at: string
          title: string
          version: string
        }
        Insert: {
          content: string
          country?: string
          doc_type: string
          id?: string
          is_active?: boolean
          published_at?: string
          title: string
          version: string
        }
        Update: {
          content?: string
          country?: string
          doc_type?: string
          id?: string
          is_active?: boolean
          published_at?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          level: string
          points: number
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          points?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          points?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      message_translations: {
        Row: {
          content: string
          created_at: string
          lang: string
          message_id: string
        }
        Insert: {
          content: string
          created_at?: string
          lang: string
          message_id: string
        }
        Update: {
          content?: string
          created_at?: string
          lang?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_translations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          location_data: Json | null
          message_type: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          location_data?: Json | null
          message_type?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          location_data?: Json | null
          message_type?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      moderation_flags: {
        Row: {
          created_at: string
          id: string
          reasons: Json
          reviewed_by: string | null
          severity: string
          source: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reasons?: Json
          reviewed_by?: string | null
          severity: string
          source: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reasons?: Json
          reviewed_by?: string | null
          severity?: string
          source?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          channel: string
          created_at: string
          detail: string | null
          id: number
          notification_id: string
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          detail?: string | null
          id?: never
          notification_id: string
          status: string
        }
        Update: {
          channel?: string
          created_at?: string
          detail?: string | null
          id?: never
          notification_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_codes: {
        Row: {
          attempts: number
          buyer_id: string
          code: string
          order_id: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          buyer_id: string
          code: string
          order_id: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          buyer_id?: string
          code?: string
          order_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_codes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery: string | null
          address_id: string | null
          buyer_id: string
          created_at: string
          delivery_fee_estimate: number | null
          delivery_location: Json | null
          delivery_status: string | null
          delivery_zone_id: string | null
          estimated_delivery: string | null
          fulfillment_method: string
          id: string
          notes: string | null
          payment_mode: string
          payment_status: string | null
          pickup_point_id: string | null
          product_id: string | null
          quantity: number
          seller_id: string
          service_id: string | null
          shipping_address: string | null
          source: string | null
          source_id: string | null
          status: string
          total_price: number
          tracking_number: string | null
          unit_price: number | null
          updated_at: string
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          actual_delivery?: string | null
          address_id?: string | null
          buyer_id: string
          created_at?: string
          delivery_fee_estimate?: number | null
          delivery_location?: Json | null
          delivery_status?: string | null
          delivery_zone_id?: string | null
          estimated_delivery?: string | null
          fulfillment_method?: string
          id?: string
          notes?: string | null
          payment_mode?: string
          payment_status?: string | null
          pickup_point_id?: string | null
          product_id?: string | null
          quantity?: number
          seller_id: string
          service_id?: string | null
          shipping_address?: string | null
          source?: string | null
          source_id?: string | null
          status?: string
          total_price: number
          tracking_number?: string | null
          unit_price?: number | null
          updated_at?: string
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          actual_delivery?: string | null
          address_id?: string | null
          buyer_id?: string
          created_at?: string
          delivery_fee_estimate?: number | null
          delivery_location?: Json | null
          delivery_status?: string | null
          delivery_zone_id?: string | null
          estimated_delivery?: string | null
          fulfillment_method?: string
          id?: string
          notes?: string | null
          payment_mode?: string
          payment_status?: string | null
          pickup_point_id?: string | null
          product_id?: string | null
          quantity?: number
          seller_id?: string
          service_id?: string | null
          shipping_address?: string | null
          source?: string | null
          source_id?: string | null
          status?: string
          total_price?: number
          tracking_number?: string | null
          unit_price?: number | null
          updated_at?: string
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_zone_fk"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pickup_point_fk"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          escrow_id: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          payer_id: string
          payment_method: string
          provider_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          escrow_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payer_id: string
          payment_method: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          escrow_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payer_id?: string
          payment_method?: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_checkouts: {
        Row: {
          common: Json
          created_at: string
          id: string
          items: Json
          result: Json | null
          status: string
          total: number
          user_id: string
        }
        Insert: {
          common?: Json
          created_at?: string
          id?: string
          items: Json
          result?: Json | null
          status?: string
          total: number
          user_id: string
        }
        Update: {
          common?: Json
          created_at?: string
          id?: string
          items?: Json
          result?: Json | null
          status?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      pickup_partner_applications: {
        Row: {
          address: string | null
          admin_notes: string | null
          business_type: string | null
          check_contract: boolean
          check_documents: boolean
          check_identity: boolean
          check_phone: boolean
          check_references: boolean
          check_site_visit: boolean
          check_training: boolean
          city: string | null
          commitments: Json
          company_name: string | null
          country: string | null
          created_at: string
          decided_at: string | null
          decision_reason: string | null
          district: string | null
          documents: Json
          email: string | null
          ground_floor_access: boolean | null
          has_cctv: boolean | null
          has_fire_extinguisher: boolean | null
          has_insurance: boolean | null
          has_internet: boolean | null
          has_secure_storage: boolean | null
          has_smartphone: boolean | null
          id: string
          info_request: string | null
          insurer_name: string | null
          landmark: string | null
          lat: number | null
          legal_form: string | null
          lng: number | null
          manager_id_number: string | null
          manager_id_type: string | null
          manager_name: string | null
          manager_role: string | null
          max_parcels: number | null
          motivation: string | null
          nif_number: string | null
          opening_hours: Json
          parking_nearby: boolean | null
          payout_account: string | null
          payout_method: string | null
          phone: string | null
          pickup_point_id: string | null
          premises_status: string | null
          rccm_number: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_notes: string | null
          staff_count: number | null
          status: string
          storage_area_m2: number | null
          submitted_at: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
          year_founded: number | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          business_type?: string | null
          check_contract?: boolean
          check_documents?: boolean
          check_identity?: boolean
          check_phone?: boolean
          check_references?: boolean
          check_site_visit?: boolean
          check_training?: boolean
          city?: string | null
          commitments?: Json
          company_name?: string | null
          country?: string | null
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          district?: string | null
          documents?: Json
          email?: string | null
          ground_floor_access?: boolean | null
          has_cctv?: boolean | null
          has_fire_extinguisher?: boolean | null
          has_insurance?: boolean | null
          has_internet?: boolean | null
          has_secure_storage?: boolean | null
          has_smartphone?: boolean | null
          id?: string
          info_request?: string | null
          insurer_name?: string | null
          landmark?: string | null
          lat?: number | null
          legal_form?: string | null
          lng?: number | null
          manager_id_number?: string | null
          manager_id_type?: string | null
          manager_name?: string | null
          manager_role?: string | null
          max_parcels?: number | null
          motivation?: string | null
          nif_number?: string | null
          opening_hours?: Json
          parking_nearby?: boolean | null
          payout_account?: string | null
          payout_method?: string | null
          phone?: string | null
          pickup_point_id?: string | null
          premises_status?: string | null
          rccm_number?: string | null
          reviewer_id?: string | null
          site_visit_at?: string | null
          site_visit_notes?: string | null
          staff_count?: number | null
          status?: string
          storage_area_m2?: number | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
          year_founded?: number | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          business_type?: string | null
          check_contract?: boolean
          check_documents?: boolean
          check_identity?: boolean
          check_phone?: boolean
          check_references?: boolean
          check_site_visit?: boolean
          check_training?: boolean
          city?: string | null
          commitments?: Json
          company_name?: string | null
          country?: string | null
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          district?: string | null
          documents?: Json
          email?: string | null
          ground_floor_access?: boolean | null
          has_cctv?: boolean | null
          has_fire_extinguisher?: boolean | null
          has_insurance?: boolean | null
          has_internet?: boolean | null
          has_secure_storage?: boolean | null
          has_smartphone?: boolean | null
          id?: string
          info_request?: string | null
          insurer_name?: string | null
          landmark?: string | null
          lat?: number | null
          legal_form?: string | null
          lng?: number | null
          manager_id_number?: string | null
          manager_id_type?: string | null
          manager_name?: string | null
          manager_role?: string | null
          max_parcels?: number | null
          motivation?: string | null
          nif_number?: string | null
          opening_hours?: Json
          parking_nearby?: boolean | null
          payout_account?: string | null
          payout_method?: string | null
          phone?: string | null
          pickup_point_id?: string | null
          premises_status?: string | null
          rccm_number?: string | null
          reviewer_id?: string | null
          site_visit_at?: string | null
          site_visit_notes?: string | null
          staff_count?: number | null
          status?: string
          storage_area_m2?: number | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
          year_founded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_partner_applications_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_points: {
        Row: {
          address: string
          city: string
          country: string
          created_at: string
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          opening_hours: string | null
          partner_id: string | null
          phone: string | null
        }
        Insert: {
          address: string
          city: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          opening_hours?: string | null
          partner_id?: string | null
          phone?: string | null
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          opening_hours?: string | null
          partner_id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          link_url: string | null
          media_type: string
          media_url: string
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          link_url?: string | null
          media_type?: string
          media_url: string
          sort_order?: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          link_url?: string | null
          media_type?: string
          media_url?: string
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      price_offers: {
        Row: {
          agreed_price: number | null
          buyer_id: string
          counter_price: number | null
          created_at: string
          expires_at: string
          id: string
          list_price: number
          message: string | null
          offered_price: number
          product_id: string
          quantity: number
          seller_id: string
          status: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          agreed_price?: number | null
          buyer_id: string
          counter_price?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          list_price: number
          message?: string | null
          offered_price: number
          product_id: string
          quantity?: number
          seller_id: string
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          agreed_price?: number | null
          buyer_id?: string
          counter_price?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          list_price?: number
          message?: string | null
          offered_price?: number
          product_id?: string
          quantity?: number
          seller_id?: string
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_offers_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_embeddings: {
        Row: {
          content_hash: string
          embedding: string
          product_id: string
          updated_at: string
        }
        Insert: {
          content_hash: string
          embedding: string
          product_id: string
          updated_at?: string
        }
        Update: {
          content_hash?: string
          embedding?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_tiers: {
        Row: {
          id: string
          min_qty: number
          product_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          min_qty: number
          product_id: string
          unit_price: number
        }
        Update: {
          id?: string
          min_qty?: number
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          options: Json
          price: number | null
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          options?: Json
          price?: number | null
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          options?: Json
          price?: number | null
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          id: number
          product_id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: never
          product_id: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: never
          product_id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          country: string
          created_at: string
          deleted_at: string | null
          description: string | null
          has_variants: boolean
          id: string
          images: string[] | null
          is_active: boolean | null
          location: string | null
          min_order_qty: number
          price: number
          seller_id: string
          stock: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          country?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          has_variants?: boolean
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location?: string | null
          min_order_qty?: number
          price: number
          seller_id: string
          stock?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          country?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          has_variants?: boolean
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location?: string | null
          min_order_qty?: number
          price?: number
          seller_id?: string
          stock?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          location: string | null
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          seller_id: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          seller_id: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          seller_id?: string
          used_count?: number
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          discount_type: string | null
          discount_value: number | null
          end_date: string
          event_tag: string | null
          id: string
          is_active: boolean | null
          min_quantity: number | null
          name: string
          start_date: string
          target_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          end_date: string
          event_tag?: string | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name: string
          start_date?: string
          target_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          end_date?: string
          event_tag?: string | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name?: string
          start_date?: string
          target_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          end_time: string
          id: string
          provider_id: string
          slot_minutes: number
          start_time: string
          weekday: number
        }
        Insert: {
          end_time: string
          id?: string
          provider_id: string
          slot_minutes?: number
          start_time: string
          weekday: number
        }
        Update: {
          end_time?: string
          id?: string
          provider_id?: string
          slot_minutes?: number
          start_time?: string
          weekday?: number
        }
        Relationships: []
      }
      provider_invoices: {
        Row: {
          client_address: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          discount: number
          due_date: string | null
          id: string
          issued_at: string
          items: Json
          notes: string | null
          number: string | null
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          provider_id: string
          quote_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          discount?: number
          due_date?: string | null
          id?: string
          issued_at?: string
          items: Json
          notes?: string | null
          number?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          provider_id: string
          quote_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          discount?: number
          due_date?: string | null
          id?: string
          issued_at?: string
          items?: Json
          notes?: string | null
          number?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          provider_id?: string
          quote_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_profiles: {
        Row: {
          about: string | null
          accepts_urgent: boolean
          certifications: Json
          cover_url: string | null
          headline: string | null
          is_available: boolean
          languages: string[]
          response_hours: number
          service_areas: string[]
          travel_fee: number | null
          travels: boolean
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          about?: string | null
          accepts_urgent?: boolean
          certifications?: Json
          cover_url?: string | null
          headline?: string | null
          is_available?: boolean
          languages?: string[]
          response_hours?: number
          service_areas?: string[]
          travel_fee?: number | null
          travels?: boolean
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          about?: string | null
          accepts_urgent?: boolean
          certifications?: Json
          cover_url?: string | null
          headline?: string | null
          is_available?: boolean
          languages?: string[]
          response_hours?: number
          service_areas?: string[]
          travel_fee?: number | null
          travels?: boolean
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_id: string
          created_at: string
          id: string
          items: Json
          notes: string | null
          order_id: string | null
          provider_id: string
          service_id: string | null
          status: string
          title: string
          total: number
          valid_until: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          items: Json
          notes?: string | null
          order_id?: string | null
          provider_id: string
          service_id?: string | null
          status?: string
          title: string
          total: number
          valid_until?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          provider_id?: string
          service_id?: string | null
          status?: string
          title?: string
          total?: number
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          hits: number
          key: string
          window_start: string
        }
        Insert: {
          hits?: number
          key: string
          window_start: string
        }
        Update: {
          hits?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      reconciliation_reports: {
        Row: {
          id: number
          issues: Json
          ok: boolean
          run_at: string
          totals: Json
        }
        Insert: {
          id?: never
          issues: Json
          ok: boolean
          run_at?: string
          totals: Json
        }
        Update: {
          id?: never
          issues?: Json
          ok?: boolean
          run_at?: string
          totals?: Json
        }
        Relationships: []
      }
      recruiter_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          name: string
          owner_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          name: string
          owner_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referred_reward: number
          referrer_id: string
          referrer_reward: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referred_reward?: number
          referrer_id: string
          referrer_reward?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referred_reward?: number
          referrer_id?: string
          referrer_reward?: number
          status?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_verified: boolean | null
          order_id: string | null
          product_id: string | null
          rating: number
          response: string | null
          reviewed_user_id: string | null
          reviewer_id: string
          service_id: string | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          order_id?: string | null
          product_id?: string | null
          rating: number
          response?: string | null
          reviewed_user_id?: string | null
          reviewer_id: string
          service_id?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          order_id?: string | null
          product_id?: string | null
          rating?: number
          response?: string | null
          reviewed_user_id?: string | null
          reviewer_id?: string
          service_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      role_conflicts: {
        Row: {
          reason: string
          role_a: Database["public"]["Enums"]["app_role"]
          role_b: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          reason: string
          role_a: Database["public"]["Enums"]["app_role"]
          role_b: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          reason?: string
          role_a?: Database["public"]["Enums"]["app_role"]
          role_b?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      saved_candidates: {
        Row: {
          candidate_id: string
          created_at: string
          employer_id: string
          note: string | null
          tags: string[]
        }
        Insert: {
          candidate_id: string
          created_at?: string
          employer_id: string
          note?: string | null
          tags?: string[]
        }
        Update: {
          candidate_id?: string
          created_at?: string
          employer_id?: string
          note?: string | null
          tags?: string[]
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          order_id: string | null
          product_id: string | null
          quantity: number
          saved_amount: number
          shipping_address: string | null
          status: string
          target_amount: number
          title: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          saved_amount?: number
          shipping_address?: string | null
          status?: string
          target_amount: number
          title: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          saved_amount?: number
          shipping_address?: string | null
          status?: string
          target_amount?: number
          title?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_goals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_goals_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string
          created_at: string
          finding_id: string
          finding_title: string | null
          id: string
          notes: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          finding_id: string
          finding_title?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          finding_id?: string
          finding_title?: string | null
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      service_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          order_id: string
          order_index: number
          status: string | null
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_id: string
          order_index?: number
          status?: string | null
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_id?: string
          order_index?: number
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_milestones_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string
          delivery_days: number
          description: string | null
          features: string[]
          id: string
          is_active: boolean
          name: string
          price: number
          revisions: number
          service_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_days?: number
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          name: string
          price: number
          revisions?: number
          service_id: string
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_days?: number
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          revisions?: number
          service_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          created_at: string
          delivery_days: number | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          price: number | null
          price_type: string | null
          provider_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          delivery_days?: number | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          price?: number | null
          price_type?: string | null
          provider_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          delivery_days?: number | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          price?: number | null
          price_type?: string | null
          provider_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_labels: {
        Row: {
          buyer_id: string
          created_at: string
          delivery_address: string | null
          delivery_instructions: string | null
          delivery_request_id: string | null
          id: string
          label_status: string
          order_id: string
          pickup_address: string | null
          pickup_instructions: string | null
          qr_token: string
          scanned_at: string | null
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          delivery_address?: string | null
          delivery_instructions?: string | null
          delivery_request_id?: string | null
          id?: string
          label_status?: string
          order_id: string
          pickup_address?: string | null
          pickup_instructions?: string | null
          qr_token?: string
          scanned_at?: string | null
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          delivery_address?: string | null
          delivery_instructions?: string | null
          delivery_request_id?: string | null
          id?: string
          label_status?: string
          order_id?: string
          pickup_address?: string | null
          pickup_instructions?: string | null
          qr_token?: string
          scanned_at?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_labels_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_labels_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          role: string
          shop_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          shop_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          shop_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          accepts_cod: boolean
          banner_url: string | null
          city: string | null
          country: string
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          opening_hours: Json
          owner_id: string
          quick_replies: Json
          slug: string
          store_pickup_address: string | null
          theme_color: string | null
          updated_at: string
          vacation_message: string | null
          vacation_mode: boolean
          vacation_until: string | null
          vat_number: string | null
        }
        Insert: {
          accepts_cod?: boolean
          banner_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          opening_hours?: Json
          owner_id: string
          quick_replies?: Json
          slug: string
          store_pickup_address?: string | null
          theme_color?: string | null
          updated_at?: string
          vacation_message?: string | null
          vacation_mode?: boolean
          vacation_until?: string | null
          vat_number?: string | null
        }
        Update: {
          accepts_cod?: boolean
          banner_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          opening_hours?: Json
          owner_id?: string
          quick_replies?: Json
          slug?: string
          store_pickup_address?: string | null
          theme_color?: string | null
          updated_at?: string
          vacation_message?: string | null
          vacation_mode?: boolean
          vacation_until?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      site_banners: {
        Row: {
          created_at: string
          cta_href: string | null
          cta_label: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          placement: string
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      status_checks: {
        Row: {
          checked_at: string
          component: string
          detail: string | null
          id: number
          latency_ms: number | null
          ok: boolean
        }
        Insert: {
          checked_at?: string
          component: string
          detail?: string | null
          id?: never
          latency_ms?: number | null
          ok: boolean
        }
        Update: {
          checked_at?: string
          component?: string
          detail?: string | null
          id?: never
          latency_ms?: number | null
          ok?: boolean
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          created_at: string
          id: string
          notified_at: string | null
          product_id: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notified_at?: string | null
          product_id: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notified_at?: string | null
          product_id?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          annual_price: number
          created_at: string
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          tier: string
        }
        Insert: {
          annual_price: number
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          tier: string
        }
        Update: {
          annual_price?: number
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          tier?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string | null
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          country: string
          name: string
          rate: number
          updated_at: string
        }
        Insert: {
          country: string
          name: string
          rate: number
          updated_at?: string
        }
        Update: {
          country?: string
          name?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          cookie_consent: Json | null
          created_at: string
          currency: string
          data_saver: boolean
          dismissed_buyer_onboarding: boolean
          dismissed_driver_onboarding: boolean
          dismissed_employer_onboarding: boolean
          dismissed_freelance_onboarding: boolean
          dismissed_provider_onboarding: boolean
          dismissed_seller_onboarding: boolean
          email_notifications: boolean
          id: string
          language: string
          theme: string | null
          updated_at: string
          user_id: string
          whatsapp_notifications: boolean
          whatsapp_number: string | null
        }
        Insert: {
          cookie_consent?: Json | null
          created_at?: string
          currency?: string
          data_saver?: boolean
          dismissed_buyer_onboarding?: boolean
          dismissed_driver_onboarding?: boolean
          dismissed_employer_onboarding?: boolean
          dismissed_freelance_onboarding?: boolean
          dismissed_provider_onboarding?: boolean
          dismissed_seller_onboarding?: boolean
          email_notifications?: boolean
          id?: string
          language?: string
          theme?: string | null
          updated_at?: string
          user_id: string
          whatsapp_notifications?: boolean
          whatsapp_number?: string | null
        }
        Update: {
          cookie_consent?: Json | null
          created_at?: string
          currency?: string
          data_saver?: boolean
          dismissed_buyer_onboarding?: boolean
          dismissed_driver_onboarding?: boolean
          dismissed_employer_onboarding?: boolean
          dismissed_freelance_onboarding?: boolean
          dismissed_provider_onboarding?: boolean
          dismissed_seller_onboarding?: boolean
          email_notifications?: boolean
          id?: string
          language?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_notifications?: boolean
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_risk_scores: {
        Row: {
          score: number
          signals: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          score: number
          signals: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          score?: number
          signals?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_role_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          company_name: string | null
          company_size: string | null
          created_at: string
          expires_at: string
          id: string
          location_type: string | null
          plan_id: string
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          expires_at: string
          id?: string
          location_type?: string | null
          plan_id: string
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          location_type?: string | null
          plan_id?: string
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_violations: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          evidence_url: string | null
          id: string
          order_id: string | null
          penalty_applied: string | null
          reported_by: string
          reviewed_at: string | null
          seller_id: string
          status: string
          violation_type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          evidence_url?: string | null
          id?: string
          order_id?: string | null
          penalty_applied?: string | null
          reported_by: string
          reviewed_at?: string | null
          seller_id: string
          status?: string
          violation_type?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          evidence_url?: string | null
          id?: string
          order_id?: string | null
          penalty_applied?: string | null
          reported_by?: string
          reviewed_at?: string | null
          seller_id?: string
          status?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_violations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          reference_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      driver_profiles_public: {
        Row: {
          average_rating: number | null
          badge: string | null
          created_at: string | null
          id: string | null
          is_available: boolean | null
          loyalty_points: number | null
          total_deliveries: number | null
          updated_at: string | null
          user_id: string | null
          vehicle_type: string | null
          zone: string | null
        }
        Insert: {
          average_rating?: number | null
          badge?: string | null
          created_at?: string | null
          id?: string | null
          is_available?: boolean | null
          loyalty_points?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Update: {
          average_rating?: number | null
          badge?: string | null
          created_at?: string | null
          id?: string | null
          is_available?: boolean | null
          loyalty_points?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      freelance_profiles_public: {
        Row: {
          availability: string | null
          bio: string | null
          created_at: string | null
          experience_years: number | null
          hourly_rate: number | null
          id: string | null
          photo_url: string | null
          portfolio_urls: string[] | null
          realizations: Json | null
          skills: string[] | null
          social_links: Json | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string | null
          photo_url?: string | null
          portfolio_urls?: string[] | null
          realizations?: Json | null
          skills?: string[] | null
          social_links?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string | null
          photo_url?: string | null
          portfolio_urls?: string[] | null
          realizations?: Json | null
          skills?: string[] | null
          social_links?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_verified: boolean | null
          location: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          location?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          location?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _finalize_checkout: { Args: { p_checkout_id: string }; Returns: Json }
      _place_order: { Args: { p: Json; p_buyer: string }; Returns: Json }
      _settle_group_buy: { Args: { p_id: string }; Returns: undefined }
      accept_delivery: { Args: { p_id: string }; Returns: Json }
      accept_quote: {
        Args: { p_address?: string; p_quote_id: string }
        Returns: Json
      }
      accept_shop_invite: { Args: { p_shop_id: string }; Returns: undefined }
      add_application_note: {
        Args: { p_body: string; p_id: string }
        Returns: undefined
      }
      admin_find_user: { Args: { p_email: string }; Returns: string }
      admin_integration_urls: { Args: never; Returns: Json }
      admin_risk_list: {
        Args: { p_min?: number }
        Returns: {
          email: string
          full_name: string
          score: number
          signals: Json
          updated_at: string
          user_id: string
        }[]
      }
      apply_referral: { Args: { p_referral_code: string }; Returns: boolean }
      apply_to_job: {
        Args: {
          p_answers?: Json
          p_available_from?: string
          p_cover_letter: string
          p_cv_path?: string
          p_expected_salary?: number
          p_job_id: string
          p_proposed_rate?: number
        }
        Returns: Json
      }
      assign_own_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      auto_release_escrow: { Args: never; Returns: number }
      award_loyalty_points: {
        Args: {
          p_description?: string
          p_points: number
          p_reference_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      book_slot: {
        Args: {
          p_address?: string
          p_notes?: string
          p_service_id: string
          p_starts_at: string
        }
        Returns: Json
      }
      bulk_import_products: { Args: { p_rows: Json }; Returns: Json }
      calculate_delivery_price:
        | {
            Args: { p_distance_km: number; p_is_night?: boolean }
            Returns: {
              base_price: number
              commission: number
              surcharge: number
              total: number
            }[]
          }
        | {
            Args: {
              p_distance_km: number
              p_is_night?: boolean
              p_vehicle_type?: string
            }
            Returns: {
              base_price: number
              commission: number
              surcharge: number
              total: number
            }[]
          }
      call_internal_function: {
        Args: { p_body?: Json; p_fn: string }
        Returns: number
      }
      call_notifications_cron: { Args: { p_action: string }; Returns: number }
      can_manage_seller: { Args: { p_seller: string }; Returns: boolean }
      cancel_booking: { Args: { p_booking_id: string }; Returns: undefined }
      cancel_interview: {
        Args: { p_id: string; p_reason?: string }
        Returns: undefined
      }
      cancel_savings: { Args: { p_goal_id: string }; Returns: undefined }
      check_boost_target: {
        Args: { p_target: string; p_type: string }
        Returns: undefined
      }
      compute_match: {
        Args: {
          p_answers: Json
          p_cv_text: string
          p_exp: number
          p_job: Database["public"]["Tables"]["jobs"]["Row"]
          p_langs: string[]
          p_location: string
          p_skills: string[]
        }
        Returns: Json
      }
      compute_user_risk: { Args: { p_user: string }; Returns: Json }
      confirm_handover: {
        Args: { p_code: string; p_order_id: string }
        Returns: Json
      }
      confirm_order_reception: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      contribute_savings: {
        Args: { p_amount: number; p_goal_id: string }
        Returns: Json
      }
      create_delivery_route: {
        Args: { p_ordered: string[]; p_total_km?: number }
        Returns: string
      }
      create_group_buy: {
        Args: {
          p_days?: number
          p_group_price: number
          p_product_id: string
          p_target_qty: number
          p_variant_id?: string
        }
        Returns: string
      }
      create_pending_checkout: {
        Args: { p_common?: Json; p_items: Json }
        Returns: Json
      }
      create_savings_goal: {
        Args: {
          p_deadline?: string
          p_product_id: string
          p_quantity?: number
          p_shipping_address?: string
          p_variant_id?: string
        }
        Returns: string
      }
      create_secure_order: {
        Args: {
          p_notes?: string
          p_payment_method?: string
          p_phone?: string
          p_product_id?: string
          p_promo_code?: string
          p_quantity?: number
          p_service_id?: string
          p_shipping_address?: string
        }
        Returns: Json
      }
      credit_wallet_from_fedapay: {
        Args: { p_fedapay_id: number; p_mode?: string; p_status: string }
        Returns: Json
      }
      deactivate_own_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: Json
      }
      debit_wallet:
        | { Args: { p_amount: number }; Returns: undefined }
        | {
            Args: {
              p_amount: number
              p_payment_method?: string
              p_phone?: string
            }
            Returns: undefined
          }
      default_interview_questions: {
        Args: { p_skills: string[]; p_title: string }
        Returns: Json
      }
      estimate_customs: {
        Args: { p_amount: number; p_from: string; p_to: string }
        Returns: Json
      }
      export_my_data: { Args: never; Returns: Json }
      f_unaccent: { Args: { "": string }; Returns: string }
      find_delivery_zone: {
        Args: { p_city: string; p_country: string; p_district?: string }
        Returns: {
          base_fee: number
          city: string
          country: string
          created_at: string
          district: string | null
          eta_hours: number
          id: string
          is_active: boolean
        }
        SetofOptions: {
          from: "*"
          to: "delivery_zones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finish_ai_interview: { Args: { p_id: string }; Returns: undefined }
      format_address: {
        Args: { a: Database["public"]["Tables"]["addresses"]["Row"] }
        Returns: string
      }
      generate_driver_badge: {
        Args: { p_contract_id: string }
        Returns: string
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_available_slots: {
        Args: { p_date: string; p_service_id: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      get_buyer_summary: { Args: never; Returns: Json }
      get_driver_stats: { Args: { p_days?: number }; Returns: Json }
      get_invoice: { Args: { p_order_id: string }; Returns: Json }
      get_job_pipeline: {
        Args: { p_job_id: string }
        Returns: {
          ai_summary: Json
          answers: Json
          available_from: string
          avatar_url: string
          cover_letter: string
          created_at: string
          cv_path: string
          email: string
          expected_salary: number
          experience_years: number
          freelance_id: string
          full_name: string
          hourly_rate: number
          id: string
          interviews: number
          knocked_out: boolean
          languages: string[]
          location: string
          match_breakdown: Json
          match_score: number
          notes: number
          phone: string
          portfolio_urls: string[]
          proposed_rate: number
          rating: number
          reject_reason: string
          skills: string[]
          stage: string
          stage_changed_at: string
          tags: string[]
          title: string
        }[]
      }
      get_or_create_referral_code: { Args: never; Returns: string }
      get_platform_revenue: { Args: { p_days?: number }; Returns: Json }
      get_provider_clients: {
        Args: never
        Returns: {
          avatar_url: string
          bookings: number
          client_id: string
          full_name: string
          last_at: string
          orders: number
          phone: string
          quotes: number
          spent: number
        }[]
      }
      get_provider_stats: { Args: { p_days?: number }; Returns: Json }
      get_recommendations: {
        Args: { p_exclude?: string; p_limit?: number }
        Returns: {
          category_id: string | null
          country: string
          created_at: string
          deleted_at: string | null
          description: string | null
          has_variants: boolean
          id: string
          images: string[] | null
          is_active: boolean | null
          location: string | null
          min_order_qty: number
          price: number
          seller_id: string
          stock: number | null
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_recruiting_stats: { Args: never; Returns: Json }
      get_seller_stats: {
        Args: { p_days?: number; p_seller?: string }
        Returns: Json
      }
      get_space_options: { Args: never; Returns: Json }
      get_space_progress: { Args: { p_space: string }; Returns: Json }
      get_sponsored: {
        Args: { p_kind?: string; p_limit?: number }
        Returns: {
          boost_type: string
          creative_type: string
          creative_url: string
          description: string
          href: string
          id: string
          target_id: string
          title: string
        }[]
      }
      get_status_summary: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hit_rate_limit: {
        Args: { p_key: string; p_max: number; p_window: number }
        Returns: boolean
      }
      increment_boost_metric: {
        Args: { p_boost_id: string; p_metric?: string }
        Returns: undefined
      }
      interview_participant: { Args: { p_folder: string }; Returns: boolean }
      interview_upload_allowed: { Args: { p_folder: string }; Returns: boolean }
      invite_shop_member: {
        Args: { p_email: string; p_role?: string }
        Returns: Json
      }
      invoice_from_quote: { Args: { p_quote_id: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_pickup_partner: { Args: { p_point: string }; Returns: boolean }
      join_group_buy: {
        Args: { p_id: string; p_quantity?: number; p_shipping_address?: string }
        Returns: Json
      }
      join_interview_room: { Args: { p_id: string }; Returns: Json }
      leave_group_buy: { Args: { p_id: string }; Returns: undefined }
      ledger_counterparty: { Args: { p_type: string }; Returns: string }
      log_client_error: {
        Args: {
          p_message: string
          p_release?: string
          p_session?: string
          p_stack?: string
          p_url?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      make_offer: {
        Args: {
          p_message?: string
          p_price: number
          p_product_id: string
          p_quantity?: number
          p_variant_id?: string
        }
        Returns: Json
      }
      mark_parcel_at_pickup: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      match_for: {
        Args: { p_answers: Json; p_job_id: string; p_user_id: string }
        Returns: Json
      }
      move_applications: {
        Args: {
          p_ids: string[]
          p_message?: string
          p_reason?: string
          p_stage: string
        }
        Returns: number
      }
      my_applications: {
        Args: never
        Returns: {
          company: string
          created_at: string
          id: string
          is_active: boolean
          job_id: string
          job_title: string
          last_message: string
          match_score: number
          next_interview: string
          pending_ai_interview: string
          proposed_rate: number
          stage: string
          stage_changed_at: string
          stage_label: string
        }[]
      }
      my_interviews: {
        Args: never
        Returns: {
          answered: number
          company: string
          completed_at: string
          consent_at: string
          duration_min: number
          expires_at: string
          external_url: string
          id: string
          job_id: string
          job_title: string
          kind: string
          questions_count: number
          scheduled_at: string
          status: string
        }[]
      }
      norm_tags: { Args: { p: string[] }; Returns: string[] }
      order_service_package: {
        Args: { p_address?: string; p_notes?: string; p_package_id: string }
        Returns: Json
      }
      place_order: { Args: { p: Json }; Returns: Json }
      process_group_buys: { Args: never; Returns: number }
      purchase_boost: {
        Args: {
          p_boost_type: string
          p_campaign_id?: string
          p_creative_type?: string
          p_creative_url?: string
          p_description?: string
          p_period: string
          p_target_id: string
          p_target_name: string
          p_zone_radius_km: number
        }
        Returns: string
      }
      quote_product_price: {
        Args: { p_product_id: string; p_quantity: number; p_variant_id: string }
        Returns: number
      }
      rate_guard: {
        Args: { p_action: string; p_max: number; p_window: number }
        Returns: undefined
      }
      recommended_jobs: {
        Args: { p_limit?: number }
        Returns: {
          applied: boolean
          breakdown: Json
          budget_max: number
          budget_min: number
          company: string
          contract_type: string
          created_at: string
          deadline: string
          id: string
          location: string
          pay_period: string
          remote_mode: string
          saved: boolean
          score: number
          skills_required: string[]
          title: string
        }[]
      }
      record_job_view: { Args: { p_job_id: string }; Returns: undefined }
      refresh_risk_scores: { Args: never; Returns: number }
      register_driver: {
        Args: {
          p_bio?: string
          p_license?: string
          p_phone?: string
          p_vehicle: string
          p_zone: string
        }
        Returns: Json
      }
      reject_quote: { Args: { p_quote_id: string }; Returns: undefined }
      require_space: {
        Args: { p_roles: Database["public"]["Enums"]["app_role"][] }
        Returns: undefined
      }
      rescore_job: { Args: { p_job_id: string }; Returns: number }
      respond_offer: {
        Args: { p_action: string; p_counter_price?: number; p_offer_id: string }
        Returns: Json
      }
      review_partner_application: {
        Args: {
          p_action: string
          p_id: string
          p_message?: string
          p_visit_at?: string
        }
        Returns: Json
      }
      roles_conflict: {
        Args: {
          a: Database["public"]["Enums"]["app_role"]
          b: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      run_reconciliation: { Args: never; Returns: Json }
      save_interview_answer: {
        Args: {
          p_duration: number
          p_id: string
          p_metrics: Json
          p_question_id: string
          p_transcript: string
          p_video_path: string
        }
        Returns: undefined
      }
      save_interview_scorecard: {
        Args: {
          p_complete?: boolean
          p_id: string
          p_notes?: string
          p_scorecard: Json
        }
        Returns: undefined
      }
      scan_shipping_label: { Args: { p_qr_token: string }; Returns: Json }
      schedule_interview: {
        Args: {
          p_application_id: string
          p_duration?: number
          p_expires_days?: number
          p_external_url?: string
          p_kind: string
          p_message?: string
          p_questions?: Json
          p_scheduled_at?: string
        }
        Returns: string
      }
      search_products: {
        Args: {
          p_category_id?: string
          p_location?: string
          p_max_price?: number
          p_min_price?: number
          p_page?: number
          p_per_page?: number
          p_query?: string
          p_sort_by?: string
        }
        Returns: {
          category_id: string
          created_at: string
          description: string
          id: string
          images: string[]
          is_active: boolean
          location: string
          price: number
          rank: number
          seller_id: string
          stock: number
          title: string
        }[]
      }
      search_services: {
        Args: {
          p_category_id?: string
          p_max_price?: number
          p_min_price?: number
          p_page?: number
          p_per_page?: number
          p_query?: string
          p_sort_by?: string
        }
        Returns: {
          category_id: string
          created_at: string
          delivery_days: number
          description: string
          id: string
          images: string[]
          is_active: boolean
          price: number
          price_type: string
          provider_id: string
          rank: number
          title: string
        }[]
      }
      search_talent: {
        Args: {
          p_limit?: number
          p_location?: string
          p_min_exp?: number
          p_q?: string
          p_skills?: string[]
        }
        Returns: {
          availability: string
          avatar_url: string
          experience_years: number
          full_name: string
          hourly_rate: number
          languages: string[]
          location: string
          matched: number
          saved: boolean
          skills: string[]
          title: string
          user_id: string
        }[]
      }
      semantic_search_products: {
        Args: {
          p_count?: number
          p_embedding: string
          p_min_similarity?: number
        }
        Returns: {
          id: string
          images: string[]
          location: string
          price: number
          seller_id: string
          similarity: number
          title: string
        }[]
      }
      send_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      send_quote: {
        Args: {
          p_client_id: string
          p_items: Json
          p_notes?: string
          p_service_id?: string
          p_title: string
          p_valid_days?: number
        }
        Returns: string
      }
      space_cooldown: { Args: never; Returns: string }
      space_label: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      space_limit: { Args: never; Returns: number }
      space_ok: {
        Args: {
          p_roles: Database["public"]["Enums"]["app_role"][]
          p_user: string
        }
        Returns: boolean
      }
      stage_label: { Args: { p_stage: string }; Returns: string }
      start_ai_interview: {
        Args: { p_consent: boolean; p_id: string }
        Returns: Json
      }
      submit_delivery_proof: {
        Args: {
          p_code?: string
          p_delivery_id: string
          p_lat?: number
          p_lng?: number
          p_photo_path: string
          p_recipient?: string
          p_signature_path?: string
        }
        Returns: Json
      }
      submit_partner_application: { Args: { p_id: string }; Returns: Json }
      track_product_view: {
        Args: { p_product_id: string; p_session?: string }
        Returns: undefined
      }
      update_shop_member_role: {
        Args: { p_member_id: string; p_role: string }
        Returns: undefined
      }
      validate_and_use_promo: {
        Args: { p_code: string; p_order_amount: number }
        Returns: Json
      }
      verify_admin_access: { Args: never; Returns: boolean }
      verify_cron_secret: { Args: { p_secret: string }; Returns: boolean }
      verify_ussd_key: { Args: { p_key: string }; Returns: boolean }
      withdraw_partner_application: {
        Args: { p_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "buyer"
        | "seller"
        | "provider"
        | "freelance"
        | "employer"
        | "driver"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "buyer",
        "seller",
        "provider",
        "freelance",
        "employer",
        "driver",
      ],
    },
  },
} as const

