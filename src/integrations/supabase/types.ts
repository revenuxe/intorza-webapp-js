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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      quotation_plan_projects: {
        Row: { id: string; user_id: string; quotation_id: string | null; files: Json; analysis: Json; brief: Json | null; estimate: Json | null; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; quotation_id?: string | null; files?: Json; analysis: Json; brief?: Json | null; estimate?: Json | null; created_at?: string; updated_at?: string }
        Update: { quotation_id?: string | null; files?: Json; analysis?: Json; brief?: Json | null; estimate?: Json | null; updated_at?: string }
        Relationships: []
      }
      quotation_approved_rates: {
        Row: { id: string; user_id: string; product_name: string; specification: string; rate: number; unit: string; currency: string; location: string; source_url: string | null; inclusions: string; verified_at: string; active: boolean }
        Insert: { id?: string; user_id: string; product_name: string; specification?: string; rate: number; unit: string; currency?: string; location?: string; source_url?: string | null; inclusions?: string; verified_at?: string; active?: boolean }
        Update: { product_name?: string; specification?: string; rate?: number; unit?: string; currency?: string; location?: string; source_url?: string | null; inclusions?: string; verified_at?: string; active?: boolean }
        Relationships: []
      }
      attendance: {
        Row: {
          clock_in: string
          clock_in_location: Json | null
          clock_out: string | null
          clock_out_location: Json | null
          created_at: string
          id: string
          notes: string | null
          team_member_id: string
        }
        Insert: {
          clock_in?: string
          clock_in_location?: Json | null
          clock_out?: string | null
          clock_out_location?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          team_member_id: string
        }
        Update: {
          clock_in?: string
          clock_in_location?: Json | null
          clock_out?: string | null
          clock_out_location?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_detail_templates: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          country_code: string | null
          created_at: string
          id: string
          ifsc_code: string | null
          is_default: boolean | null
          qr_code_url: string | null
          template_name: string
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          ifsc_code?: string | null
          is_default?: boolean | null
          qr_code_url?: string | null
          template_name: string
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          ifsc_code?: string | null
          is_default?: boolean | null
          qr_code_url?: string | null
          template_name?: string
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          feedback_type: string | null
          id: string
          message: string | null
          rating: number
          trigger_action: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type?: string | null
          id?: string
          message?: string | null
          rating: number
          trigger_action: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string | null
          id?: string
          message?: string | null
          rating?: number
          trigger_action?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_size: number | null
          filename: string
          height: number | null
          id: string
          image_url: string
          is_favorite: boolean | null
          tags: string[] | null
          title: string | null
          updated_at: string
          usage_count: number | null
          user_id: string
          width: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          filename: string
          height?: number | null
          id?: string
          image_url: string
          is_favorite?: boolean | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
          width?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          filename?: string
          height?: number | null
          id?: string
          image_url?: string
          is_favorite?: boolean | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          notes: string | null
          paid_amount: number | null
          project_name: string
          quotation_id: string | null
          remaining_amount: number | null
          status: string | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          notes?: string | null
          paid_amount?: number | null
          project_name: string
          quotation_id?: string | null
          remaining_amount?: number | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          notes?: string | null
          paid_amount?: number | null
          project_name?: string
          quotation_id?: string | null
          remaining_amount?: number | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      item_usage_patterns: {
        Row: {
          category: string | null
          country_code: string | null
          created_at: string
          default_rate: number | null
          id: string
          last_used_at: string | null
          preferred_rate: number | null
          product_details: string | null
          product_name: string
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          country_code?: string | null
          created_at?: string
          default_rate?: number | null
          id?: string
          last_used_at?: string | null
          preferred_rate?: number | null
          product_details?: string | null
          product_name: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          country_code?: string | null
          created_at?: string
          default_rate?: number | null
          id?: string
          last_used_at?: string | null
          preferred_rate?: number | null
          product_details?: string | null
          product_name?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_usage_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_usage_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_logs: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          event_type: string
          id: string
          provider: string
          provider_event_id: string | null
          raw_payload: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type: string
          id?: string
          provider?: string
          provider_event_id?: string | null
          raw_payload?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type?: string
          id?: string
          provider?: string
          provider_event_id?: string | null
          raw_payload?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_templates: {
        Row: {
          country_code: string | null
          created_at: string
          id: string
          is_default: boolean | null
          stages: Json
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          stages?: Json
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          stages?: Json
          template_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          action_count: number | null
          address: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_ifsc_code: string | null
          bank_name: string | null
          brand_colors: Json | null
          company_name: string | null
          country_code: string | null
          country_name: string | null
          created_at: string | null
          currency_code: string | null
          currency_symbol: string | null
          date_format: string | null
          email: string | null
          full_name: string | null
          gstin: string | null
          hero_image_url: string | null
          id: string
          invoice_terms_conditions: Json | null
          is_pro: boolean | null
          last_feedback_at: string | null
          locale: string | null
          logo_url: string | null
          measurement_system: string | null
          number_format: string | null
          org_code: string | null
          payment_provider: string | null
          payment_qr_url: string | null
          payment_stages: Json | null
          payment_status: string | null
          pdf_body_font: string | null
          pdf_heading_font: string | null
          phone: string | null
          pro_expiry: string | null
          pro_plan: string | null
          pro_since: string | null
          professional_advantages: string | null
          promo_code: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          signature_url: string | null
          tax_label: string | null
          terms_conditions: Json | null
          timezone: string | null
          updated_at: string | null
          upi_id: string | null
        }
        Insert: {
          action_count?: number | null
          address?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          brand_colors?: Json | null
          company_name?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          date_format?: string | null
          email?: string | null
          full_name?: string | null
          gstin?: string | null
          hero_image_url?: string | null
          id: string
          invoice_terms_conditions?: Json | null
          is_pro?: boolean | null
          last_feedback_at?: string | null
          locale?: string | null
          logo_url?: string | null
          measurement_system?: string | null
          number_format?: string | null
          org_code?: string | null
          payment_provider?: string | null
          payment_qr_url?: string | null
          payment_stages?: Json | null
          payment_status?: string | null
          pdf_body_font?: string | null
          pdf_heading_font?: string | null
          phone?: string | null
          pro_expiry?: string | null
          pro_plan?: string | null
          pro_since?: string | null
          professional_advantages?: string | null
          promo_code?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          signature_url?: string | null
          tax_label?: string | null
          terms_conditions?: Json | null
          timezone?: string | null
          updated_at?: string | null
          upi_id?: string | null
        }
        Update: {
          action_count?: number | null
          address?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          brand_colors?: Json | null
          company_name?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          date_format?: string | null
          email?: string | null
          full_name?: string | null
          gstin?: string | null
          hero_image_url?: string | null
          id?: string
          invoice_terms_conditions?: Json | null
          is_pro?: boolean | null
          last_feedback_at?: string | null
          locale?: string | null
          logo_url?: string | null
          measurement_system?: string | null
          number_format?: string | null
          org_code?: string | null
          payment_provider?: string | null
          payment_qr_url?: string | null
          payment_stages?: Json | null
          payment_status?: string | null
          pdf_body_font?: string | null
          pdf_heading_font?: string | null
          phone?: string | null
          pro_expiry?: string | null
          pro_plan?: string | null
          pro_since?: string | null
          professional_advantages?: string | null
          promo_code?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          signature_url?: string | null
          tax_label?: string | null
          terms_conditions?: Json | null
          timezone?: string | null
          updated_at?: string | null
          upi_id?: string | null
        }
        Relationships: []
      }
      quotation_item_images: {
        Row: {
          created_at: string
          gallery_image_id: string
          id: string
          quotation_item_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          gallery_image_id: string
          id?: string
          quotation_item_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          gallery_image_id?: string
          id?: string
          quotation_item_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_item_images_gallery_image_id_fkey"
            columns: ["gallery_image_id"]
            isOneToOne: false
            referencedRelation: "gallery_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_item_images_quotation_item_id_fkey"
            columns: ["quotation_item_id"]
            isOneToOne: false
            referencedRelation: "quotation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          amount: number | null
          created_at: string | null
          depth: string | null
          height_ft: number | null
          id: string
          notes: string | null
          product_details: string | null
          product_name: string
          rate_per_sft: number | null
          section_id: string
          sft_area: number | null
          side: string | null
          sort_order: number
          width_ft: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          depth?: string | null
          height_ft?: number | null
          id?: string
          notes?: string | null
          product_details?: string | null
          product_name: string
          rate_per_sft?: number | null
          section_id: string
          sft_area?: number | null
          side?: string | null
          sort_order?: number
          width_ft?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          depth?: string | null
          height_ft?: number | null
          id?: string
          notes?: string | null
          product_details?: string | null
          product_name?: string
          rate_per_sft?: number | null
          section_id?: string
          sft_area?: number | null
          side?: string | null
          sort_order?: number
          width_ft?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "quotation_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_preferences: {
        Row: {
          created_at: string
          default_discount_percentage: number | null
          default_gst_enabled: boolean | null
          default_gst_rate: string | null
          default_place_of_project: string | null
          default_project_type: string | null
          default_quotation_valid_days: number | null
          default_social_media_discount_enabled: boolean | null
          default_social_media_discount_rate: number | null
          default_warranty: string | null
          id: string
          last_discount_percentage: number | null
          last_gst_enabled: boolean | null
          last_gst_rate: string | null
          last_place_of_project: string | null
          last_project_type: string | null
          last_social_media_discount_enabled: boolean | null
          last_social_media_discount_rate: number | null
          last_warranty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_discount_percentage?: number | null
          default_gst_enabled?: boolean | null
          default_gst_rate?: string | null
          default_place_of_project?: string | null
          default_project_type?: string | null
          default_quotation_valid_days?: number | null
          default_social_media_discount_enabled?: boolean | null
          default_social_media_discount_rate?: number | null
          default_warranty?: string | null
          id?: string
          last_discount_percentage?: number | null
          last_gst_enabled?: boolean | null
          last_gst_rate?: string | null
          last_place_of_project?: string | null
          last_project_type?: string | null
          last_social_media_discount_enabled?: boolean | null
          last_social_media_discount_rate?: number | null
          last_warranty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_discount_percentage?: number | null
          default_gst_enabled?: boolean | null
          default_gst_rate?: string | null
          default_place_of_project?: string | null
          default_project_type?: string | null
          default_quotation_valid_days?: number | null
          default_social_media_discount_enabled?: boolean | null
          default_social_media_discount_rate?: number | null
          default_warranty?: string | null
          id?: string
          last_discount_percentage?: number | null
          last_gst_enabled?: boolean | null
          last_gst_rate?: string | null
          last_place_of_project?: string | null
          last_project_type?: string | null
          last_social_media_discount_enabled?: boolean | null
          last_social_media_discount_rate?: number | null
          last_warranty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_sections: {
        Row: {
          created_at: string | null
          id: string
          quotation_id: string
          section_name: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          quotation_id: string
          section_name: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          quotation_id?: string
          section_name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_sections_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          sections: Json
          template_name: string
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          sections?: Json
          template_name: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          sections?: Json
          template_name?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          client_address: string | null
          client_id: string | null
          client_name: string
          created_at: string | null
          date_of_proposal: string | null
          discount_amount: number | null
          grand_total: number | null
          gst_amount: number | null
          gst_enabled: boolean | null
          gst_percentage: number | null
          id: string
          notes: string | null
          place_of_project: string | null
          project_deadline: string | null
          project_name: string
          project_type: string | null
          quotation_number: string
          quotation_title: string | null
          status: string | null
          subtotal: number | null
          updated_at: string | null
          user_id: string
          valid_till: string | null
          warranty: string | null
        }
        Insert: {
          client_address?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string | null
          date_of_proposal?: string | null
          discount_amount?: number | null
          grand_total?: number | null
          gst_amount?: number | null
          gst_enabled?: boolean | null
          gst_percentage?: number | null
          id?: string
          notes?: string | null
          place_of_project?: string | null
          project_deadline?: string | null
          project_name: string
          project_type?: string | null
          quotation_number: string
          quotation_title?: string | null
          status?: string | null
          subtotal?: number | null
          updated_at?: string | null
          user_id: string
          valid_till?: string | null
          warranty?: string | null
        }
        Update: {
          client_address?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          date_of_proposal?: string | null
          discount_amount?: number | null
          grand_total?: number | null
          gst_amount?: number | null
          gst_enabled?: boolean | null
          gst_percentage?: number | null
          id?: string
          notes?: string | null
          place_of_project?: string | null
          project_deadline?: string | null
          project_name?: string
          project_type?: string | null
          quotation_number?: string
          quotation_title?: string | null
          status?: string | null
          subtotal?: number | null
          updated_at?: string | null
          user_id?: string
          valid_till?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      room_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          room_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          room_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_photos_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "site_measurement_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      section_templates: {
        Row: {
          category: string
          country_code: string | null
          created_at: string
          id: string
          is_default: boolean | null
          items: Json
          template_name: string
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string
          country_code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          items?: Json
          template_name: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string
          country_code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          items?: Json
          template_name?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_measurement_projects: {
        Row: {
          assigned_to: string | null
          client_name: string
          created_at: string
          id: string
          photo_count: number | null
          quotation_id: string | null
          room_count: number | null
          site_location: string | null
          status: string
          total_area: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          client_name: string
          created_at?: string
          id?: string
          photo_count?: number | null
          quotation_id?: string | null
          room_count?: number | null
          site_location?: string | null
          status?: string
          total_area?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          client_name?: string
          created_at?: string
          id?: string
          photo_count?: number | null
          quotation_id?: string | null
          room_count?: number | null
          site_location?: string | null
          status?: string
          total_area?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_measurement_projects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_measurement_projects_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_measurement_rooms: {
        Row: {
          area_sqft: number | null
          created_at: string
          final_amount: number | null
          height_ft: number | null
          id: string
          length_ft: number
          lump_sum_amount: number | null
          notes: string | null
          pricing_mode: string | null
          project_id: string
          quantity: number | null
          rate_per_sqft: number | null
          rate_per_unit: number | null
          room_name: string | null
          room_type: string
          sort_order: number | null
          updated_at: string
          width_ft: number
        }
        Insert: {
          area_sqft?: number | null
          created_at?: string
          final_amount?: number | null
          height_ft?: number | null
          id?: string
          length_ft?: number
          lump_sum_amount?: number | null
          notes?: string | null
          pricing_mode?: string | null
          project_id: string
          quantity?: number | null
          rate_per_sqft?: number | null
          rate_per_unit?: number | null
          room_name?: string | null
          room_type: string
          sort_order?: number | null
          updated_at?: string
          width_ft?: number
        }
        Update: {
          area_sqft?: number | null
          created_at?: string
          final_amount?: number | null
          height_ft?: number | null
          id?: string
          length_ft?: number
          lump_sum_amount?: number | null
          notes?: string | null
          pricing_mode?: string | null
          project_id?: string
          quantity?: number | null
          rate_per_sqft?: number | null
          rate_per_unit?: number | null
          room_name?: string | null
          room_type?: string
          sort_order?: number | null
          updated_at?: string
          width_ft?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_measurement_rooms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "site_measurement_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          actor: string | null
          created_at: string
          event: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          event: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          event?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          quotation_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          quotation_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          quotation_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_requests: {
        Row: {
          company_id: string
          created_at: string
          docs_request_note: string | null
          email: string
          id: string
          name: string
          phone: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string | null
          work_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          docs_request_note?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          work_type?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          docs_request_note?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          company_id: string
          created_at: string
          daily_rate: number | null
          email: string
          id: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["team_member_status"]
          updated_at: string
          user_id: string | null
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          daily_rate?: number | null
          email: string
          id?: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          updated_at?: string
          user_id?: string | null
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          daily_rate?: number | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          updated_at?: string
          user_id?: string | null
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: [
          {
            foreignKeyName: "team_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_project_assignments: {
        Row: {
          assigned_at: string
          id: string
          notes: string | null
          quotation_id: string | null
          team_member_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          notes?: string | null
          quotation_id?: string | null
          team_member_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          notes?: string | null
          quotation_id?: string | null
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_project_assignments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_project_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_templates: {
        Row: {
          content: Json
          country_code: string | null
          created_at: string
          id: string
          is_default: boolean | null
          is_enabled: boolean
          template_name: string
          template_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          country_code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean
          template_name: string
          template_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          country_code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean
          template_name?: string
          template_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warranty_templates: {
        Row: {
          content: string
          country_code: string | null
          created_at: string
          id: string
          is_default: boolean | null
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          country_code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          country_code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          template_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      companies_public: {
        Row: {
          company_name: string | null
          country_name: string | null
          org_code: string | null
          id: string | null
        }
        Insert: {
          company_name?: string | null
          country_name?: string | null
          org_code?: string | null
          id?: string | null
        }
        Update: {
          company_name?: string | null
          country_name?: string | null
          org_code?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      submit_pending_team_join: { Args: never; Returns: string | null }
      save_quotation: {
        Args: { p_id: string | null; p_payload: Json }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_pro_user: { Args: { _user_id: string }; Returns: boolean }
      respond_to_quotation: {
        Args: { p_action: string; p_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      team_member_status: "active" | "inactive" | "on_leave"
      work_type:
        | "carpenter"
        | "labour"
        | "plumber"
        | "electrician"
        | "painter"
        | "mason"
        | "welder"
        | "supervisor"
        | "other"
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
      app_role: ["admin", "user"],
      team_member_status: ["active", "inactive", "on_leave"],
      work_type: [
        "carpenter",
        "labour",
        "plumber",
        "electrician",
        "painter",
        "mason",
        "welder",
        "supervisor",
        "other",
      ],
    },
  },
} as const
