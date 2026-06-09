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
      activities: {
        Row: {
          body: string | null
          case_id: string | null
          company_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          opportunity_id: string | null
          status: Database["public"]["Enums"]["activity_status"]
          subject: string
          tenant_id: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          body?: string | null
          case_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          opportunity_id?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          subject: string
          tenant_id: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          body?: string | null
          case_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          opportunity_id?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          subject?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_case_id_tenant_id_fkey"
            columns: ["case_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "activities_company_id_tenant_id_fkey"
            columns: ["company_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "activities_contact_id_tenant_id_fkey"
            columns: ["contact_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_tenant_id_fkey"
            columns: ["opportunity_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["audit_actor_type"]
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json
          occurred_at: string
          request_id: string | null
          source: string
          subject_id: string | null
          subject_type: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["audit_actor_type"]
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          request_id?: string | null
          source?: string
          subject_id?: string | null
          subject_type?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["audit_actor_type"]
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          request_id?: string | null
          source?: string
          subject_id?: string | null
          subject_type?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      case_sequences: {
        Row: {
          last_seq: number
          tenant_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          tenant_id: string
          year: number
        }
        Update: {
          last_seq?: number
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          case_number: string
          closed_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          origin: Database["public"]["Enums"]["case_origin"]
          owner_id: string | null
          priority: Database["public"]["Enums"]["case_priority"]
          resolved_at: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["case_status"]
          subject: string
          tenant_id: string
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          case_number: string
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          origin?: Database["public"]["Enums"]["case_origin"]
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          subject: string
          tenant_id: string
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          case_number?: string
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          origin?: Database["public"]["Enums"]["case_origin"]
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          subject?: string
          tenant_id?: string
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_company_id_tenant_id_fkey"
            columns: ["company_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "cases_contact_id_tenant_id_fkey"
            columns: ["contact_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          industry: string | null
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          status: Database["public"]["Enums"]["crm_record_status"]
          tax_id: string | null
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["crm_record_status"]
          tax_id?: string | null
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["crm_record_status"]
          tax_id?: string | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string
          department: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["crm_record_status"]
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["crm_record_status"]
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["crm_record_status"]
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_tenant_id_fkey"
            columns: ["company_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          created_at: string
          default_enabled: boolean
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          default_enabled?: boolean
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          default_enabled?: boolean
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      forecast_snapshots: {
        Row: {
          avg_deal_size: number | null
          closed_lost_revenue: number
          closed_won_revenue: number
          created_at: string
          created_by: string | null
          expected_revenue: number
          id: string
          lost_count: number
          open_count: number
          period_label: string
          period_type: Database["public"]["Enums"]["forecast_period_type"]
          pipeline_coverage: number | null
          snapshot_date: string
          tenant_id: string
          weighted_revenue: number
          win_rate: number
          won_count: number
        }
        Insert: {
          avg_deal_size?: number | null
          closed_lost_revenue?: number
          closed_won_revenue?: number
          created_at?: string
          created_by?: string | null
          expected_revenue?: number
          id?: string
          lost_count?: number
          open_count?: number
          period_label: string
          period_type: Database["public"]["Enums"]["forecast_period_type"]
          pipeline_coverage?: number | null
          snapshot_date?: string
          tenant_id: string
          weighted_revenue?: number
          win_rate?: number
          won_count?: number
        }
        Update: {
          avg_deal_size?: number | null
          closed_lost_revenue?: number
          closed_won_revenue?: number
          created_at?: string
          created_by?: string | null
          expected_revenue?: number
          id?: string
          lost_count?: number
          open_count?: number
          period_label?: string
          period_type?: Database["public"]["Enums"]["forecast_period_type"]
          pipeline_coverage?: number | null
          snapshot_date?: string
          tenant_id?: string
          weighted_revenue?: number
          win_rate?: number
          won_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forecast_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_permission_sets: {
        Row: {
          created_at: string
          membership_id: string
          permission_set_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          membership_id: string
          permission_set_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          membership_id?: string
          permission_set_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_permission_sets_membership_id_tenant_id_fkey"
            columns: ["membership_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_memberships"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "membership_permission_sets_permission_set_id_tenant_id_fkey"
            columns: ["permission_set_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "permission_sets"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      membership_roles: {
        Row: {
          created_at: string
          membership_id: string
          role_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          membership_id: string
          role_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          membership_id?: string
          role_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_roles_membership_id_tenant_id_fkey"
            columns: ["membership_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_memberships"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "membership_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          business_type: Database["public"]["Enums"]["opportunity_business_type"]
          company_id: string
          contact_id: string
          created_at: string
          description: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          name: string
          owner_id: string | null
          probability: number
          status: Database["public"]["Enums"]["opportunity_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          business_type: Database["public"]["Enums"]["opportunity_business_type"]
          company_id: string
          contact_id: string
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          probability?: number
          status?: Database["public"]["Enums"]["opportunity_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          business_type?: Database["public"]["Enums"]["opportunity_business_type"]
          company_id?: string
          contact_id?: string
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          probability?: number
          status?: Database["public"]["Enums"]["opportunity_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_tenant_id_fkey"
            columns: ["company_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_tenant_id_fkey"
            columns: ["contact_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_set_permissions: {
        Row: {
          permission_id: string
          permission_set_id: string
          tenant_id: string
        }
        Insert: {
          permission_id: string
          permission_set_id: string
          tenant_id: string
        }
        Update: {
          permission_id?: string
          permission_set_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_set_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_set_permissions_permission_set_id_tenant_id_fkey"
            columns: ["permission_set_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "permission_sets"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      permission_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_sets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      platform_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      platform_user_roles: {
        Row: {
          created_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "platform_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_book_entries: {
        Row: {
          active: boolean
          created_at: string
          id: string
          price_book_id: string
          product_id: string
          tenant_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          price_book_id: string
          product_id: string
          tenant_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          price_book_id?: string
          product_id?: string
          tenant_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_book_entries_price_book_id_tenant_id_fkey"
            columns: ["price_book_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "price_books"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "price_book_entries_product_id_tenant_id_fkey"
            columns: ["product_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "price_book_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_books: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_books_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          product_family: Database["public"]["Enums"]["product_family"]
          product_type: Database["public"]["Enums"]["product_type"]
          sku: string | null
          tenant_id: string
          unit_of_measure: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          product_family: Database["public"]["Enums"]["product_family"]
          product_type: Database["public"]["Enums"]["product_type"]
          sku?: string | null
          tenant_id: string
          unit_of_measure?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          product_family?: Database["public"]["Enums"]["product_family"]
          product_type?: Database["public"]["Enums"]["product_type"]
          sku?: string | null
          tenant_id?: string
          unit_of_measure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_lines: {
        Row: {
          created_at: string
          discount_amount: number
          id: string
          line_total: number
          notes: string | null
          product_id: string
          quantity: number
          quote_id: string
          sort_order: number
          tenant_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          id?: string
          line_total?: number
          notes?: string | null
          product_id: string
          quantity: number
          quote_id: string
          sort_order?: number
          tenant_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          line_total?: number
          notes?: string | null
          product_id?: string
          quantity?: number
          quote_id?: string
          sort_order?: number
          tenant_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_product_id_tenant_id_fkey"
            columns: ["product_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_tenant_id_fkey"
            columns: ["quote_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "quote_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_sequences: {
        Row: {
          last_seq: number
          tenant_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          tenant_id: string
          year: number
        }
        Update: {
          last_seq?: number
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          discount_amount: number
          expiration_date: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          price_book_id: string | null
          quote_number: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_amount: number
          tenant_id: string
          total_amount: number
          updated_at: string
          version: number
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          discount_amount?: number
          expiration_date?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          price_book_id?: string | null
          quote_number: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
          version?: number
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          discount_amount?: number
          expiration_date?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          price_book_id?: string | null
          quote_number?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_tenant_id_fkey"
            columns: ["company_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "quotes_contact_id_tenant_id_fkey"
            columns: ["contact_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "quotes_opportunity_id_tenant_id_fkey"
            columns: ["opportunity_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "quotes_price_book_id_tenant_id_fkey"
            columns: ["price_book_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "price_books"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      sales_quotas: {
        Row: {
          created_at: string
          id: string
          owner_id: string | null
          period_label: string
          period_type: Database["public"]["Enums"]["forecast_period_type"]
          quota_amount: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string | null
          period_label: string
          period_type: Database["public"]["Enums"]["forecast_period_type"]
          quota_amount: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string | null
          period_label?: string
          period_type?: Database["public"]["Enums"]["forecast_period_type"]
          quota_amount?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_quotas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          configuration: Json
          enabled: boolean
          feature_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          enabled: boolean
          feature_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          enabled?: boolean
          feature_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["membership_status"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_profile: {
        Args: { target_profile_id: string }
        Returns: boolean
      }
      grant_platform_admin: { Args: { p_user_id: string }; Returns: undefined }
      has_tenant_permission: {
        Args: { permission_key: string; target_tenant_id: string }
        Returns: boolean
      }
      is_active_tenant_member: {
        Args: { target_tenant_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      next_case_number: { Args: { p_tenant_id: string }; Returns: string }
      next_quote_number: { Args: { p_tenant_id: string }; Returns: string }
      provision_organization: {
        Args: { p_name: string; p_slug: string; p_user_id: string }
        Returns: string
      }
      replace_membership_roles: {
        Args: {
          p_membership_id: string
          p_role_ids: string[]
          p_tenant_id: string
        }
        Returns: undefined
      }
      resolve_request_context: {
        Args: { tenant_slug: string }
        Returns: {
          effective_permissions: string[]
          enabled_features: string[]
          membership_id: string
          resolved_tenant_slug: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      set_organization_status: {
        Args: {
          p_status: Database["public"]["Enums"]["tenant_status"]
          p_tenant_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_status: "open" | "completed"
      activity_type: "call" | "email" | "meeting" | "task" | "note" | "whatsapp"
      audit_actor_type: "user" | "system" | "service"
      case_origin: "phone" | "email" | "whatsapp" | "web" | "manual"
      case_priority: "low" | "medium" | "high" | "critical"
      case_status:
        | "new"
        | "working"
        | "waiting_customer"
        | "escalated"
        | "resolved"
        | "closed"
      crm_record_status: "active" | "inactive"
      forecast_period_type: "month" | "quarter" | "year"
      membership_status: "invited" | "active" | "suspended"
      opportunity_business_type:
        | "flexography"
        | "inks"
        | "consumables"
        | "consulting"
        | "machinery"
      opportunity_status:
        | "new"
        | "discovery"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      product_family:
        | "flexography"
        | "inks"
        | "consumables"
        | "machinery"
        | "technical_services"
        | "consulting"
      product_type: "physical_product" | "service" | "machinery" | "spare_part"
      quote_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "sent"
        | "accepted"
        | "expired"
      tenant_status: "active" | "suspended" | "archived"
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
      activity_status: ["open", "completed"],
      activity_type: ["call", "email", "meeting", "task", "note", "whatsapp"],
      audit_actor_type: ["user", "system", "service"],
      case_origin: ["phone", "email", "whatsapp", "web", "manual"],
      case_priority: ["low", "medium", "high", "critical"],
      case_status: [
        "new",
        "working",
        "waiting_customer",
        "escalated",
        "resolved",
        "closed",
      ],
      crm_record_status: ["active", "inactive"],
      forecast_period_type: ["month", "quarter", "year"],
      membership_status: ["invited", "active", "suspended"],
      opportunity_business_type: [
        "flexography",
        "inks",
        "consumables",
        "consulting",
        "machinery",
      ],
      opportunity_status: [
        "new",
        "discovery",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      product_family: [
        "flexography",
        "inks",
        "consumables",
        "machinery",
        "technical_services",
        "consulting",
      ],
      product_type: ["physical_product", "service", "machinery", "spare_part"],
      quote_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "sent",
        "accepted",
        "expired",
      ],
      tenant_status: ["active", "suspended", "archived"],
    },
  },
} as const
