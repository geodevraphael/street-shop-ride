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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          created_at: string
          id: string
          label: string
          lat: number
          lng: number
          notes: string | null
          street: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          lat: number
          lng: number
          notes?: string | null
          street?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          lat?: number
          lng?: number
          notes?: string | null
          street?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      courier_staff: {
        Row: {
          created_at: string
          id: string
          office: string | null
          role: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          office?: string | null
          role?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          office?: string | null
          role?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_staff_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "courier_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_vendors: {
        Row: {
          active: boolean
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          pricing_notes: string | null
          regions_served: string[]
        }
        Insert: {
          active?: boolean
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          pricing_notes?: string | null
          regions_served?: string[]
        }
        Update: {
          active?: boolean
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          pricing_notes?: string | null
          regions_served?: string[]
        }
        Relationships: []
      }
      delivery_offers: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          order_id: string
          responded_at: string | null
          rider_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          responded_at?: string | null
          rider_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          responded_at?: string | null
          rider_id?: string
          status?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid: boolean
          paid_at: string | null
          period_end: string
          period_start: string
          subscription_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          period_end: string
          period_start: string
          subscription_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          period_end?: string
          period_start?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price: number
          product_id: string
          qty: number
          selected_attributes: Json
        }
        Insert: {
          id?: string
          order_id: string
          price?: number
          product_id: string
          qty?: number
          selected_attributes?: Json
        }
        Update: {
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          qty?: number
          selected_attributes?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_offer_id: string | null
          address_id: string | null
          client_id: string
          courier_office_drop: string | null
          courier_office_pickup: string | null
          courier_tracking_ref: string | null
          courier_vendor_id: string | null
          created_at: string
          delivery_fee: number
          delivery_fee_locked: boolean
          delivery_mode: string
          distance_km: number | null
          eta_min: number | null
          id: string
          notes: string | null
          payment_confirmed_at: string | null
          payment_proof_url: string | null
          payment_ref: string | null
          payment_submitted_at: string | null
          rider_id: string | null
          shop_id: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
        }
        Insert: {
          accepted_offer_id?: string | null
          address_id?: string | null
          client_id: string
          courier_office_drop?: string | null
          courier_office_pickup?: string | null
          courier_tracking_ref?: string | null
          courier_vendor_id?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_fee_locked?: boolean
          delivery_mode?: string
          distance_km?: number | null
          eta_min?: number | null
          id?: string
          notes?: string | null
          payment_confirmed_at?: string | null
          payment_proof_url?: string | null
          payment_ref?: string | null
          payment_submitted_at?: string | null
          rider_id?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
        }
        Update: {
          accepted_offer_id?: string | null
          address_id?: string | null
          client_id?: string
          courier_office_drop?: string | null
          courier_office_pickup?: string | null
          courier_tracking_ref?: string | null
          courier_vendor_id?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_fee_locked?: boolean
          delivery_mode?: string
          distance_km?: number | null
          eta_min?: number | null
          id?: string
          notes?: string | null
          payment_confirmed_at?: string | null
          payment_proof_url?: string | null
          payment_ref?: string | null
          payment_submitted_at?: string | null
          rider_id?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
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
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          attributes: Json
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_food: boolean
          name: string
          price: number
          shop_id: string
          stock: number
          variants: Json
        }
        Insert: {
          active?: boolean
          attributes?: Json
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_food?: boolean
          name: string
          price?: number
          shop_id: string
          stock?: number
          variants?: Json
        }
        Update: {
          active?: boolean
          attributes?: Json
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_food?: boolean
          name?: string
          price?: number
          shop_id?: string
          stock?: number
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          payout_phone: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          payout_phone?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          payout_phone?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          amount: number
          created_at: string
          details: Json | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_phone: string | null
          reward_type: Database["public"]["Enums"]["reward_type"]
          status: Database["public"]["Enums"]["reward_status"]
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          details?: Json | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_phone?: string | null
          reward_type: Database["public"]["Enums"]["reward_type"]
          status?: Database["public"]["Enums"]["reward_status"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          details?: Json | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_phone?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"]
          status?: Database["public"]["Enums"]["reward_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          qualified: boolean
          qualified_at: string | null
          referred_role: Database["public"]["Enums"]["app_role"]
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          qualified?: boolean
          qualified_at?: string | null
          referred_role: Database["public"]["Enums"]["app_role"]
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          qualified?: boolean
          qualified_at?: string | null
          referred_role?: Database["public"]["Enums"]["app_role"]
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          geojson: Json | null
          id: string
          level: Database["public"]["Enums"]["region_level"]
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          geojson?: Json | null
          id?: string
          level: Database["public"]["Enums"]["region_level"]
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          geojson?: Json | null
          id?: string
          level?: Database["public"]["Enums"]["region_level"]
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: []
      }
      riders: {
        Row: {
          available: boolean
          created_at: string
          current_lat: number | null
          current_lng: number | null
          deliveries_count: number
          full_name: string | null
          id: string
          id_photo_url: string | null
          id_type: Database["public"]["Enums"]["id_doc_type"] | null
          license_verified: boolean
          plate: string | null
          rating: number | null
          selfie_url: string | null
          subscription_active: boolean
          user_id: string
          vehicle_photo_url: string | null
        }
        Insert: {
          available?: boolean
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          deliveries_count?: number
          full_name?: string | null
          id?: string
          id_photo_url?: string | null
          id_type?: Database["public"]["Enums"]["id_doc_type"] | null
          license_verified?: boolean
          plate?: string | null
          rating?: number | null
          selfie_url?: string | null
          subscription_active?: boolean
          user_id: string
          vehicle_photo_url?: string | null
        }
        Update: {
          available?: boolean
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          deliveries_count?: number
          full_name?: string | null
          id?: string
          id_photo_url?: string | null
          id_type?: Database["public"]["Enums"]["id_doc_type"] | null
          license_verified?: boolean
          plate?: string | null
          rating?: number | null
          selfie_url?: string | null
          subscription_active?: boolean
          user_id?: string
          vehicle_photo_url?: string | null
        }
        Relationships: []
      }
      seller_documents: {
        Row: {
          created_at: string
          id: string
          id_photo_url: string | null
          id_type: Database["public"]["Enums"]["id_doc_type"]
          selfie_url: string | null
          shop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_photo_url?: string | null
          id_type: Database["public"]["Enums"]["id_doc_type"]
          selfie_url?: string | null
          shop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          id_photo_url?: string | null
          id_type?: Database["public"]["Enums"]["id_doc_type"]
          selfie_url?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_documents_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          lat: number | null
          lipa_number: string | null
          lng: number | null
          name: string
          owner_id: string
          qr_code_url: string | null
          rating: number | null
          sales_count: number
          street: string | null
          subscription_active: boolean
          verified: boolean
          ward_id: string | null
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lipa_number?: string | null
          lng?: number | null
          name: string
          owner_id: string
          qr_code_url?: string | null
          rating?: number | null
          sales_count?: number
          street?: string | null
          subscription_active?: boolean
          verified?: boolean
          ward_id?: string | null
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lipa_number?: string | null
          lng?: number | null
          name?: string
          owner_id?: string
          qr_code_url?: string | null
          rating?: number | null
          sales_count?: number
          street?: string | null
          subscription_active?: boolean
          verified?: boolean
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          active: boolean
          id: string
          last_invoice_at: string | null
          monthly_amount: number
          role: Database["public"]["Enums"]["app_role"]
          started_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          last_invoice_at?: string | null
          monthly_amount: number
          role: Database["public"]["Enums"]["app_role"]
          started_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          id?: string
          last_invoice_at?: string | null
          monthly_amount?: number
          role?: Database["public"]["Enums"]["app_role"]
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      category_counts: {
        Args: never
        Returns: {
          category: string
          count: number
        }[]
      }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_courier_staff: { Args: { _vendor_id: string }; Returns: boolean }
      referrals_enabled: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "client" | "seller" | "rider" | "admin" | "support"
      id_doc_type:
        | "national_id"
        | "passport"
        | "driving_licence"
        | "business_permit"
      order_status:
        | "placed"
        | "accepted"
        | "payment_submitted"
        | "payment_confirmed"
        | "rider_assigned"
        | "picked_up"
        | "delivered"
        | "completed"
        | "cancelled"
        | "courier_dropped"
        | "courier_in_transit"
        | "courier_arrived"
      region_level:
        | "region"
        | "county"
        | "subcounty"
        | "ward"
        | "village"
        | "district"
        | "street"
      report_target: "seller" | "rider"
      reward_status: "pending" | "approved" | "paid" | "applied"
      reward_type: "cash_payout" | "subscription_discount" | "boda_discount"
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
      app_role: ["client", "seller", "rider", "admin", "support"],
      id_doc_type: [
        "national_id",
        "passport",
        "driving_licence",
        "business_permit",
      ],
      order_status: [
        "placed",
        "accepted",
        "payment_submitted",
        "payment_confirmed",
        "rider_assigned",
        "picked_up",
        "delivered",
        "completed",
        "cancelled",
        "courier_dropped",
        "courier_in_transit",
        "courier_arrived",
      ],
      region_level: [
        "region",
        "county",
        "subcounty",
        "ward",
        "village",
        "district",
        "street",
      ],
      report_target: ["seller", "rider"],
      reward_status: ["pending", "approved", "paid", "applied"],
      reward_type: ["cash_payout", "subscription_discount", "boda_discount"],
    },
  },
} as const
