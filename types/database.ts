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
          asset_id: string | null
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
          work_order_id: string | null
        }
        Insert: {
          asset_id?: string | null
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
          work_order_id?: string | null
        }
        Update: {
          asset_id?: string | null
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
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_asset_id_tenant_id_fkey"
            columns: ["asset_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id", "tenant_id"]
          },
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
          {
            foreignKeyName: "activities_work_order_id_tenant_id_fkey"
            columns: ["work_order_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          label: string
          last_used_at: string | null
          prefix: string
          rotated_from: string | null
          scopes: string[]
          status: Database["public"]["Enums"]["api_key_status"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          label: string
          last_used_at?: string | null
          prefix: string
          rotated_from?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["api_key_status"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          label?: string
          last_used_at?: string | null
          prefix?: string
          rotated_from?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["api_key_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_events: {
        Row: {
          id: number
          occurred_at: string
          scope: string
          scope_id: string
        }
        Insert: {
          id?: number
          occurred_at?: string
          scope: string
          scope_id: string
        }
        Update: {
          id?: number
          occurred_at?: string
          scope?: string
          scope_id?: string
        }
        Relationships: []
      }
      asset_sequences: {
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
            foreignKeyName: "asset_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_category: Database["public"]["Enums"]["asset_category"]
          asset_number: string
          asset_type: Database["public"]["Enums"]["asset_type"]
          company_id: string | null
          created_at: string
          created_by: string | null
          criticality: Database["public"]["Enums"]["asset_criticality"]
          health_score: number | null
          id: string
          installed_at: string | null
          last_service_at: string | null
          location: string | null
          manufacturer: string | null
          model: string | null
          name: string
          next_service_due_at: string | null
          notes: string | null
          parent_asset_id: string | null
          product_id: string | null
          purchase_cost: number | null
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status"]
          tenant_id: string
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          asset_category?: Database["public"]["Enums"]["asset_category"]
          asset_number: string
          asset_type?: Database["public"]["Enums"]["asset_type"]
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          criticality?: Database["public"]["Enums"]["asset_criticality"]
          health_score?: number | null
          id?: string
          installed_at?: string | null
          last_service_at?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          next_service_due_at?: string | null
          notes?: string | null
          parent_asset_id?: string | null
          product_id?: string | null
          purchase_cost?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          tenant_id: string
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          asset_category?: Database["public"]["Enums"]["asset_category"]
          asset_number?: string
          asset_type?: Database["public"]["Enums"]["asset_type"]
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          criticality?: Database["public"]["Enums"]["asset_criticality"]
          health_score?: number | null
          id?: string
          installed_at?: string | null
          last_service_at?: string | null
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          next_service_due_at?: string | null
          notes?: string | null
          parent_asset_id?: string | null
          product_id?: string | null
          purchase_cost?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          tenant_id?: string
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_company_id_tenant_id_fkey"
            columns: ["company_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "assets_parent_asset_id_tenant_id_fkey"
            columns: ["parent_asset_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "assets_product_id_tenant_id_fkey"
            columns: ["product_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
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
          asset_id: string | null
          case_number: string
          closed_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          incident_type: string | null
          issue_type_id: string | null
          origin: Database["public"]["Enums"]["case_origin"]
          owner_id: string | null
          priority: Database["public"]["Enums"]["case_priority"]
          reported_skill_id: string | null
          resolved_at: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["case_status"]
          subject: string
          tenant_id: string
          tracking_token: string
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          asset_id?: string | null
          case_number: string
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incident_type?: string | null
          issue_type_id?: string | null
          origin?: Database["public"]["Enums"]["case_origin"]
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          reported_skill_id?: string | null
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          subject: string
          tenant_id: string
          tracking_token?: string
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          asset_id?: string | null
          case_number?: string
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incident_type?: string | null
          issue_type_id?: string | null
          origin?: Database["public"]["Enums"]["case_origin"]
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          reported_skill_id?: string | null
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          subject?: string
          tenant_id?: string
          tracking_token?: string
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_asset_id_tenant_id_fkey"
            columns: ["asset_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id", "tenant_id"]
          },
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
          {
            foreignKeyName: "cases_issue_type_id_fkey"
            columns: ["issue_type_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "service_issue_types"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      service_issue_types: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          skill_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          skill_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          skill_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_issue_types_skill_id_tenant_id_fkey"
            columns: ["skill_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "service_issue_types_tenant_id_fkey"
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
      export_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          expires_at: string | null
          filters: Json
          format: string
          id: string
          last_error: string | null
          lease_until: string | null
          object: string
          requested_by: string
          row_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["export_job_status"]
          storage_path: string | null
          tenant_id: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          filters?: Json
          format: string
          id?: string
          last_error?: string | null
          lease_until?: string | null
          object: string
          requested_by: string
          row_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["export_job_status"]
          storage_path?: string | null
          tenant_id: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          filters?: Json
          format?: string
          id?: string
          last_error?: string | null
          lease_until?: string | null
          object?: string
          requested_by?: string
          row_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["export_job_status"]
          storage_path?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_tenant_id_fkey"
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
      inventory_items: {
        Row: {
          created_at: string
          id: string
          material_id: string
          quantity_available: number
          quantity_on_hand: number
          quantity_reserved: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_material_id_tenant_id_fkey"
            columns: ["material_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          material_id: string
          quantity: number
          reference_id: string | null
          reference_type: Database["public"]["Enums"]["inventory_reference_type"]
          tenant_id: string
          type: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          material_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["inventory_reference_type"]
          tenant_id: string
          type: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          material_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["inventory_reference_type"]
          tenant_id?: string
          type?: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_material_id_tenant_id_fkey"
            columns: ["material_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "inventory_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          discount_amount: number
          id: string
          invoice_id: string
          line_total: number
          product_id: string | null
          quantity: number
          sort_order: number
          tax_amount: number
          tax_rate: number
          tenant_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number
          id?: string
          invoice_id: string
          line_total?: number
          product_id?: string | null
          quantity: number
          sort_order?: number
          tax_amount?: number
          tax_rate?: number
          tenant_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number
          id?: string
          invoice_id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          sort_order?: number
          tax_amount?: number
          tax_rate?: number
          tenant_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_tenant_id_fkey"
            columns: ["invoice_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "invoice_lines_product_id_tenant_id_fkey"
            columns: ["product_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "invoice_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
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
            foreignKeyName: "invoice_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          company_id: string
          contact_id: string | null
          created_at: string
          currency: string
          discount_amount: number
          due_date: string | null
          id: string
          invoice_number: string | null
          issue_date: string | null
          notes: string | null
          origin_type: Database["public"]["Enums"]["invoice_origin_type"]
          payment_terms: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          tenant_id: string
          total_amount: number
          updated_at: string
          void_reason: string | null
          work_order_id: string | null
        }
        Insert: {
          amount_paid?: number
          company_id: string
          contact_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          origin_type: Database["public"]["Enums"]["invoice_origin_type"]
          payment_terms?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
          void_reason?: string | null
          work_order_id?: string | null
        }
        Update: {
          amount_paid?: number
          company_id?: string
          contact_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          origin_type?: Database["public"]["Enums"]["invoice_origin_type"]
          payment_terms?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          void_reason?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_tenant_id_fkey"
            columns: ["company_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "invoices_contact_id_tenant_id_fkey"
            columns: ["contact_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "invoices_quote_id_tenant_id_fkey"
            columns: ["quote_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_work_order_id_tenant_id_fkey"
            columns: ["work_order_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          converted_at: string | null
          converted_opportunity_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          converted_at?: string | null
          converted_opportunity_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          converted_at?: string | null
          converted_opportunity_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_opportunity_id_tenant_id_fkey"
            columns: ["converted_opportunity_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          product_id: string | null
          sku: string | null
          tenant_id: string
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          product_id?: string | null
          sku?: string | null
          tenant_id: string
          unit_of_measure: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          product_id?: string | null
          sku?: string | null
          tenant_id?: string
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_product_id_tenant_id_fkey"
            columns: ["product_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "materials_tenant_id_fkey"
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          recipient_user_id: string
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_user_id: string
          tenant_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_user_id?: string
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          payment_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          payment_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          payment_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_invoice_id_tenant_id_fkey"
            columns: ["invoice_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_tenant_id_fkey"
            columns: ["payment_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "payment_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_sequences: {
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
            foreignKeyName: "payment_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          method: string
          note: string | null
          payment_date: string
          payment_number: string
          reference: string | null
          reverse_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          id?: string
          method: string
          note?: string | null
          payment_date: string
          payment_number: string
          reference?: string | null
          reverse_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          payment_date?: string
          payment_number?: string
          reference?: string | null
          reverse_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_tenant_id_fkey"
            columns: ["company_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
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
          public_token: string | null
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
          public_token?: string | null
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
          public_token?: string | null
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
      service_zones: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          incident_types: string[]
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          incident_types?: string[]
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          incident_types?: string[]
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_availability: {
        Row: {
          created_at: string
          end_minute: number
          id: string
          start_minute: number
          technician_id: string
          tenant_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_minute: number
          id?: string
          start_minute: number
          technician_id: string
          tenant_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_minute?: number
          id?: string
          start_minute?: number
          technician_id?: string
          tenant_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "technician_availability_technician_id_tenant_id_fkey"
            columns: ["technician_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "technician_availability_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_availability_exceptions: {
        Row: {
          created_at: string
          date_from: string
          date_to: string
          end_minute: number | null
          id: string
          kind: string
          note: string | null
          start_minute: number | null
          technician_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_from: string
          date_to: string
          end_minute?: number | null
          id?: string
          kind: string
          note?: string | null
          start_minute?: number | null
          technician_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_from?: string
          date_to?: string
          end_minute?: number | null
          id?: string
          kind?: string
          note?: string | null
          start_minute?: number | null
          technician_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_availability_exc_technician_id_tenant_id_fkey"
            columns: ["technician_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "technician_availability_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_skills: {
        Row: {
          created_at: string
          level: Database["public"]["Enums"]["skill_level"]
          skill_id: string
          technician_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          level?: Database["public"]["Enums"]["skill_level"]
          skill_id: string
          technician_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          level?: Database["public"]["Enums"]["skill_level"]
          skill_id?: string
          technician_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_skills_skill_id_tenant_id_fkey"
            columns: ["skill_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "technician_skills_technician_id_tenant_id_fkey"
            columns: ["technician_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "technician_skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_zones: {
        Row: {
          created_at: string
          tenant_id: string
          technician_id: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          tenant_id: string
          technician_id: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          created_at?: string
          tenant_id?: string
          technician_id?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_zones_zone_id_tenant_id_fkey"
            columns: ["zone_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "service_zones"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "technician_zones_technician_id_tenant_id_fkey"
            columns: ["technician_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "technician_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          employee_id: string | null
          first_name: string
          id: string
          last_name: string
          max_minutes_per_day: number | null
          max_work_orders_per_day: number | null
          phone: string | null
          status: Database["public"]["Enums"]["technician_status"]
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          employee_id?: string | null
          first_name: string
          id?: string
          last_name: string
          max_minutes_per_day?: number | null
          max_work_orders_per_day?: number | null
          phone?: string | null
          status?: Database["public"]["Enums"]["technician_status"]
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          employee_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          max_minutes_per_day?: number | null
          max_work_orders_per_day?: number | null
          phone?: string | null
          status?: Database["public"]["Enums"]["technician_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_tenant_id_fkey"
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
          address: string | null
          created_at: string
          email: string | null
          id: string
          legal_name: string | null
          name: string
          phone: string | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          name: string
          phone?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          phone?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      work_order_alert_state: {
        Row: {
          created_at: string
          last_alerted_at: string
          last_alerted_severity: string
          tenant_id: string
          updated_at: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          last_alerted_at: string
          last_alerted_severity: string
          tenant_id: string
          updated_at?: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          last_alerted_at?: string
          last_alerted_severity?: string
          tenant_id?: string
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_alert_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_alert_state_work_order_id_tenant_id_fkey"
            columns: ["work_order_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      work_order_assignments: {
        Row: {
          created_at: string
          estimated_duration_minutes: number
          id: string
          scheduled_end: string
          scheduled_start: string
          status: Database["public"]["Enums"]["assignment_status"]
          technician_id: string
          tenant_id: string
          updated_at: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          estimated_duration_minutes: number
          id?: string
          scheduled_end: string
          scheduled_start: string
          status?: Database["public"]["Enums"]["assignment_status"]
          technician_id: string
          tenant_id: string
          updated_at?: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          estimated_duration_minutes?: number
          id?: string
          scheduled_end?: string
          scheduled_start?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          technician_id?: string
          tenant_id?: string
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_assignments_technician_id_tenant_id_fkey"
            columns: ["technician_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "work_order_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignments_work_order_id_tenant_id_fkey"
            columns: ["work_order_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      work_order_executions: {
        Row: {
          accepted_at: string | null
          arrived_at: string | null
          assignment_id: string
          completed_at: string | null
          created_at: string
          id: string
          non_completion_reason:
            | Database["public"]["Enums"]["non_completion_reason"]
            | null
          resolution_notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["execution_status"]
          technician_id: string
          tenant_id: string
          unable_reason: string | null
          unable_to_complete_at: string | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          accepted_at?: string | null
          arrived_at?: string | null
          assignment_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          non_completion_reason?:
            | Database["public"]["Enums"]["non_completion_reason"]
            | null
          resolution_notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
          technician_id: string
          tenant_id: string
          unable_reason?: string | null
          unable_to_complete_at?: string | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          accepted_at?: string | null
          arrived_at?: string | null
          assignment_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          non_completion_reason?:
            | Database["public"]["Enums"]["non_completion_reason"]
            | null
          resolution_notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_status"]
          technician_id?: string
          tenant_id?: string
          unable_reason?: string | null
          unable_to_complete_at?: string | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_executions_assignment_id_tenant_id_fkey"
            columns: ["assignment_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "work_order_assignments"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "work_order_executions_technician_id_tenant_id_fkey"
            columns: ["technician_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "work_order_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_executions_work_order_id_tenant_id_fkey"
            columns: ["work_order_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      work_order_sequences: {
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
            foreignKeyName: "work_order_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          asset_id: string | null
          assigned_technician_id: string | null
          billable: boolean
          billing_approved_at: string | null
          billing_approved_by: string | null
          case_id: string | null
          company_id: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          labor_hours: number | null
          priority: Database["public"]["Enums"]["work_order_priority"]
          quote_id: string | null
          resolution_summary: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          subject: string
          tenant_id: string
          updated_at: string
          work_order_number: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          asset_id?: string | null
          assigned_technician_id?: string | null
          billable?: boolean
          billing_approved_at?: string | null
          billing_approved_by?: string | null
          case_id?: string | null
          company_id?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          labor_hours?: number | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          quote_id?: string | null
          resolution_summary?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          subject: string
          tenant_id: string
          updated_at?: string
          work_order_number: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          asset_id?: string | null
          assigned_technician_id?: string | null
          billable?: boolean
          billing_approved_at?: string | null
          billing_approved_by?: string | null
          case_id?: string | null
          company_id?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          labor_hours?: number | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          quote_id?: string | null
          resolution_summary?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          subject?: string
          tenant_id?: string
          updated_at?: string
          work_order_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_tenant_id_fkey"
            columns: ["asset_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "work_orders_case_id_tenant_id_fkey"
            columns: ["case_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "work_orders_company_id_tenant_id_fkey"
            columns: ["company_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "work_orders_quote_id_tenant_id_fkey"
            columns: ["quote_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      claim_export_job: {
        Args: { p_lease_seconds: number; p_max_attempts: number }
        Returns: Json
      }
      consume_rate_limit: {
        Args: {
          p_api_key_id: string
          p_key_limit: number
          p_tenant_id: string
          p_tenant_limit: number
          p_window_seconds: number
        }
        Returns: Json
      }
      dispatch_technician_workload: {
        Args: { p_from: string; p_tenant_id: string; p_to: string }
        Returns: {
          assignment_count: number
          first_name: string
          last_name: string
          scheduled_minutes: number
          status: Database["public"]["Enums"]["technician_status"]
          technician_id: string
        }[]
      }
      technician_outcomes: {
        Args: { p_tenant_id: string }
        Returns: {
          technician_id: string
          completed_count: number
          unable_count: number
          resolved_count: number
          success_rate: number | null
          avg_work_minutes: number | null
          last_completed_at: string | null
        }[]
      }
      technician_issue_type_outcomes: {
        Args: { p_tenant_id: string; p_issue_type_id: string }
        Returns: {
          technician_id: string
          completed_count: number
          resolved_count: number
          success_rate: number | null
          last_completed_at: string | null
        }[]
      }
      grant_platform_admin: { Args: { p_user_id: string }; Returns: undefined }
      has_tenant_permission: {
        Args: { permission_key: string; target_tenant_id: string }
        Returns: boolean
      }
      inventory__apply_movement: {
        Args: {
          p_fulfill_reservation: boolean
          p_material_id: string
          p_quantity: number
          p_reference_id: string | null
          p_reference_type: Database["public"]["Enums"]["inventory_reference_type"]
          p_tenant_id: string
          p_type: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Returns: Json
      }
      inventory_adjust: {
        Args: {
          p_material_id: string
          p_quantity: number
          p_reference_id: string | null
          p_reference_type: Database["public"]["Enums"]["inventory_reference_type"]
          p_tenant_id: string
        }
        Returns: Json
      }
      inventory_consume: {
        Args: {
          p_fulfill_reservation: boolean
          p_material_id: string
          p_quantity: number
          p_reference_id: string | null
          p_reference_type: Database["public"]["Enums"]["inventory_reference_type"]
          p_tenant_id: string
        }
        Returns: Json
      }
      inventory_receive: {
        Args: {
          p_material_id: string
          p_quantity: number
          p_reference_id: string | null
          p_reference_type: Database["public"]["Enums"]["inventory_reference_type"]
          p_tenant_id: string
        }
        Returns: Json
      }
      inventory_release: {
        Args: {
          p_material_id: string
          p_quantity: number
          p_reference_id: string | null
          p_reference_type: Database["public"]["Enums"]["inventory_reference_type"]
          p_tenant_id: string
        }
        Returns: Json
      }
      inventory_reserve: {
        Args: {
          p_material_id: string
          p_quantity: number
          p_reference_id: string | null
          p_reference_type: Database["public"]["Enums"]["inventory_reference_type"]
          p_tenant_id: string
        }
        Returns: Json
      }
      is_active_tenant_member: {
        Args: { target_tenant_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      next_asset_number: { Args: { p_tenant_id: string }; Returns: string }
      next_case_number: { Args: { p_tenant_id: string }; Returns: string }
      next_invoice_number: { Args: { p_tenant_id: string }; Returns: string }
      next_payment_number: { Args: { p_tenant_id: string }; Returns: string }
      next_quote_number: { Args: { p_tenant_id: string }; Returns: string }
      next_work_order_number: { Args: { p_tenant_id: string }; Returns: string }
      tenant_users_with_permission: {
        Args: { p_permission_key: string; p_tenant_id: string }
        Returns: string[]
      }
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
      api_key_status: "active" | "revoked"
      asset_category:
        | "printing"
        | "lamination"
        | "finishing"
        | "prepress"
        | "tooling"
        | "auxiliary"
        | "other"
      asset_criticality: "low" | "medium" | "high" | "critical"
      asset_status: "active" | "in_maintenance" | "down" | "retired"
      asset_type: "machinery" | "equipment" | "component" | "tool" | "other"
      assignment_status: "scheduled" | "in_progress" | "completed" | "cancelled"
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
      execution_status:
        | "pending"
        | "accepted"
        | "on_site"
        | "working"
        | "completed"
        | "unable_to_complete"
      export_job_status:
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "expired"
      forecast_period_type: "month" | "quarter" | "year"
      inventory_reference_type:
        | "work_order"
        | "work_order_execution"
        | "manual"
        | "reconciliation"
      inventory_transaction_type:
        | "receipt"
        | "consumption"
        | "adjustment"
        | "reservation"
        | "release"
      invoice_origin_type: "work_order" | "quote"
      invoice_status: "draft" | "issued" | "partially_paid" | "paid" | "void"
      lead_status:
        | "new"
        | "working"
        | "qualified"
        | "disqualified"
        | "converted"
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
      payment_status: "recorded" | "reversed"
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
      non_completion_reason:
        | "customer_absent"
        | "missing_skill"
        | "missing_part"
        | "access_denied"
        | "weather"
        | "customer_cancelled"
        | "other"
      skill_level: "junior" | "mid" | "senior" | "expert"
      technician_status: "active" | "inactive" | "on_leave"
      tenant_status: "active" | "suspended" | "archived"
      work_order_priority: "low" | "medium" | "high" | "critical"
      work_order_status:
        | "new"
        | "scheduled"
        | "dispatched"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
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
      api_key_status: ["active", "revoked"],
      asset_category: [
        "printing",
        "lamination",
        "finishing",
        "prepress",
        "tooling",
        "auxiliary",
        "other",
      ],
      asset_criticality: ["low", "medium", "high", "critical"],
      asset_status: ["active", "in_maintenance", "down", "retired"],
      asset_type: ["machinery", "equipment", "component", "tool", "other"],
      assignment_status: ["scheduled", "in_progress", "completed", "cancelled"],
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
      execution_status: [
        "pending",
        "accepted",
        "on_site",
        "working",
        "completed",
        "unable_to_complete",
      ],
      export_job_status: [
        "queued",
        "processing",
        "completed",
        "failed",
        "expired",
      ],
      forecast_period_type: ["month", "quarter", "year"],
      inventory_reference_type: [
        "work_order",
        "work_order_execution",
        "manual",
        "reconciliation",
      ],
      inventory_transaction_type: [
        "receipt",
        "consumption",
        "adjustment",
        "reservation",
        "release",
      ],
      invoice_origin_type: ["work_order", "quote"],
      invoice_status: ["draft", "issued", "partially_paid", "paid", "void"],
      lead_status: ["new", "working", "qualified", "disqualified", "converted"],
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
      payment_status: ["recorded", "reversed"],
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
      non_completion_reason: [
        "customer_absent",
        "missing_skill",
        "missing_part",
        "access_denied",
        "weather",
        "customer_cancelled",
        "other",
      ],
      skill_level: ["junior", "mid", "senior", "expert"],
      technician_status: ["active", "inactive", "on_leave"],
      tenant_status: ["active", "suspended", "archived"],
      work_order_priority: ["low", "medium", "high", "critical"],
      work_order_status: [
        "new",
        "scheduled",
        "dispatched",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
