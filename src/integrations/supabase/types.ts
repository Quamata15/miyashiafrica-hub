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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          freelance_id: string
          id: string
          job_id: string
          proposed_rate: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          freelance_id: string
          id?: string
          job_id: string
          proposed_rate?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          freelance_id?: string
          id?: string
          job_id?: string
          proposed_rate?: number | null
          status?: string | null
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
          seller_id: string
          status: string
          surcharge_amount: number | null
          total_delivery_price: number
          updated_at: string
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
          seller_id: string
          status?: string
          surcharge_amount?: number | null
          total_delivery_price?: number
          updated_at?: string
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
          seller_id?: string
          status?: string
          surcharge_amount?: number | null
          total_delivery_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      freelance_profiles: {
        Row: {
          availability: string | null
          created_at: string
          experience_years: number | null
          hourly_rate: number | null
          id: string
          portfolio_urls: string[] | null
          skills: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          portfolio_urls?: string[] | null
          skills?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          portfolio_urls?: string[] | null
          skills?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          employer_id: string
          id: string
          is_active: boolean | null
          job_type: string | null
          skills_required: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          employer_id: string
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          skills_required?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          employer_id?: string
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          skills_required?: string[] | null
          title?: string
          updated_at?: string
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
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
      orders: {
        Row: {
          actual_delivery: string | null
          buyer_id: string
          created_at: string
          delivery_location: Json | null
          delivery_status: string | null
          estimated_delivery: string | null
          id: string
          notes: string | null
          payment_status: string | null
          product_id: string | null
          quantity: number
          seller_id: string
          service_id: string | null
          shipping_address: string | null
          status: string
          total_price: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery?: string | null
          buyer_id: string
          created_at?: string
          delivery_location?: Json | null
          delivery_status?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          product_id?: string | null
          quantity?: number
          seller_id: string
          service_id?: string | null
          shipping_address?: string | null
          status?: string
          total_price: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery?: string | null
          buyer_id?: string
          created_at?: string
          delivery_location?: Json | null
          delivery_status?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          product_id?: string | null
          quantity?: number
          seller_id?: string
          service_id?: string | null
          shipping_address?: string | null
          status?: string
          total_price?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
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
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          location: string | null
          price: number
          seller_id: string
          stock: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location?: string | null
          price: number
          seller_id: string
          stock?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location?: string | null
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
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_verified: boolean | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_delivery_price: {
        Args: { p_distance_km: number; p_is_night?: boolean }
        Returns: {
          base_price: number
          commission: number
          surcharge: number
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
