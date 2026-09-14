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
      account: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          account_id: string
          created_at: string
          id: string
          id_token: string | null
          password: string | null
          provider_id: string
          refresh_token: string | null
          refresh_token_expires_at: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          account_id: string
          created_at?: string
          id: string
          id_token?: string | null
          password?: string | null
          provider_id: string
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          scope?: string | null
          updated_at: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          account_id?: string
          created_at?: string
          id?: string
          id_token?: string | null
          password?: string | null
          provider_id?: string
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_user_id_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          actor_name: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          session_id: string | null
          severity: string
          target_table: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          session_id?: string | null
          severity?: string
          target_table: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          session_id?: string | null
          severity?: string
          target_table?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_activity_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["admin_action_type"]
          admin_email: string | null
          admin_id: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          session_id: string | null
          severity: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["admin_action_type"]
          admin_email?: string | null
          admin_id: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          session_id?: string | null
          severity?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["admin_action_type"]
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          session_id?: string | null
          severity?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_login_alerts: {
        Row: {
          admin_id: string
          created_at: string
          email_sent: boolean
          expires_at: string
          id: string
          ip_address: string | null
          new_session_id: string | null
          new_session_jwt: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          email_sent?: boolean
          expires_at: string
          id?: string
          ip_address?: string | null
          new_session_id?: string | null
          new_session_jwt?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          email_sent?: boolean
          expires_at?: string
          id?: string
          ip_address?: string | null
          new_session_id?: string | null
          new_session_jwt?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_login_alerts_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_login_alerts_new_session_id_fkey"
            columns: ["new_session_id"]
            isOneToOne: false
            referencedRelation: "admin_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_login_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          key: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          key: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          key?: string
          resource?: string
        }
        Relationships: []
      }
      admin_platform_roles: {
        Row: {
          created_at: string
          description: string | null
          is_super: boolean
          label: string
          role: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_super?: boolean
          label: string
          role: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          is_super?: boolean
          label?: string
          role?: string
          sort_order?: number
        }
        Relationships: []
      }
      admin_read_audit: {
        Row: {
          admin_id: string
          created_at: string
          detail: Json
          id: string
          route_key: string
          row_count: number
        }
        Insert: {
          admin_id: string
          created_at?: string
          detail?: Json
          id?: string
          route_key: string
          row_count?: number
        }
        Update: {
          admin_id?: string
          created_at?: string
          detail?: Json
          id?: string
          route_key?: string
          row_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_read_audit_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_role_permissions: {
        Row: {
          created_at: string
          permission_key: string
          role: string
        }
        Insert: {
          created_at?: string
          permission_key: string
          role: string
        }
        Update: {
          created_at?: string
          permission_key?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "admin_permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "admin_role_permissions_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "admin_platform_roles"
            referencedColumns: ["role"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          admin_id: string
          device_info: string | null
          ended_at: string | null
          ended_reason: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active_at: string
          location: string | null
          mfa_verified: boolean | null
          session_token: string
          started_at: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          device_info?: string | null
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active_at?: string
          location?: string | null
          mfa_verified?: boolean | null
          session_token: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          device_info?: string | null
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active_at?: string
          location?: string | null
          mfa_verified?: boolean | null
          session_token?: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_tasks: {
        Row: {
          assignee_id: string | null
          board_position: number
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          progress_percent: number
          status: string
          task_seq: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          board_position?: number
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          progress_percent?: number
          status?: string
          task_seq?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          board_position?: number
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          progress_percent?: number
          status?: string
          task_seq?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_user_overrides: {
        Row: {
          created_at: string
          effect: string
          granted_by: string | null
          permission_key: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          effect: string
          granted_by?: string | null
          permission_key: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          effect?: string
          granted_by?: string | null
          permission_key?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_overrides_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "admin_permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      ai_body_part_mappings: {
        Row: {
          body_part_id: string
          confidence: number
          content_id: string
          content_type: string
          created_at: string
          id: string
          model: string | null
          rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          body_part_id: string
          confidence?: number
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          model?: string | null
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          body_part_id?: string
          confidence?: number
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          model?: string | null
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_body_part_mappings_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          accuracy_latest: number | null
          accuracy_target: number
          config: Json
          created_at: string
          deployed_by: string | null
          description: string | null
          id: string
          last_trained_at: string | null
          latency_p50_ms: number | null
          model_key: string
          model_type: string
          name: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          accuracy_latest?: number | null
          accuracy_target?: number
          config?: Json
          created_at?: string
          deployed_by?: string | null
          description?: string | null
          id?: string
          last_trained_at?: string | null
          latency_p50_ms?: number | null
          model_key: string
          model_type: string
          name: string
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          accuracy_latest?: number | null
          accuracy_target?: number
          config?: Json
          created_at?: string
          deployed_by?: string | null
          description?: string | null
          id?: string
          last_trained_at?: string | null
          latency_p50_ms?: number | null
          model_key?: string
          model_type?: string
          name?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_recommendation_stats: {
        Row: {
          clicks: number
          conversions: number
          created_at: string
          id: string
          items_served: number
          model_version: string | null
          recommendation_type: string
          satisfaction: number | null
          stat_date: string
          user_segment: string
        }
        Insert: {
          clicks?: number
          conversions?: number
          created_at?: string
          id?: string
          items_served?: number
          model_version?: string | null
          recommendation_type: string
          satisfaction?: number | null
          stat_date?: string
          user_segment: string
        }
        Update: {
          clicks?: number
          conversions?: number
          created_at?: string
          id?: string
          items_served?: number
          model_version?: string | null
          recommendation_type?: string
          satisfaction?: number | null
          stat_date?: string
          user_segment?: string
        }
        Relationships: []
      }
      ambulance_dispatches: {
        Row: {
          actual_arrival: string | null
          actual_completion: string | null
          ai_routing_used: boolean
          ambulance_id: string | null
          caller_name: string | null
          caller_phone: string | null
          created_at: string
          destination_address: string | null
          destination_facility_id: string | null
          destination_gps: string | null
          dispatch_reference: string
          dispatcher_id: string | null
          driver_id: string | null
          emergency_type: string
          eta_minutes: number | null
          id: string
          notes: string | null
          patient_age_group: string | null
          patient_gender: string | null
          patient_id: string | null
          pickup_address: string
          pickup_area: string | null
          pickup_gps: string | null
          pickup_region: string | null
          priority: string | null
          required_ward: string | null
          rerouted_from_facility_id: string | null
          status: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_completion?: string | null
          ai_routing_used?: boolean
          ambulance_id?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          created_at?: string
          destination_address?: string | null
          destination_facility_id?: string | null
          destination_gps?: string | null
          dispatch_reference: string
          dispatcher_id?: string | null
          driver_id?: string | null
          emergency_type: string
          eta_minutes?: number | null
          id?: string
          notes?: string | null
          patient_age_group?: string | null
          patient_gender?: string | null
          patient_id?: string | null
          pickup_address: string
          pickup_area?: string | null
          pickup_gps?: string | null
          pickup_region?: string | null
          priority?: string | null
          required_ward?: string | null
          rerouted_from_facility_id?: string | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_completion?: string | null
          ai_routing_used?: boolean
          ambulance_id?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          created_at?: string
          destination_address?: string | null
          destination_facility_id?: string | null
          destination_gps?: string | null
          dispatch_reference?: string
          dispatcher_id?: string | null
          driver_id?: string | null
          emergency_type?: string
          eta_minutes?: number | null
          id?: string
          notes?: string | null
          patient_age_group?: string | null
          patient_gender?: string | null
          patient_id?: string | null
          pickup_address?: string
          pickup_area?: string | null
          pickup_gps?: string | null
          pickup_region?: string | null
          priority?: string | null
          required_ward?: string | null
          rerouted_from_facility_id?: string | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_dispatches_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_dispatches_destination_facility_id_fkey"
            columns: ["destination_facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_dispatches_dispatcher_id_fkey"
            columns: ["dispatcher_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ambulance_dispatches_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ambulance_dispatches_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ambulance_dispatches_rerouted_from_facility_id_fkey"
            columns: ["rerouted_from_facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulances: {
        Row: {
          ambulance_code: string
          created_at: string
          current_gps: string | null
          driver_user_id: string | null
          id: string
          is_active: boolean
          last_ping_at: string | null
          region: string | null
          service_provider: string
          status: string
          updated_at: string
        }
        Insert: {
          ambulance_code: string
          created_at?: string
          current_gps?: string | null
          driver_user_id?: string | null
          id?: string
          is_active?: boolean
          last_ping_at?: string | null
          region?: string | null
          service_provider?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ambulance_code?: string
          created_at?: string
          current_gps?: string | null
          driver_user_id?: string | null
          id?: string
          is_active?: boolean
          last_ping_at?: string | null
          region?: string | null
          service_provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulances_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          event_name: string | null
          event_type: string | null
          id: string
          metadata: Json
          module: string
          source: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          event_name?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json
          module?: string
          source?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          event_name?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json
          module?: string
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      anatomy_hotspots: {
        Row: {
          body_part_id: string
          body_system: string | null
          created_at: string
          cx: number
          cy: number
          gender: string
          id: string
          is_organ: boolean
          rx: number
          ry: number
          svg_path_id: string | null
          view: string
        }
        Insert: {
          body_part_id: string
          body_system?: string | null
          created_at?: string
          cx?: number
          cy?: number
          gender?: string
          id?: string
          is_organ?: boolean
          rx?: number
          ry?: number
          svg_path_id?: string | null
          view?: string
        }
        Update: {
          body_part_id?: string
          body_system?: string | null
          created_at?: string
          cx?: number
          cy?: number
          gender?: string
          id?: string
          is_organ?: boolean
          rx?: number
          ry?: number
          svg_path_id?: string | null
          view?: string
        }
        Relationships: [
          {
            foreignKeyName: "anatomy_hotspots_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      anatomy_hotspots_3d: {
        Row: {
          body_part_id: string
          created_at: string
          display_order: number
          gender: string
          id: string
          region_key: string
          source: string
          x: number
          y: number
          z: number
        }
        Insert: {
          body_part_id: string
          created_at?: string
          display_order?: number
          gender?: string
          id?: string
          region_key: string
          source?: string
          x?: number
          y?: number
          z?: number
        }
        Update: {
          body_part_id?: string
          created_at?: string
          display_order?: number
          gender?: string
          id?: string
          region_key?: string
          source?: string
          x?: number
          y?: number
          z?: number
        }
        Relationships: [
          {
            foreignKeyName: "anatomy_hotspots_3d_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anatomy_hotspots_3d_region_key_fkey"
            columns: ["region_key"]
            isOneToOne: false
            referencedRelation: "anatomy_regions"
            referencedColumns: ["key"]
          },
        ]
      }
      anatomy_interactions: {
        Row: {
          action: string
          body_part_id: string | null
          created_at: string
          id: string
          source: string
          user_id: string | null
        }
        Insert: {
          action?: string
          body_part_id?: string | null
          created_at?: string
          id?: string
          source?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          body_part_id?: string | null
          created_at?: string
          id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anatomy_interactions_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anatomy_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      anatomy_premium_config: {
        Row: {
          id: string
          layers: Json
          updated_at: string
        }
        Insert: {
          id?: string
          layers?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          layers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      anatomy_regions: {
        Row: {
          created_at: string
          default_yaw: number
          display_order: number
          id: string
          is_premium: boolean
          key: string
          label: string
          target_x: number
          target_y: number
          target_z: number
          zoom: number
        }
        Insert: {
          created_at?: string
          default_yaw?: number
          display_order?: number
          id?: string
          is_premium?: boolean
          key: string
          label: string
          target_x?: number
          target_y?: number
          target_z?: number
          zoom?: number
        }
        Update: {
          created_at?: string
          default_yaw?: number
          display_order?: number
          id?: string
          is_premium?: boolean
          key?: string
          label?: string
          target_x?: number
          target_y?: number
          target_z?: number
          zoom?: number
        }
        Relationships: []
      }
      app_ledger: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["ledger_category"]
          created_at: string
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["ledger_category"]
          created_at?: string
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["ledger_category"]
          created_at?: string
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      app_reviews: {
        Row: {
          admin_note: string | null
          app_version: string | null
          comment_text: string | null
          created_at: string
          id: string
          platform: string | null
          prompt_source: string
          rating: number
          reviewed_at: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          app_version?: string | null
          comment_text?: string | null
          created_at?: string
          id?: string
          platform?: string | null
          prompt_source?: string
          rating: number
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          app_version?: string | null
          comment_text?: string | null
          created_at?: string
          id?: string
          platform?: string | null
          prompt_source?: string
          rating?: number
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bed_tracker_alerts: {
        Row: {
          alert_type: string
          bed_type: string | null
          beds_available: number | null
          beds_total: number | null
          created_at: string
          facility_id: string
          id: string
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          bed_type?: string | null
          beds_available?: number | null
          beds_total?: number | null
          created_at?: string
          facility_id: string
          id?: string
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          alert_type?: string
          bed_type?: string | null
          beds_available?: number | null
          beds_total?: number | null
          created_at?: string
          facility_id?: string
          id?: string
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "bed_tracker_alerts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "bed_tracker_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_tracker_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bed_tracker_facilities: {
        Row: {
          alert_threshold: number | null
          auto_alert_enabled: boolean | null
          available_beds: number
          created_at: string
          emergency_beds: number | null
          facility_admin_name: string | null
          facility_admin_phone: string | null
          facility_id: string
          general_ward_available: number | null
          general_ward_beds: number | null
          ghs_facility_code: string | null
          gps_coordinates: string | null
          hardware_option: string | null
          icu_available: number | null
          icu_beds: number | null
          id: string
          is_tracking_enabled: boolean | null
          last_ping_at: string | null
          last_updated_at: string
          maternity_available: number | null
          maternity_beds: number | null
          occupied_beds: number
          pediatric_available: number | null
          pediatric_beds: number | null
          subscription_tier: string | null
          tablet_online: boolean
          total_beds: number
          updated_by: string | null
        }
        Insert: {
          alert_threshold?: number | null
          auto_alert_enabled?: boolean | null
          available_beds?: number
          created_at?: string
          emergency_beds?: number | null
          facility_admin_name?: string | null
          facility_admin_phone?: string | null
          facility_id: string
          general_ward_available?: number | null
          general_ward_beds?: number | null
          ghs_facility_code?: string | null
          gps_coordinates?: string | null
          hardware_option?: string | null
          icu_available?: number | null
          icu_beds?: number | null
          id?: string
          is_tracking_enabled?: boolean | null
          last_ping_at?: string | null
          last_updated_at?: string
          maternity_available?: number | null
          maternity_beds?: number | null
          occupied_beds?: number
          pediatric_available?: number | null
          pediatric_beds?: number | null
          subscription_tier?: string | null
          tablet_online?: boolean
          total_beds?: number
          updated_by?: string | null
        }
        Update: {
          alert_threshold?: number | null
          auto_alert_enabled?: boolean | null
          available_beds?: number
          created_at?: string
          emergency_beds?: number | null
          facility_admin_name?: string | null
          facility_admin_phone?: string | null
          facility_id?: string
          general_ward_available?: number | null
          general_ward_beds?: number | null
          ghs_facility_code?: string | null
          gps_coordinates?: string | null
          hardware_option?: string | null
          icu_available?: number | null
          icu_beds?: number | null
          id?: string
          is_tracking_enabled?: boolean | null
          last_ping_at?: string | null
          last_updated_at?: string
          maternity_available?: number | null
          maternity_beds?: number | null
          occupied_beds?: number
          pediatric_available?: number | null
          pediatric_beds?: number | null
          subscription_tier?: string | null
          tablet_online?: boolean
          total_beds?: number
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bed_tracker_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_tracker_facilities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bed_tracker_ward_updates: {
        Row: {
          actor: string | null
          created_at: string
          id: string
          new_occupied: number | null
          new_total: number | null
          previous_occupied: number | null
          previous_total: number | null
          source: string
          ward_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: string
          new_occupied?: number | null
          new_total?: number | null
          previous_occupied?: number | null
          previous_total?: number | null
          source?: string
          ward_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: string
          new_occupied?: number | null
          new_total?: number | null
          previous_occupied?: number | null
          previous_total?: number | null
          source?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bed_tracker_ward_updates_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bed_tracker_ward_updates_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "bed_tracker_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      bed_tracker_wards: {
        Row: {
          available_beds: number
          bed_tracker_facility_id: string
          created_at: string
          id: string
          last_updated_at: string
          occupied_beds: number
          total_beds: number
          update_source: string
          updated_by: string | null
          ward_type: string
        }
        Insert: {
          available_beds?: number
          bed_tracker_facility_id: string
          created_at?: string
          id?: string
          last_updated_at?: string
          occupied_beds?: number
          total_beds?: number
          update_source?: string
          updated_by?: string | null
          ward_type: string
        }
        Update: {
          available_beds?: number
          bed_tracker_facility_id?: string
          created_at?: string
          id?: string
          last_updated_at?: string
          occupied_beds?: number
          total_beds?: number
          update_source?: string
          updated_by?: string | null
          ward_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bed_tracker_wards_bed_tracker_facility_id_fkey"
            columns: ["bed_tracker_facility_id"]
            isOneToOne: false
            referencedRelation: "bed_tracker_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_tracker_wards_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      body_parts: {
        Row: {
          body_system: string | null
          description: string | null
          display_order: number | null
          gender_scope: string | null
          icon: string | null
          id: string
          level: number | null
          mesh_id: string | null
          name: string
          parent_id: string | null
          path: unknown
        }
        Insert: {
          body_system?: string | null
          description?: string | null
          display_order?: number | null
          gender_scope?: string | null
          icon?: string | null
          id?: string
          level?: number | null
          mesh_id?: string | null
          name: string
          parent_id?: string | null
          path: unknown
        }
        Update: {
          body_system?: string | null
          description?: string | null
          display_order?: number | null
          gender_scope?: string | null
          icon?: string | null
          id?: string
          level?: number | null
          mesh_id?: string | null
          name?: string
          parent_id?: string | null
          path?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "body_parts_parent_id_body_parts_id_fk"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_signals: {
        Row: {
          admin_id: string
          created_at: string
          detail: Json
          id: string
          kind: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          detail?: Json
          id?: string
          kind: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          detail?: Json
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_signals_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      categories: {
        Row: {
          description: string | null
          id: string
          level: number | null
          name: string
          parent_id: string | null
          path: unknown
          slug: string
          type: Database["public"]["Enums"]["category_type"]
        }
        Insert: {
          description?: string | null
          id?: string
          level?: number | null
          name: string
          parent_id?: string | null
          path: unknown
          slug: string
          type?: Database["public"]["Enums"]["category_type"]
        }
        Update: {
          description?: string | null
          id?: string
          level?: number | null
          name?: string
          parent_id?: string | null
          path?: unknown
          slug?: string
          type?: Database["public"]["Enums"]["category_type"]
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_categories_id_fk"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_views: {
        Row: {
          challenge_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_views_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_support: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          category: string | null
          created_at: string | null
          escalated_at: string | null
          escalated_to: string | null
          first_response_at: string | null
          id: number
          is_deleted: boolean | null
          message: string | null
          priority: string | null
          requested_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          response_time_minutes: number | null
          satisfaction_rating: number | null
          status: string | null
          subject: string | null
          tags: string[] | null
          updated_at: string | null
          user_name: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          first_response_at?: string | null
          id?: number
          is_deleted?: boolean | null
          message?: string | null
          priority?: string | null
          requested_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_time_minutes?: number | null
          satisfaction_rating?: number | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_name?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          first_response_at?: string | null
          id?: number
          is_deleted?: boolean | null
          message?: string | null
          priority?: string | null
          requested_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_time_minutes?: number | null
          satisfaction_rating?: number | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_support_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_support_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_support_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_support_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      collector_footprints: {
        Row: {
          activity: string
          area: string | null
          collector_id: string
          created_at: string
          district: string | null
          facility_id: string | null
          gps_accuracy: number | null
          id: number
          latitude: number
          longitude: number
          notes: string | null
          region: string | null
        }
        Insert: {
          activity?: string
          area?: string | null
          collector_id: string
          created_at?: string
          district?: string | null
          facility_id?: string | null
          gps_accuracy?: number | null
          id?: never
          latitude: number
          longitude: number
          notes?: string | null
          region?: string | null
        }
        Update: {
          activity?: string
          area?: string | null
          collector_id?: string
          created_at?: string
          district?: string | null
          facility_id?: string | null
          gps_accuracy?: number | null
          id?: never
          latitude?: number
          longitude?: number
          notes?: string | null
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collector_footprints_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "collector_footprints_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      collector_submissions: {
        Row: {
          collector_id: string
          created_at: string
          data: Json
          facility_id: string | null
          gps_location: string | null
          id: string
          photos: string[] | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submission_type: string
        }
        Insert: {
          collector_id: string
          created_at?: string
          data?: Json
          facility_id?: string | null
          gps_location?: string | null
          id?: string
          photos?: string[] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submission_type: string
        }
        Update: {
          collector_id?: string
          created_at?: string
          data?: Json
          facility_id?: string | null
          gps_location?: string | null
          id?: string
          photos?: string[] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submission_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "collector_submissions_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "data_collectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collector_submissions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collector_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      compliance_settings: {
        Row: {
          created_at: string
          gra_tax_id: string | null
          id: string
          last_filed_at: string | null
          next_filing_due_date: string | null
          updated_at: string
          updated_by: string | null
          vat_filing_frequency: string | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string
          gra_tax_id?: string | null
          id?: string
          last_filed_at?: string | null
          next_filing_due_date?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_filing_frequency?: string | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string
          gra_tax_id?: string | null
          id?: string
          last_filed_at?: string | null
          next_filing_due_date?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_filing_frequency?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      condition_body_parts: {
        Row: {
          body_part_id: string
          condition_id: string
          source: string
        }
        Insert: {
          body_part_id: string
          condition_id: string
          source?: string
        }
        Update: {
          body_part_id?: string
          condition_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "condition_body_parts_body_part_id_body_parts_id_fk"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condition_body_parts_condition_id_conditions_id_fk"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_categories: {
        Row: {
          category_id: string
          condition_id: string
        }
        Insert: {
          category_id: string
          condition_id: string
        }
        Update: {
          category_id?: string
          condition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "condition_categories_category_id_categories_id_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condition_categories_condition_id_conditions_id_fk"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_causes: {
        Row: {
          cause_name: string
          condition_id: string | null
          id: string
          other_possible_causes: Json | null
        }
        Insert: {
          cause_name: string
          condition_id?: string | null
          id?: string
          other_possible_causes?: Json | null
        }
        Update: {
          cause_name?: string
          condition_id?: string | null
          id?: string
          other_possible_causes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "condition_causes_condition_id_conditions_id_fk"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_types: {
        Row: {
          about_type: Json | null
          condition_id: string | null
          id: string
          type_name: string
        }
        Insert: {
          about_type?: Json | null
          condition_id?: string | null
          id?: string
          type_name: string
        }
        Update: {
          about_type?: Json | null
          condition_id?: string | null
          id?: string
          type_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "condition_types_condition_id_conditions_id_fk"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_views: {
        Row: {
          condition_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          condition_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          condition_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "condition_views_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condition_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conditions: {
        Row: {
          about: Json | null
          attribution: Json | null
          author_id: string | null
          complications: Json | null
          contact_your_doctor: Json | null
          created_at: string
          diagnosis: Json | null
          featured_from: string | null
          featured_order: number | null
          featured_until: string | null
          icd11_code: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_pinned: boolean | null
          is_systemic: boolean | null
          like_count: number
          metadata: Json | null
          more_information: Json | null
          name: string | null
          nhis_coverage: string | null
          nhs_link: string | null
          prevention: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          save_count: number
          search_vector: unknown
          severity: string | null
          slug: string | null
          specialist: string | null
          status: string | null
          symptoms: Json | null
          treatment: Json | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          about?: Json | null
          attribution?: Json | null
          author_id?: string | null
          complications?: Json | null
          contact_your_doctor?: Json | null
          created_at?: string
          diagnosis?: Json | null
          featured_from?: string | null
          featured_order?: number | null
          featured_until?: string | null
          icd11_code?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          is_systemic?: boolean | null
          like_count?: number
          metadata?: Json | null
          more_information?: Json | null
          name?: string | null
          nhis_coverage?: string | null
          nhs_link?: string | null
          prevention?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          save_count?: number
          search_vector?: unknown
          severity?: string | null
          slug?: string | null
          specialist?: string | null
          status?: string | null
          symptoms?: Json | null
          treatment?: Json | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          about?: Json | null
          attribution?: Json | null
          author_id?: string | null
          complications?: Json | null
          contact_your_doctor?: Json | null
          created_at?: string
          diagnosis?: Json | null
          featured_from?: string | null
          featured_order?: number | null
          featured_until?: string | null
          icd11_code?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          is_systemic?: boolean | null
          like_count?: number
          metadata?: Json | null
          more_information?: Json | null
          name?: string | null
          nhis_coverage?: string | null
          nhs_link?: string | null
          prevention?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          save_count?: number
          search_vector?: unknown
          severity?: string | null
          slug?: string | null
          specialist?: string | null
          status?: string | null
          symptoms?: Json | null
          treatment?: Json | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conditions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conditions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      content_engagement: {
        Row: {
          action: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      content_moderation_flags: {
        Row: {
          action_notes: string | null
          action_taken: string | null
          ai_confidence: number | null
          ai_detected: boolean | null
          ai_reason: string | null
          content_id: string
          content_type: string
          created_at: string
          id: string
          report_detail: string | null
          report_reason: string
          reported_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string | null
          status: Database["public"]["Enums"]["moderation_status"] | null
          updated_at: string
        }
        Insert: {
          action_notes?: string | null
          action_taken?: string | null
          ai_confidence?: number | null
          ai_detected?: boolean | null
          ai_reason?: string | null
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          report_detail?: string | null
          report_reason: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          status?: Database["public"]["Enums"]["moderation_status"] | null
          updated_at?: string
        }
        Update: {
          action_notes?: string | null
          action_taken?: string | null
          ai_confidence?: number | null
          ai_detected?: boolean | null
          ai_reason?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          report_detail?: string | null
          report_reason?: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          status?: Database["public"]["Enums"]["moderation_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_moderation_flags_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "content_moderation_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          is_archived: boolean
          is_muted: boolean
          joined_at: string
          left_at: string | null
          role: string
          unread_count: number
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_archived?: boolean
          is_muted?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          unread_count?: number
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_archived?: boolean
          is_muted?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          flagged_at: string | null
          flagged_by: string | null
          flagged_reason: string | null
          group_category: string | null
          group_description: string | null
          group_name: string | null
          group_permissions: Json
          group_rules: string | null
          group_type: string
          id: string
          is_deleted: boolean
          is_flagged: boolean | null
          is_group: boolean | null
          is_verified_only: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          last_message_sender: string | null
          max_members: number | null
          name: string | null
          region_restriction: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          group_category?: string | null
          group_description?: string | null
          group_name?: string | null
          group_permissions?: Json
          group_rules?: string | null
          group_type?: string
          id?: string
          is_deleted?: boolean
          is_flagged?: boolean | null
          is_group?: boolean | null
          is_verified_only?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_message_sender?: string | null
          max_members?: number | null
          name?: string | null
          region_restriction?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          group_category?: string | null
          group_description?: string | null
          group_name?: string | null
          group_permissions?: Json
          group_rules?: string | null
          group_type?: string
          id?: string
          is_deleted?: boolean
          is_flagged?: boolean | null
          is_group?: boolean | null
          is_verified_only?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_message_sender?: string | null
          max_members?: number | null
          name?: string | null
          region_restriction?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_last_message_sender_fkey"
            columns: ["last_message_sender"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      data_collectors: {
        Row: {
          approved_submissions: number | null
          assigned_areas: string[] | null
          created_at: string
          device_info: Json | null
          employee_id: string
          id: string
          is_active: boolean | null
          last_active_at: string | null
          pending_submissions: number | null
          region: string[] | null
          rejected_submissions: number | null
          supervisor_id: string | null
          total_submissions: number | null
          updated_at: string
          user_id: string
          vehicle_assigned: string | null
        }
        Insert: {
          approved_submissions?: number | null
          assigned_areas?: string[] | null
          created_at?: string
          device_info?: Json | null
          employee_id: string
          id?: string
          is_active?: boolean | null
          last_active_at?: string | null
          pending_submissions?: number | null
          region?: string[] | null
          rejected_submissions?: number | null
          supervisor_id?: string | null
          total_submissions?: number | null
          updated_at?: string
          user_id: string
          vehicle_assigned?: string | null
        }
        Update: {
          approved_submissions?: number | null
          assigned_areas?: string[] | null
          created_at?: string
          device_info?: Json | null
          employee_id?: string
          id?: string
          is_active?: boolean | null
          last_active_at?: string | null
          pending_submissions?: number | null
          region?: string[] | null
          rejected_submissions?: number | null
          supervisor_id?: string | null
          total_submissions?: number | null
          updated_at?: string
          user_id?: string
          vehicle_assigned?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_collectors_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "data_collectors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      delete_account_requests: {
        Row: {
          created_at: string
          data_export_generated_at: string | null
          data_export_requested_at: string | null
          data_export_url: string | null
          email: string
          grace_period_started_at: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data_export_generated_at?: string | null
          data_export_requested_at?: string | null
          data_export_url?: string | null
          email: string
          grace_period_started_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data_export_generated_at?: string | null
          data_export_requested_at?: string | null
          data_export_url?: string | null
          email?: string
          grace_period_started_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delete_account_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "delete_account_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "delete_account_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      device_attestation_log: {
        Row: {
          created_at: string
          id: string
          mechanism: string
          platform: string
          token_present: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mechanism?: string
          platform: string
          token_present?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mechanism?: string
          platform?: string
          token_present?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_attestation_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      device_sign_in_requests: {
        Row: {
          device_name: string | null
          expires_at: string
          expo_push_token: string | null
          id: string
          ip_address: unknown
          location_label: string | null
          os_version: string | null
          otp_attempts: number
          otp_expires_at: string | null
          otp_hash: string | null
          otp_issued_at: string | null
          platform: string | null
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          device_name?: string | null
          expires_at?: string
          expo_push_token?: string | null
          id?: string
          ip_address?: unknown
          location_label?: string | null
          os_version?: string | null
          otp_attempts?: number
          otp_expires_at?: string | null
          otp_hash?: string | null
          otp_issued_at?: string | null
          platform?: string | null
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          device_name?: string | null
          expires_at?: string
          expo_push_token?: string | null
          id?: string
          ip_address?: unknown
          location_label?: string | null
          os_version?: string | null
          otp_attempts?: number
          otp_expires_at?: string | null
          otp_hash?: string | null
          otp_issued_at?: string | null
          platform?: string | null
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_sign_in_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      discount_redemptions: {
        Row: {
          discount_id: string
          id: string
          redeemed_at: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          discount_id: string
          id?: string
          redeemed_at?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          discount_id?: string
          id?: string
          redeemed_at?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "marketing_discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      download_stats: {
        Row: {
          app_store_count: number | null
          created_at: string | null
          id: string
          play_store_count: number | null
        }
        Insert: {
          app_store_count?: number | null
          created_at?: string | null
          id?: string
          play_store_count?: number | null
        }
        Update: {
          app_store_count?: number | null
          created_at?: string | null
          id?: string
          play_store_count?: number | null
        }
        Relationships: []
      }
      drug_aliases: {
        Row: {
          alias: string
          alias_type: string | null
          drug_id: string
          id: string
        }
        Insert: {
          alias: string
          alias_type?: string | null
          drug_id: string
          id?: string
        }
        Update: {
          alias?: string
          alias_type?: string | null
          drug_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_aliases_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_body_part_rules: {
        Row: {
          body_part_name: string
          created_at: string
          id: string
          is_active: boolean
          match_value: string
          note: string | null
          rule_type: string
        }
        Insert: {
          body_part_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          match_value: string
          note?: string | null
          rule_type: string
        }
        Update: {
          body_part_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          match_value?: string
          note?: string | null
          rule_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_body_part_rules_body_part_name_fkey"
            columns: ["body_part_name"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["name"]
          },
        ]
      }
      drug_body_parts: {
        Row: {
          body_part_id: string
          drug_id: string
          source: string
        }
        Insert: {
          body_part_id: string
          drug_id: string
          source?: string
        }
        Update: {
          body_part_id?: string
          drug_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_body_parts_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_body_parts_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_import_batches: {
        Row: {
          created_at: string | null
          error_log: Json | null
          failed: number | null
          file_name: string
          id: string
          inserted: number | null
          skipped_duplicates: number | null
          status: string | null
          total_rows: number | null
          updated: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          error_log?: Json | null
          failed?: number | null
          file_name: string
          id?: string
          inserted?: number | null
          skipped_duplicates?: number | null
          status?: string | null
          total_rows?: number | null
          updated?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          error_log?: Json | null
          failed?: number | null
          file_name?: string
          id?: string
          inserted?: number | null
          skipped_duplicates?: number | null
          status?: string | null
          total_rows?: number | null
          updated?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_import_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      drug_interaction_flags: {
        Row: {
          flagged_at: string | null
          id: string
          interaction_id: string
          user_id: string | null
        }
        Insert: {
          flagged_at?: string | null
          id?: string
          interaction_id: string
          user_id?: string | null
        }
        Update: {
          flagged_at?: string | null
          id?: string
          interaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_interaction_flags_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "drug_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_interaction_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      drug_interactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          drug_a_id: string
          drug_b_id: string
          effect: string | null
          id: string
          is_active: boolean | null
          recommended_action: string | null
          severity: string
          source: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          drug_a_id: string
          drug_b_id: string
          effect?: string | null
          id?: string
          is_active?: boolean | null
          recommended_action?: string | null
          severity: string
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          drug_a_id?: string
          drug_b_id?: string
          effect?: string | null
          id?: string
          is_active?: boolean | null
          recommended_action?: string | null
          severity?: string
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_interactions_drug_a_id_fkey"
            columns: ["drug_a_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_interactions_drug_b_id_fkey"
            columns: ["drug_b_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_verification_requests: {
        Row: {
          auto_check_result: Json | null
          created_at: string | null
          entered_name: string
          id: string
          matched_drug_id: string | null
          reminder_id: string | null
          reviewed_at: string | null
          status: string | null
          user_id: string | null
          verified_by: string | null
        }
        Insert: {
          auto_check_result?: Json | null
          created_at?: string | null
          entered_name: string
          id?: string
          matched_drug_id?: string | null
          reminder_id?: string | null
          reviewed_at?: string | null
          status?: string | null
          user_id?: string | null
          verified_by?: string | null
        }
        Update: {
          auto_check_result?: Json | null
          created_at?: string | null
          entered_name?: string
          id?: string
          matched_drug_id?: string | null
          reminder_id?: string | null
          reviewed_at?: string | null
          status?: string | null
          user_id?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_verification_requests_matched_drug_id_fkey"
            columns: ["matched_drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_verification_requests_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "medication_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "drug_verification_requests_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      drugs: {
        Row: {
          active_ingredients: string[] | null
          atc_code: string | null
          availability: string | null
          category: string | null
          conditions_treated: string[] | null
          created_at: string | null
          dosage_form: string | null
          external_ids: Json | null
          generic_name: string | null
          id: string
          manufacturer: string | null
          metadata: Json | null
          name: string
          pack_size: number | null
          search_text: unknown
          slug: string | null
          source: string | null
          status: string | null
          strength: string | null
          strength_unit: string | null
          updated_at: string | null
        }
        Insert: {
          active_ingredients?: string[] | null
          atc_code?: string | null
          availability?: string | null
          category?: string | null
          conditions_treated?: string[] | null
          created_at?: string | null
          dosage_form?: string | null
          external_ids?: Json | null
          generic_name?: string | null
          id?: string
          manufacturer?: string | null
          metadata?: Json | null
          name: string
          pack_size?: number | null
          search_text?: unknown
          slug?: string | null
          source?: string | null
          status?: string | null
          strength?: string | null
          strength_unit?: string | null
          updated_at?: string | null
        }
        Update: {
          active_ingredients?: string[] | null
          atc_code?: string | null
          availability?: string | null
          category?: string | null
          conditions_treated?: string[] | null
          created_at?: string | null
          dosage_form?: string | null
          external_ids?: Json | null
          generic_name?: string | null
          id?: string
          manufacturer?: string | null
          metadata?: Json | null
          name?: string
          pack_size?: number | null
          search_text?: unknown
          slug?: string | null
          source?: string | null
          status?: string | null
          strength?: string | null
          strength_unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_suppressions: {
        Row: {
          email: string
          reason: string
          source_event: Json | null
          suppressed_at: string
        }
        Insert: {
          email: string
          reason: string
          source_event?: Json | null
          suppressed_at?: string
        }
        Update: {
          email?: string
          reason?: string
          source_event?: Json | null
          suppressed_at?: string
        }
        Relationships: []
      }
      enquiry_responses: {
        Row: {
          available: boolean
          created_at: string
          currency: string
          enquiry_id: string
          facility_id: string | null
          ibp_id: string | null
          id: string
          notes: string | null
          price: number | null
          responded_at: string
          responder_kind: string
          status: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          currency?: string
          enquiry_id: string
          facility_id?: string | null
          ibp_id?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          responded_at?: string
          responder_kind?: string
          status?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          currency?: string
          enquiry_id?: string
          facility_id?: string | null
          ibp_id?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          responded_at?: string
          responder_kind?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_responses_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "medication_enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_responses_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_responses_ibp_id_fkey"
            columns: ["ibp_id"]
            isOneToOne: false
            referencedRelation: "ibp"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          currency: string | null
          dispute_raised_at: string | null
          dispute_reason: string | null
          dispute_resolution: string | null
          dispute_resolved_at: string | null
          dispute_resolved_by: string | null
          enquiry_id: string
          held_at: string | null
          id: string
          metadata: Json | null
          payment_provider: string | null
          payment_provider_reference: string | null
          platform_fee: number | null
          refunded_at: string | null
          released_at: string | null
          released_to: string | null
          seller_id: string
          status: Database["public"]["Enums"]["escrow_status"] | null
          transaction_reference: string
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          currency?: string | null
          dispute_raised_at?: string | null
          dispute_reason?: string | null
          dispute_resolution?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          enquiry_id: string
          held_at?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          payment_provider_reference?: string | null
          platform_fee?: number | null
          refunded_at?: string | null
          released_at?: string | null
          released_to?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["escrow_status"] | null
          transaction_reference: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          currency?: string | null
          dispute_raised_at?: string | null
          dispute_reason?: string | null
          dispute_resolution?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          enquiry_id?: string
          held_at?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          payment_provider_reference?: string | null
          platform_fee?: number | null
          refunded_at?: string | null
          released_at?: string | null
          released_to?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["escrow_status"] | null
          transaction_reference?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "escrow_transactions_dispute_resolved_by_fkey"
            columns: ["dispute_resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "escrow_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exercise_logs: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          reps_completed: number
          rest_time_taken_seconds: number | null
          session_id: string
          set_number: number
          target_reps: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          reps_completed: number
          rest_time_taken_seconds?: number | null
          session_id: string
          set_number: number
          target_reps?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          reps_completed?: number
          rest_time_taken_seconds?: number | null
          session_id?: string
          set_number?: number
          target_reps?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "fitness_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exercise_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sessions: {
        Row: {
          activity_type: string | null
          created_at: string
          end_time: string | null
          evidence: string
          id: string
          intensity: string | null
          kcal_burned: number | null
          notes: string | null
          outdoor_event_id: string | null
          plan_day_id: string | null
          plan_id: string | null
          source: string
          start_time: string
          status: string
          total_duration_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          created_at?: string
          end_time?: string | null
          evidence?: string
          id?: string
          intensity?: string | null
          kcal_burned?: number | null
          notes?: string | null
          outdoor_event_id?: string | null
          plan_day_id?: string | null
          plan_id?: string | null
          source?: string
          start_time?: string
          status?: string
          total_duration_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string | null
          created_at?: string
          end_time?: string | null
          evidence?: string
          id?: string
          intensity?: string | null
          kcal_burned?: number | null
          notes?: string | null
          outdoor_event_id?: string | null
          plan_day_id?: string | null
          plan_id?: string | null
          source?: string
          start_time?: string
          status?: string
          total_duration_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sessions_outdoor_event_id_fkey"
            columns: ["outdoor_event_id"]
            isOneToOne: false
            referencedRelation: "fitness_outdoor_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sessions_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "fitness_plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "fitness_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exercise_views: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_views_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "fitness_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      facility_conversations: {
        Row: {
          conversation_id: string
          created_at: string | null
          facility_id: string
          id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          facility_id: string
          id?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          facility_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_conversations_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_favorites: {
        Row: {
          created_at: string | null
          facility_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          facility_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          facility_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_favorites_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      facility_offerings: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          duration_months: number | null
          facility_id: string
          id: string
          is_active: boolean | null
          name: string
          offering_type: Database["public"]["Enums"]["offering_type"]
          price: number
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_months?: number | null
          facility_id: string
          id?: string
          is_active?: boolean | null
          name: string
          offering_type: Database["public"]["Enums"]["offering_type"]
          price: number
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_months?: number | null
          facility_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          offering_type?: Database["public"]["Enums"]["offering_type"]
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "facility_offerings_facility_id_facility_profile_id_fk"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_profile: {
        Row: {
          accepts_nhis: boolean | null
          admin_notes: string | null
          amenities: Json | null
          approved_at: string | null
          approved_by: string | null
          area: string
          avg_rating: number | null
          business_hours: Json | null
          contact_number: string
          country: string
          created_at: string
          district: string
          email: string | null
          facility_name: string
          facility_type: string
          feature_end: string | null
          feature_start: string | null
          feature_type: string | null
          featured_image_url: string
          featured_order: number | null
          first_name: string
          gps_address: string
          hefra_registration_number: string | null
          id: string
          is_featured: boolean | null
          is_featured_paused: boolean
          is_top_rated: boolean | null
          keywords: Json | null
          last_name: string
          latitude: number
          location: unknown
          longitude: number
          media_urls: Json | null
          owner_email: string
          owner_id: string
          ownership: string
          person_contact_number: string
          position: string
          post_code: string
          rating_average: number | null
          rating_count: number | null
          region: Database["public"]["Enums"]["region_enum"]
          rejection_reason: string | null
          services: Json | null
          status: Database["public"]["Enums"]["facility_status_enum"]
          status_changed_at: string | null
          status_reason: string | null
          street: string
          submitted_by: string | null
          subscription_expires_at: string | null
          subscription_tier: string | null
          top_rated_rank: number | null
          top_rated_set_at: string | null
          top_rated_set_by: string | null
          updated_at: string | null
          verification_documents: Json | null
          view_count: number | null
          whatsapp_number: string
        }
        Insert: {
          accepts_nhis?: boolean | null
          admin_notes?: string | null
          amenities?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          area: string
          avg_rating?: number | null
          business_hours?: Json | null
          contact_number: string
          country?: string
          created_at?: string
          district: string
          email?: string | null
          facility_name: string
          facility_type: string
          feature_end?: string | null
          feature_start?: string | null
          feature_type?: string | null
          featured_image_url: string
          featured_order?: number | null
          first_name: string
          gps_address: string
          hefra_registration_number?: string | null
          id?: string
          is_featured?: boolean | null
          is_featured_paused?: boolean
          is_top_rated?: boolean | null
          keywords?: Json | null
          last_name: string
          latitude: number
          location?: unknown
          longitude: number
          media_urls?: Json | null
          owner_email: string
          owner_id: string
          ownership: string
          person_contact_number: string
          position: string
          post_code: string
          rating_average?: number | null
          rating_count?: number | null
          region?: Database["public"]["Enums"]["region_enum"]
          rejection_reason?: string | null
          services?: Json | null
          status?: Database["public"]["Enums"]["facility_status_enum"]
          status_changed_at?: string | null
          status_reason?: string | null
          street: string
          submitted_by?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          top_rated_rank?: number | null
          top_rated_set_at?: string | null
          top_rated_set_by?: string | null
          updated_at?: string | null
          verification_documents?: Json | null
          view_count?: number | null
          whatsapp_number: string
        }
        Update: {
          accepts_nhis?: boolean | null
          admin_notes?: string | null
          amenities?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          area?: string
          avg_rating?: number | null
          business_hours?: Json | null
          contact_number?: string
          country?: string
          created_at?: string
          district?: string
          email?: string | null
          facility_name?: string
          facility_type?: string
          feature_end?: string | null
          feature_start?: string | null
          feature_type?: string | null
          featured_image_url?: string
          featured_order?: number | null
          first_name?: string
          gps_address?: string
          hefra_registration_number?: string | null
          id?: string
          is_featured?: boolean | null
          is_featured_paused?: boolean
          is_top_rated?: boolean | null
          keywords?: Json | null
          last_name?: string
          latitude?: number
          location?: unknown
          longitude?: number
          media_urls?: Json | null
          owner_email?: string
          owner_id?: string
          ownership?: string
          person_contact_number?: string
          position?: string
          post_code?: string
          rating_average?: number | null
          rating_count?: number | null
          region?: Database["public"]["Enums"]["region_enum"]
          rejection_reason?: string | null
          services?: Json | null
          status?: Database["public"]["Enums"]["facility_status_enum"]
          status_changed_at?: string | null
          status_reason?: string | null
          street?: string
          submitted_by?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          top_rated_rank?: number | null
          top_rated_set_at?: string | null
          top_rated_set_by?: string | null
          updated_at?: string | null
          verification_documents?: Json | null
          view_count?: number | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_profile_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "facility_profile_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "facility_profile_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "facility_profile_top_rated_set_by_fkey"
            columns: ["top_rated_set_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      facility_reviews: {
        Row: {
          comment_text: string
          created_at: string | null
          facility_id: string
          helpful_count: number | null
          id: string
          is_anonymous: boolean
          is_verified_visit: boolean | null
          parent_id: string | null
          rating: number | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          facility_id: string
          helpful_count?: number | null
          id?: string
          is_anonymous?: boolean
          is_verified_visit?: boolean | null
          parent_id?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          facility_id?: string
          helpful_count?: number | null
          id?: string
          is_anonymous?: boolean
          is_verified_visit?: boolean | null
          parent_id?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_reviews_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_reviews_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "facility_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      facility_scout_config: {
        Row: {
          collector_auto_assign: boolean
          duplicate_detection: string
          gps_match_radius_m: number
          id: number
          max_pending_per_user: number
          photo_required: boolean
          reward_chps_mb: number
          reward_clinic_mb: number
          reward_disbursement: string
          reward_hospital_mb: number
          reward_lab_mb: number
          reward_pharmacy_mb: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          collector_auto_assign?: boolean
          duplicate_detection?: string
          gps_match_radius_m?: number
          id?: number
          max_pending_per_user?: number
          photo_required?: boolean
          reward_chps_mb?: number
          reward_clinic_mb?: number
          reward_disbursement?: string
          reward_hospital_mb?: number
          reward_lab_mb?: number
          reward_pharmacy_mb?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          collector_auto_assign?: boolean
          duplicate_detection?: string
          gps_match_radius_m?: number
          id?: number
          max_pending_per_user?: number
          photo_required?: boolean
          reward_chps_mb?: number
          reward_clinic_mb?: number
          reward_disbursement?: string
          reward_hospital_mb?: number
          reward_lab_mb?: number
          reward_pharmacy_mb?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_scout_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      facility_scout_referrals: {
        Row: {
          created_at: string
          delivery_phone: string | null
          delivery_status: string
          expiry_date: string | null
          id: string
          network: string | null
          referral_type: string
          referred_facility_id: string | null
          referred_user_id: string | null
          referrer_id: string
          reward_amount: number | null
          reward_mb: number | null
          reward_paid: boolean | null
          reward_paid_at: string | null
          status: string | null
          submission_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_phone?: string | null
          delivery_status?: string
          expiry_date?: string | null
          id?: string
          network?: string | null
          referral_type: string
          referred_facility_id?: string | null
          referred_user_id?: string | null
          referrer_id: string
          reward_amount?: number | null
          reward_mb?: number | null
          reward_paid?: boolean | null
          reward_paid_at?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_phone?: string | null
          delivery_status?: string
          expiry_date?: string | null
          id?: string
          network?: string | null
          referral_type?: string
          referred_facility_id?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          reward_amount?: number | null
          reward_mb?: number | null
          reward_paid?: boolean | null
          reward_paid_at?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_scout_referrals_referred_facility_id_fkey"
            columns: ["referred_facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_scout_referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "facility_scout_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "facility_scout_referrals_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "facility_scout_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_scout_submissions: {
        Row: {
          admin_notes: string | null
          assigned_collector_id: string | null
          created_at: string
          facility_name: string
          facility_type: string
          gps_location: string | null
          id: string
          match_status: string
          matched_facility_id: string | null
          photos: string[]
          priority: string
          region: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sla_due_at: string | null
          status: string
          submission_ref: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_collector_id?: string | null
          created_at?: string
          facility_name: string
          facility_type: string
          gps_location?: string | null
          id?: string
          match_status?: string
          matched_facility_id?: string | null
          photos?: string[]
          priority?: string
          region?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sla_due_at?: string | null
          status?: string
          submission_ref?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_collector_id?: string | null
          created_at?: string
          facility_name?: string
          facility_type?: string
          gps_location?: string | null
          id?: string
          match_status?: string
          matched_facility_id?: string | null
          photos?: string[]
          priority?: string
          region?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sla_due_at?: string | null
          status?: string
          submission_ref?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_scout_submissions_assigned_collector_id_fkey"
            columns: ["assigned_collector_id"]
            isOneToOne: false
            referencedRelation: "data_collectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_scout_submissions_matched_facility_id_fkey"
            columns: ["matched_facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_scout_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "facility_scout_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      facility_subscriptions: {
        Row: {
          auto_renew: boolean
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          facility_id: string
          id: string
          started_at: string
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          billing_cycle: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          facility_id: string
          id?: string
          started_at?: string
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          facility_id?: string
          id?: string
          started_at?: string
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_subscriptions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_subscriptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "marketing_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_categories: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          author_id: string | null
          category_id: string
          created_at: string
          helpful_count: number | null
          id: string
          is_featured: boolean | null
          not_helpful_count: number | null
          question: string
          status: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          answer: string
          author_id?: string | null
          category_id: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          not_helpful_count?: number | null
          question: string
          status?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          answer?: string
          author_id?: string | null
          category_id?: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          not_helpful_count?: number | null
          question?: string
          status?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faqs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "faqs_category_id_faq_categories_id_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          rollout_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          rollout_percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          rollout_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      finance_visibility_config: {
        Row: {
          metric_key: string
          updated_at: string
          updated_by: string | null
          visible_to_finance: boolean
        }
        Insert: {
          metric_key: string
          updated_at?: string
          updated_by?: string | null
          visible_to_finance?: boolean
        }
        Update: {
          metric_key?: string
          updated_at?: string
          updated_by?: string | null
          visible_to_finance?: boolean
        }
        Relationships: []
      }
      fitcoin_activity_tiers: {
        Row: {
          activity_key: string
          coins: number
          daily_cap: number | null
          id: string
          is_active: boolean
          label: string
          purpose: string | null
          updated_at: string
        }
        Insert: {
          activity_key: string
          coins?: number
          daily_cap?: number | null
          id?: string
          is_active?: boolean
          label: string
          purpose?: string | null
          updated_at?: string
        }
        Update: {
          activity_key?: string
          coins?: number
          daily_cap?: number | null
          id?: string
          is_active?: boolean
          label?: string
          purpose?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fitcoin_rewards: {
        Row: {
          cost: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          min_tier_id: string | null
          name: string
        }
        Insert: {
          cost: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_tier_id?: string | null
          name: string
        }
        Update: {
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_tier_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitcoin_rewards_min_tier_id_fkey"
            columns: ["min_tier_id"]
            isOneToOne: false
            referencedRelation: "fitcoin_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      fitcoin_rewards_redemption: {
        Row: {
          cost_at_redemption: number
          fulfilled_at: string | null
          id: string
          redeemed_at: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          cost_at_redemption: number
          fulfilled_at?: string | null
          id?: string
          redeemed_at?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          cost_at_redemption?: number
          fulfilled_at?: string | null
          id?: string
          redeemed_at?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitcoin_rewards_redemption_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "fitcoin_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitcoin_rewards_redemption_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitcoin_tiers: {
        Row: {
          benefits: Json | null
          created_at: string
          id: string
          min_lifetime_earned_required: number
          name: string
        }
        Insert: {
          benefits?: Json | null
          created_at?: string
          id?: string
          min_lifetime_earned_required: number
          name: string
        }
        Update: {
          benefits?: Json | null
          created_at?: string
          id?: string
          min_lifetime_earned_required?: number
          name?: string
        }
        Relationships: []
      }
      fitness_ai_calls: {
        Row: {
          ai_model_id: string | null
          cache_hit: boolean
          campaign_id: string | null
          created_at: string
          error_message: string | null
          estimated_cost: number | null
          id: string
          model_name: string
          prompt_snippet: string | null
          response_time_ms: number | null
          status: string | null
          token_usage: number | null
          user_id: string | null
        }
        Insert: {
          ai_model_id?: string | null
          cache_hit?: boolean
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          model_name: string
          prompt_snippet?: string | null
          response_time_ms?: number | null
          status?: string | null
          token_usage?: number | null
          user_id?: string | null
        }
        Update: {
          ai_model_id?: string | null
          cache_hit?: boolean
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          model_name?: string
          prompt_snippet?: string | null
          response_time_ms?: number | null
          status?: string | null
          token_usage?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_ai_calls_ai_model_id_fkey"
            columns: ["ai_model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_ai_calls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "fitness_ai_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_ai_calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_ai_campaigns: {
        Row: {
          campaign_status: Database["public"]["Enums"]["campaign_status"] | null
          context_data: Json
          created_at: string
          created_by: string | null
          id: string
          model_type: string
          result_data: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          campaign_status?:
            | Database["public"]["Enums"]["campaign_status"]
            | null
          context_data: Json
          created_at?: string
          created_by?: string | null
          id?: string
          model_type: string
          result_data?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          campaign_status?:
            | Database["public"]["Enums"]["campaign_status"]
            | null
          context_data?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          model_type?: string
          result_data?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_ai_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_body_parts: {
        Row: {
          body_part_id: string
          created_at: string
          source: string
          workout_id: string
        }
        Insert: {
          body_part_id: string
          created_at?: string
          source?: string
          workout_id: string
        }
        Update: {
          body_part_id?: string
          created_at?: string
          source?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_body_parts_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_body_parts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "fitness_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_challenge_entries: {
        Row: {
          challenge_id: string
          created_at: string
          entry_date: string
          id: string
          notes: string | null
          participant_id: string
          source: string
          user_id: string
          value: number
        }
        Insert: {
          challenge_id: string
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          participant_id: string
          source?: string
          user_id: string
          value: number
        }
        Update: {
          challenge_id?: string
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          participant_id?: string
          source?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "fitness_challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_challenge_entries_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenge_leaderboard"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "fitness_challenge_entries_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenge_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_challenge_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string | null
          progress_pct: number | null
          status: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string | null
          progress_pct?: number | null
          status?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string | null
          progress_pct?: number | null
          status?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_challenge_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenge_team_leaderboard"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fitness_challenge_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenge_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_challenge_teams: {
        Row: {
          avatar_url: string | null
          captain_id: string | null
          challenge_id: string
          created_at: string
          id: string
          max_members: number | null
          member_count: number
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          captain_id?: string | null
          challenge_id: string
          created_at?: string
          id?: string
          max_members?: number | null
          member_count?: number
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          captain_id?: string | null
          challenge_id?: string
          created_at?: string
          id?: string
          max_members?: number | null
          member_count?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_challenge_teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fitness_challenge_teams_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_challenges: {
        Row: {
          challenge_type: string
          completion_count: number | null
          created_at: string
          created_by: string | null
          current_participants: number | null
          description: string | null
          end_date: string
          featured_image_url: string | null
          goal_metric: string | null
          goal_value: number | null
          id: string
          is_public: boolean | null
          max_participants: number | null
          reward_description: string | null
          reward_image_url: string | null
          start_date: string
          status: Database["public"]["Enums"]["challenge_status"] | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          challenge_type: string
          completion_count?: number | null
          created_at?: string
          created_by?: string | null
          current_participants?: number | null
          description?: string | null
          end_date: string
          featured_image_url?: string | null
          goal_metric?: string | null
          goal_value?: number | null
          id?: string
          is_public?: boolean | null
          max_participants?: number | null
          reward_description?: string | null
          reward_image_url?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["challenge_status"] | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          challenge_type?: string
          completion_count?: number | null
          created_at?: string
          created_by?: string | null
          current_participants?: number | null
          description?: string | null
          end_date?: string
          featured_image_url?: string | null
          goal_metric?: string | null
          goal_value?: number | null
          id?: string
          is_public?: boolean | null
          max_participants?: number | null
          reward_description?: string | null
          reward_image_url?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["challenge_status"] | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "fitness_challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_content_schedule: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["broadcast_status"] | null
          target_audience: Database["public"]["Enums"]["broadcast_type"] | null
          updated_at: string
        }
        Insert: {
          content_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["broadcast_status"] | null
          target_audience?: Database["public"]["Enums"]["broadcast_type"] | null
          updated_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["broadcast_status"] | null
          target_audience?: Database["public"]["Enums"]["broadcast_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_content_schedule_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_dashboard_cache: {
        Row: {
          id: number
          kpi_payload: Json
          last_updated: string
        }
        Insert: {
          id?: number
          kpi_payload: Json
          last_updated?: string
        }
        Update: {
          id?: number
          kpi_payload?: Json
          last_updated?: string
        }
        Relationships: []
      }
      fitness_exercises: {
        Row: {
          benefits: string | null
          category: string
          completion_count: number
          created_at: string
          default_reps_duration: string | null
          default_sets: string | null
          description: string | null
          difficulty_level: string | null
          equipment_required: string
          exercise_name: string
          id: string
          is_active: boolean
          is_featured: boolean
          met_value: number | null
          muscles_worked_raw: string | null
          primary_muscle_group: string
          rest_time_seconds: string | null
          secondary_muscles: string | null
          status: string
          tags: string[]
          thumbnail_url: string | null
          tier: string
          updated_at: string
          video_url: string | null
          view_count: number
        }
        Insert: {
          benefits?: string | null
          category: string
          completion_count?: number
          created_at?: string
          default_reps_duration?: string | null
          default_sets?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment_required: string
          exercise_name: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          met_value?: number | null
          muscles_worked_raw?: string | null
          primary_muscle_group: string
          rest_time_seconds?: string | null
          secondary_muscles?: string | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          tier?: string
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Update: {
          benefits?: string | null
          category?: string
          completion_count?: number
          created_at?: string
          default_reps_duration?: string | null
          default_sets?: string | null
          description?: string | null
          difficulty_level?: string | null
          equipment_required?: string
          exercise_name?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          met_value?: number | null
          muscles_worked_raw?: string | null
          primary_muscle_group?: string
          rest_time_seconds?: string | null
          secondary_muscles?: string | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          tier?: string
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Relationships: []
      }
      fitness_generated_workouts: {
        Row: {
          created_at: string
          generated_by: string
          id: string
          selection_hash: string
          workout_plan: Json
        }
        Insert: {
          created_at?: string
          generated_by?: string
          id?: string
          selection_hash: string
          workout_plan: Json
        }
        Update: {
          created_at?: string
          generated_by?: string
          id?: string
          selection_hash?: string
          workout_plan?: Json
        }
        Relationships: []
      }
      fitness_health_platforms: {
        Row: {
          config_data: Json | null
          created_at: string
          id: string
          is_enabled: boolean | null
          platform_name: string
          sync_frequency_mins: number | null
          updated_at: string
        }
        Insert: {
          config_data?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          platform_name: string
          sync_frequency_mins?: number | null
          updated_at?: string
        }
        Update: {
          config_data?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          platform_name?: string
          sync_frequency_mins?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      fitness_health_sync_logs: {
        Row: {
          error_details: string | null
          id: string
          platform_id: string | null
          retry_count: number | null
          status: string | null
          synced_at: string
          user_id: string | null
        }
        Insert: {
          error_details?: string | null
          id?: string
          platform_id?: string | null
          retry_count?: number | null
          status?: string | null
          synced_at?: string
          user_id?: string | null
        }
        Update: {
          error_details?: string | null
          id?: string
          platform_id?: string | null
          retry_count?: number | null
          status?: string | null
          synced_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_health_sync_logs_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "fitness_health_platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_health_sync_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_leaderboards: {
        Row: {
          id: string
          period: string
          rank_position: number | null
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          period: string
          rank_position?: number | null
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          period?: string
          rank_position?: number | null
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_onboarding_selections: {
        Row: {
          age: number | null
          body_type: string | null
          created_at: string
          equipment: string[]
          equipment_access: string | null
          fitness_goals: string[]
          fitness_level: string
          focus_areas: string[]
          height_cm: number | null
          id: string
          selection_hash: string
          subscription_length: number | null
          target_body_shape: string | null
          unit_system: string
          user_id: string
          weight_kg: number | null
          workout_days: string[]
          workout_duration: number | null
          workout_locations: string[]
          workout_types: string[]
          workout_weeks: number | null
        }
        Insert: {
          age?: number | null
          body_type?: string | null
          created_at?: string
          equipment?: string[]
          equipment_access?: string | null
          fitness_goals?: string[]
          fitness_level: string
          focus_areas?: string[]
          height_cm?: number | null
          id?: string
          selection_hash: string
          subscription_length?: number | null
          target_body_shape?: string | null
          unit_system?: string
          user_id: string
          weight_kg?: number | null
          workout_days?: string[]
          workout_duration?: number | null
          workout_locations?: string[]
          workout_types?: string[]
          workout_weeks?: number | null
        }
        Update: {
          age?: number | null
          body_type?: string | null
          created_at?: string
          equipment?: string[]
          equipment_access?: string | null
          fitness_goals?: string[]
          fitness_level?: string
          focus_areas?: string[]
          height_cm?: number | null
          id?: string
          selection_hash?: string
          subscription_length?: number | null
          target_body_shape?: string | null
          unit_system?: string
          user_id?: string
          weight_kg?: number | null
          workout_days?: string[]
          workout_duration?: number | null
          workout_locations?: string[]
          workout_types?: string[]
          workout_weeks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_onboarding_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_outdoor_event_participants: {
        Row: {
          event_id: string
          id: string
          joined_at: string
          session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          joined_at?: string
          session_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          joined_at?: string
          session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_outdoor_event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "fitness_outdoor_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_outdoor_event_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exercise_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_outdoor_event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_outdoor_event_registrations: {
        Row: {
          event_id: string
          id: number
          registered_at: string
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: never
          registered_at?: string
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: never
          registered_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_outdoor_event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "fitness_outdoor_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_outdoor_event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_outdoor_events: {
        Row: {
          area: string | null
          category: string | null
          created_at: string
          created_by: string | null
          current_participants: number | null
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          max_participants: number | null
          route_id: string | null
          start_at: string
          status: Database["public"]["Enums"]["challenge_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_participants?: number | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          max_participants?: number | null
          route_id?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["challenge_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_participants?: number | null
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          max_participants?: number | null
          route_id?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["challenge_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_outdoor_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fitness_outdoor_events_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "fitness_outdoor_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_outdoor_incentives: {
        Row: {
          base_fitcoins: number
          event_bonus: number
          id: boolean
          notes: string | null
          per_km_fitcoins: number
          updated_at: string
          updated_by: string | null
          verification_bonus: number
        }
        Insert: {
          base_fitcoins?: number
          event_bonus?: number
          id?: boolean
          notes?: string | null
          per_km_fitcoins?: number
          updated_at?: string
          updated_by?: string | null
          verification_bonus?: number
        }
        Update: {
          base_fitcoins?: number
          event_bonus?: number
          id?: boolean
          notes?: string | null
          per_km_fitcoins?: number
          updated_at?: string
          updated_by?: string | null
          verification_bonus?: number
        }
        Relationships: [
          {
            foreignKeyName: "fitness_outdoor_incentives_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_outdoor_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_flagged: boolean | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          rating: number | null
          route_id: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_flagged?: boolean | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          rating?: number | null
          route_id?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_flagged?: boolean | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          rating?: number | null
          route_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_outdoor_reviews_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "fitness_outdoor_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_outdoor_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_outdoor_routes: {
        Row: {
          area: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["threat_level"] | null
          distance_km: number | null
          estimated_duration_mins: number | null
          features: string[]
          fitcoins_reward: number
          gps_data: Json | null
          id: string
          image_url: string[] | null
          is_active: boolean | null
          name: string
          region: string | null
          registered_by: string | null
          route_class: string | null
          start_lat: number | null
          start_lng: number | null
          surface_type: string | null
          updated_at: string
          verification_note: string | null
          verification_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          area?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["threat_level"] | null
          distance_km?: number | null
          estimated_duration_mins?: number | null
          features?: string[]
          fitcoins_reward?: number
          gps_data?: Json | null
          id?: string
          image_url?: string[] | null
          is_active?: boolean | null
          name: string
          region?: string | null
          registered_by?: string | null
          route_class?: string | null
          start_lat?: number | null
          start_lng?: number | null
          surface_type?: string | null
          updated_at?: string
          verification_note?: string | null
          verification_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          area?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["threat_level"] | null
          distance_km?: number | null
          estimated_duration_mins?: number | null
          features?: string[]
          fitcoins_reward?: number
          gps_data?: Json | null
          id?: string
          image_url?: string[] | null
          is_active?: boolean | null
          name?: string
          region?: string | null
          registered_by?: string | null
          route_class?: string | null
          start_lat?: number | null
          start_lng?: number | null
          surface_type?: string | null
          updated_at?: string
          verification_note?: string | null
          verification_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_outdoor_routes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fitness_outdoor_routes_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_plan_days: {
        Row: {
          created_at: string
          day_category: string | null
          day_number: number
          duration_minutes: number | null
          id: string
          is_rest: boolean
          plan_id: string
          target_muscles: string[]
          title: string
          updated_at: string
          week_number: number
        }
        Insert: {
          created_at?: string
          day_category?: string | null
          day_number: number
          duration_minutes?: number | null
          id?: string
          is_rest?: boolean
          plan_id: string
          target_muscles?: string[]
          title: string
          updated_at?: string
          week_number: number
        }
        Update: {
          created_at?: string
          day_category?: string | null
          day_number?: number
          duration_minutes?: number | null
          id?: string
          is_rest?: boolean
          plan_id?: string
          target_muscles?: string[]
          title?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "fitness_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "fitness_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_plan_exercises: {
        Row: {
          created_at: string
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          plan_day_id: string | null
          plan_id: string
          reps: string | null
          rest_seconds: number | null
          sets: number | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index: number
          plan_day_id?: string | null
          plan_id: string
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          plan_day_id?: string | null
          plan_id?: string
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "fitness_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_plan_exercises_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "fitness_plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "fitness_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_plans: {
        Row: {
          author_id: string | null
          author_type: string | null
          average_rating: number | null
          coach_display_name: string | null
          created_at: string
          description: string | null
          difficulty_level: string
          duration_weeks: number
          goals: string[] | null
          id: string
          is_featured: boolean | null
          is_premium: boolean | null
          rating_count: number | null
          selection_hash: string | null
          status: string | null
          style_tag: string | null
          tags: string[] | null
          target_body_parts: string[] | null
          title: string
          total_completions: number | null
          updated_at: string
          workouts_per_week: number
        }
        Insert: {
          author_id?: string | null
          author_type?: string | null
          average_rating?: number | null
          coach_display_name?: string | null
          created_at?: string
          description?: string | null
          difficulty_level: string
          duration_weeks: number
          goals?: string[] | null
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          rating_count?: number | null
          selection_hash?: string | null
          status?: string | null
          style_tag?: string | null
          tags?: string[] | null
          target_body_parts?: string[] | null
          title: string
          total_completions?: number | null
          updated_at?: string
          workouts_per_week: number
        }
        Update: {
          author_id?: string | null
          author_type?: string | null
          average_rating?: number | null
          coach_display_name?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string
          duration_weeks?: number
          goals?: string[] | null
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          rating_count?: number | null
          selection_hash?: string | null
          status?: string | null
          style_tag?: string | null
          tags?: string[] | null
          target_body_parts?: string[] | null
          title?: string
          total_completions?: number | null
          updated_at?: string
          workouts_per_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_trainers: {
        Row: {
          availability_schedule: Json | null
          bio: string | null
          certifications: string[] | null
          created_at: string
          id: string
          is_verified: boolean | null
          profile_video_url: string | null
          rating_average: number | null
          rating_count: number | null
          social_links: Json | null
          specialties: string[] | null
          status: string | null
          total_clients: number | null
          total_sessions: number | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
          years_experience: number | null
        }
        Insert: {
          availability_schedule?: Json | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          profile_video_url?: string | null
          rating_average?: number | null
          rating_count?: number | null
          social_links?: Json | null
          specialties?: string[] | null
          status?: string | null
          total_clients?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
          years_experience?: number | null
        }
        Update: {
          availability_schedule?: Json | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          profile_video_url?: string | null
          rating_average?: number | null
          rating_count?: number | null
          social_links?: Json | null
          specialties?: string[] | null
          status?: string | null
          total_clients?: number | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_trainers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fitness_trainers_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_user_assignments: {
        Row: {
          completed_at: string | null
          created_at: string
          current_day_number: number
          current_week: number
          id: string
          plan_id: string
          started_at: string
          status: string
          streak_weeks: number
          total_lbs_lifted: number
          total_minutes_invested: number
          total_workouts_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_day_number?: number
          current_week?: number
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          streak_weeks?: number
          total_lbs_lifted?: number
          total_minutes_invested?: number
          total_workouts_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_day_number?: number
          current_week?: number
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          streak_weeks?: number
          total_lbs_lifted?: number
          total_minutes_invested?: number
          total_workouts_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_user_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "fitness_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_user_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_user_streaks: {
        Row: {
          best_streak: number
          current_streak: number
          last_active_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          current_streak?: number
          last_active_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          current_streak?: number
          last_active_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_whatsapp_broadcasts: {
        Row: {
          broadcast_type: Database["public"]["Enums"]["broadcast_type"] | null
          created_at: string
          created_by: string | null
          group_id: string | null
          id: string
          message: string
          open_rate: number | null
          sent_at: string | null
          sent_to_count: number | null
          status: Database["public"]["Enums"]["broadcast_status"] | null
        }
        Insert: {
          broadcast_type?: Database["public"]["Enums"]["broadcast_type"] | null
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          message: string
          open_rate?: number | null
          sent_at?: string | null
          sent_to_count?: number | null
          status?: Database["public"]["Enums"]["broadcast_status"] | null
        }
        Update: {
          broadcast_type?: Database["public"]["Enums"]["broadcast_type"] | null
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          message?: string
          open_rate?: number | null
          sent_at?: string | null
          sent_to_count?: number | null
          status?: Database["public"]["Enums"]["broadcast_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_whatsapp_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fitness_whatsapp_broadcasts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "fitness_whatsapp_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_whatsapp_groups: {
        Row: {
          created_at: string
          description: string | null
          group_type: string | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
          member_count: number | null
          name: string
          status: Database["public"]["Enums"]["moderation_status"] | null
          updated_at: string
          whatsapp_link: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_type?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          member_count?: number | null
          name: string
          status?: Database["public"]["Enums"]["moderation_status"] | null
          updated_at?: string
          whatsapp_link?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          group_type?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          member_count?: number | null
          name?: string
          status?: Database["public"]["Enums"]["moderation_status"] | null
          updated_at?: string
          whatsapp_link?: string | null
        }
        Relationships: []
      }
      hcp_digital_cvs: {
        Row: {
          consent: Json
          created_at: string
          documents: Json
          employment_status: string | null
          id: string
          licence_body: string | null
          open_to_offers: boolean
          qualification: string | null
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consent?: Json
          created_at?: string
          documents?: Json
          employment_status?: string | null
          id?: string
          licence_body?: string | null
          open_to_offers?: boolean
          qualification?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consent?: Json
          created_at?: string
          documents?: Json
          employment_status?: string | null
          id?: string
          licence_body?: string | null
          open_to_offers?: boolean
          qualification?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hcp_digital_cvs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      hcp_verifications: {
        Row: {
          affiliated_facility_id: string | null
          affiliated_facility_name: string | null
          can_respond_enquiries: boolean
          created_at: string
          documents: Json | null
          group_chat_id: string | null
          id: string
          issuing_body: string
          license_expiry: string
          license_number: string
          license_type: string
          next_verification_due: string | null
          profession_type: string | null
          region: Database["public"]["Enums"]["region_enum"] | null
          rejection_reason: string | null
          specialty: string | null
          updated_at: string
          user_id: string
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
          year_licensed: number | null
          years_of_practice: number | null
        }
        Insert: {
          affiliated_facility_id?: string | null
          affiliated_facility_name?: string | null
          can_respond_enquiries?: boolean
          created_at?: string
          documents?: Json | null
          group_chat_id?: string | null
          id?: string
          issuing_body: string
          license_expiry: string
          license_number: string
          license_type: string
          next_verification_due?: string | null
          profession_type?: string | null
          region?: Database["public"]["Enums"]["region_enum"] | null
          rejection_reason?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          year_licensed?: number | null
          years_of_practice?: number | null
        }
        Update: {
          affiliated_facility_id?: string | null
          affiliated_facility_name?: string | null
          can_respond_enquiries?: boolean
          created_at?: string
          documents?: Json | null
          group_chat_id?: string | null
          id?: string
          issuing_body?: string
          license_expiry?: string
          license_number?: string
          license_type?: string
          next_verification_due?: string | null
          profession_type?: string | null
          region?: Database["public"]["Enums"]["region_enum"] | null
          rejection_reason?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          year_licensed?: number | null
          years_of_practice?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hcp_verifications_affiliated_facility_id_fkey"
            columns: ["affiliated_facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hcp_verifications_group_chat_id_fkey"
            columns: ["group_chat_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hcp_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hcp_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      healthy_living_body_parts: {
        Row: {
          body_part_id: string
          created_at: string
          source: string
          tip_id: string
        }
        Insert: {
          body_part_id: string
          created_at?: string
          source?: string
          tip_id: string
        }
        Update: {
          body_part_id?: string
          created_at?: string
          source?: string
          tip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "healthy_living_body_parts_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healthy_living_body_parts_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "healthy_living_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healthy_living_body_parts_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "healthy_living_info_view"
            referencedColumns: ["id"]
          },
        ]
      }
      healthy_living_categories: {
        Row: {
          category_id: string
          healthy_living_id: string
        }
        Insert: {
          category_id: string
          healthy_living_id: string
        }
        Update: {
          category_id?: string
          healthy_living_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "healthy_living_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healthy_living_categories_healthy_living_id_fkey"
            columns: ["healthy_living_id"]
            isOneToOne: false
            referencedRelation: "healthy_living_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healthy_living_categories_healthy_living_id_fkey"
            columns: ["healthy_living_id"]
            isOneToOne: false
            referencedRelation: "healthy_living_info_view"
            referencedColumns: ["id"]
          },
        ]
      }
      healthy_living_info: {
        Row: {
          attribution: Json
          content: Json
          created_at: string | null
          description: string | null
          featured_from: string | null
          featured_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          metadata: Json
          name: string
          slug: string
          status: string
          updated_at: string
          view_count: number
        }
        Insert: {
          attribution?: Json
          content?: Json
          created_at?: string | null
          description?: string | null
          featured_from?: string | null
          featured_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          metadata?: Json
          name: string
          slug: string
          status?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          attribution?: Json
          content?: Json
          created_at?: string | null
          description?: string | null
          featured_from?: string | null
          featured_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          metadata?: Json
          name?: string
          slug?: string
          status?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      healthy_living_views: {
        Row: {
          created_at: string | null
          healthy_living_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          healthy_living_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          healthy_living_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "healthy_living_views_healthy_living_id_fkey"
            columns: ["healthy_living_id"]
            isOneToOne: false
            referencedRelation: "healthy_living_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healthy_living_views_healthy_living_id_fkey"
            columns: ["healthy_living_id"]
            isOneToOne: false
            referencedRelation: "healthy_living_info_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healthy_living_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ibp: {
        Row: {
          admin_notes: string | null
          area: string
          branches: number | null
          business_category: string
          business_name: string
          business_registration_number: string | null
          campaign_budget: number | null
          city: string
          country: string
          created_at: string
          district: string
          featured_until: string | null
          founded_year: number | null
          gps_address: string
          id: string
          is_featured: boolean | null
          latitude: number | null
          longitude: number | null
          phone_number: string
          post_code: string | null
          region: string
          registration_docs: Json | null
          rejection_reason: string | null
          specific_category: string
          status: Database["public"]["Enums"]["ibp_status"]
          street: string
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          tin_number: string | null
          total_spend: number | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
          website: string | null
          whatsapp_number: string | null
        }
        Insert: {
          admin_notes?: string | null
          area: string
          branches?: number | null
          business_category: string
          business_name: string
          business_registration_number?: string | null
          campaign_budget?: number | null
          city: string
          country?: string
          created_at?: string
          district: string
          featured_until?: string | null
          founded_year?: number | null
          gps_address: string
          id?: string
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          phone_number: string
          post_code?: string | null
          region: string
          registration_docs?: Json | null
          rejection_reason?: string | null
          specific_category: string
          status?: Database["public"]["Enums"]["ibp_status"]
          street: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          tin_number?: string | null
          total_spend?: number | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          admin_notes?: string | null
          area?: string
          branches?: number | null
          business_category?: string
          business_name?: string
          business_registration_number?: string | null
          campaign_budget?: number | null
          city?: string
          country?: string
          created_at?: string
          district?: string
          featured_until?: string | null
          founded_year?: number | null
          gps_address?: string
          id?: string
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          phone_number?: string
          post_code?: string | null
          region?: string
          registration_docs?: Json | null
          rejection_reason?: string | null
          specific_category?: string
          status?: Database["public"]["Enums"]["ibp_status"]
          street?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          tin_number?: string | null
          total_spend?: number | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ibp_user_id_user_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ibp_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ibp_activity_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          ibp_id: string
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          ibp_id: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          ibp_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ibp_activity_log_ibp_id_fkey"
            columns: ["ibp_id"]
            isOneToOne: false
            referencedRelation: "ibp"
            referencedColumns: ["id"]
          },
        ]
      }
      ibp_products: {
        Row: {
          category: string | null
          created_at: string | null
          ibp_id: string
          id: string
          image_url: string | null
          name: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          ibp_id: string
          id?: string
          image_url?: string | null
          name: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          ibp_id?: string
          id?: string
          image_url?: string | null
          name?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ibp_products_ibp_id_fkey"
            columns: ["ibp_id"]
            isOneToOne: false
            referencedRelation: "ibp"
            referencedColumns: ["id"]
          },
        ]
      }
      infra_cost_budgets: {
        Row: {
          budget_30d: number
          created_at: string
          id: string
          notes: string | null
          provider: string
          service: string
          usage_30d: number | null
        }
        Insert: {
          budget_30d?: number
          created_at?: string
          id?: string
          notes?: string | null
          provider: string
          service: string
          usage_30d?: number | null
        }
        Update: {
          budget_30d?: number
          created_at?: string
          id?: string
          notes?: string | null
          provider?: string
          service?: string
          usage_30d?: number | null
        }
        Relationships: []
      }
      job_alert_notifications: {
        Row: {
          id: string
          job_id: string
          notified_at: string
          user_id: string
        }
        Insert: {
          id?: string
          job_id: string
          notified_at?: string
          user_id: string
        }
        Update: {
          id?: string
          job_id?: string
          notified_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_alert_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alerts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          job_types: string[]
          latitude: number | null
          longitude: number | null
          radius_km: number | null
          regions: string[]
          specialties: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          job_types?: string[]
          latitude?: number | null
          longitude?: number | null
          radius_km?: number | null
          regions?: string[]
          specialties?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          job_types?: string[]
          latitude?: number | null
          longitude?: number | null
          radius_km?: number | null
          regions?: string[]
          specialties?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: string
          applicant_type: string
          consent: Json
          cover_letter: string | null
          created_at: string
          highest_qualification: string | null
          id: string
          is_boosted: boolean
          job_id: string
          languages: string[]
          licence_pin: string | null
          national_id: string | null
          portfolio_url: string | null
          profession: string | null
          resume_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          skills: string[]
          specialization: string | null
          status: string | null
          updated_at: string
          years_experience_band: string | null
        }
        Insert: {
          applicant_id: string
          applicant_type?: string
          consent?: Json
          cover_letter?: string | null
          created_at?: string
          highest_qualification?: string | null
          id?: string
          is_boosted?: boolean
          job_id: string
          languages?: string[]
          licence_pin?: string | null
          national_id?: string | null
          portfolio_url?: string | null
          profession?: string | null
          resume_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills?: string[]
          specialization?: string | null
          status?: string | null
          updated_at?: string
          years_experience_band?: string | null
        }
        Update: {
          applicant_id?: string
          applicant_type?: string
          consent?: Json
          cover_letter?: string | null
          created_at?: string
          highest_qualification?: string | null
          id?: string
          is_boosted?: boolean
          job_id?: string
          languages?: string[]
          licence_pin?: string | null
          national_id?: string | null
          portfolio_url?: string | null
          profession?: string | null
          resume_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills?: string[]
          specialization?: string | null
          status?: string | null
          updated_at?: string
          years_experience_band?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      job_postings: {
        Row: {
          application_count: number | null
          application_url: string | null
          approved_at: string | null
          approved_by: string | null
          contact_email: string | null
          created_at: string
          created_by: string | null
          description: string | null
          distance_radius_km: number | null
          experience_level: string | null
          expires_at: string | null
          facility_id: string
          featured_until: string | null
          id: string
          is_featured: boolean
          job_type: string
          location: string | null
          min_experience_years: number | null
          minimum_qualification: string | null
          posting_rejection_reason: string | null
          published_at: string | null
          region: string | null
          required_licence: string | null
          requirements: string[] | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          specialty: string | null
          status: string | null
          target_demographics: Json
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          application_count?: number | null
          application_url?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          distance_radius_km?: number | null
          experience_level?: string | null
          expires_at?: string | null
          facility_id: string
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          job_type: string
          location?: string | null
          min_experience_years?: number | null
          minimum_qualification?: string | null
          posting_rejection_reason?: string | null
          published_at?: string | null
          region?: string | null
          required_licence?: string | null
          requirements?: string[] | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          specialty?: string | null
          status?: string | null
          target_demographics?: Json
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          application_count?: number | null
          application_url?: string | null
          approved_at?: string | null
          approved_by?: string | null
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          distance_radius_km?: number | null
          experience_level?: string | null
          expires_at?: string | null
          facility_id?: string
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          job_type?: string
          location?: string | null
          min_experience_years?: number | null
          minimum_qualification?: string | null
          posting_rejection_reason?: string | null
          published_at?: string | null
          region?: string | null
          required_licence?: string | null
          requirements?: string[] | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          specialty?: string | null
          status?: string | null
          target_demographics?: Json
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_postings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_postings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      job_saved: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_saved_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_saved_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      legal_holds: {
        Row: {
          id: string
          matter_reference: string | null
          placed_at: string
          placed_by: string | null
          reason: string
          released_at: string | null
          released_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          matter_reference?: string | null
          placed_at?: string
          placed_by?: string | null
          reason: string
          released_at?: string | null
          released_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          matter_reference?: string | null
          placed_at?: string
          placed_by?: string | null
          reason?: string
          released_at?: string | null
          released_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      maintenance_history: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          message: string | null
          toggled_by: string
        }
        Insert: {
          created_at?: string
          enabled: boolean
          id?: string
          message?: string | null
          toggled_by: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          message?: string | null
          toggled_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_history_toggled_by_fkey"
            columns: ["toggled_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      map_collectors: {
        Row: {
          assigned_region: string | null
          created_at: string
          gps_status: string
          id: number
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_region?: string | null
          created_at?: string
          gps_status?: string
          id?: never
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_region?: string | null
          created_at?: string
          gps_status?: string
          id?: never
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_collectors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      map_priority_regions: {
        Row: {
          prioritized_at: string
          prioritized_by: string | null
          region: string
        }
        Insert: {
          prioritized_at?: string
          prioritized_by?: string | null
          region: string
        }
        Update: {
          prioritized_at?: string
          prioritized_by?: string | null
          region?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_priority_regions_prioritized_by_fkey"
            columns: ["prioritized_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      map_rpc_throttle: {
        Row: {
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      marketing_discounts: {
        Row: {
          applicable_items: Json | null
          applies_to: string | null
          approved_at: string | null
          approved_by: string | null
          campaign_id: string | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          eligible_plans: string[]
          eligible_users: string
          id: string
          is_active: boolean | null
          max_uses: number | null
          name: string
          per_user_limit: number | null
          status: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_items?: Json | null
          applies_to?: string | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          eligible_plans?: string[]
          eligible_users?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name: string
          per_user_limit?: number | null
          status?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          applicable_items?: Json | null
          applies_to?: string | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          eligible_plans?: string[]
          eligible_users?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name?: string
          per_user_limit?: number | null
          status?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_discounts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketing_discounts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_discounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketing_profile: {
        Row: {
          approved_end_date: string | null
          approved_start_date: string | null
          budget: number | null
          campaign_type: string | null
          channels: string[]
          clicks: number
          conversions: number
          createdAt: string
          cta: string
          description: string
          endDate: string
          ends_at: string | null
          headline: string
          id: string
          imageUrl: string
          impressions: number
          links: Json | null
          marketingType: Database["public"]["Enums"]["marketing_type_enum"]
          organization: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          startDate: string
          starts_at: string | null
          status: Database["public"]["Enums"]["marketing_status_enum"]
          submitted_by_business: string | null
          target_segment: string | null
          updatedAt: string
        }
        Insert: {
          approved_end_date?: string | null
          approved_start_date?: string | null
          budget?: number | null
          campaign_type?: string | null
          channels?: string[]
          clicks?: number
          conversions?: number
          createdAt?: string
          cta: string
          description: string
          endDate: string
          ends_at?: string | null
          headline: string
          id?: string
          imageUrl: string
          impressions?: number
          links?: Json | null
          marketingType: Database["public"]["Enums"]["marketing_type_enum"]
          organization: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          startDate: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["marketing_status_enum"]
          submitted_by_business?: string | null
          target_segment?: string | null
          updatedAt?: string
        }
        Update: {
          approved_end_date?: string | null
          approved_start_date?: string | null
          budget?: number | null
          campaign_type?: string | null
          channels?: string[]
          clicks?: number
          conversions?: number
          createdAt?: string
          cta?: string
          description?: string
          endDate?: string
          ends_at?: string | null
          headline?: string
          id?: string
          imageUrl?: string
          impressions?: number
          links?: Json | null
          marketingType?: Database["public"]["Enums"]["marketing_type_enum"]
          organization?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          startDate?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["marketing_status_enum"]
          submitted_by_business?: string | null
          target_segment?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_profile_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketing_profile_submitted_by_business_fkey"
            columns: ["submitted_by_business"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketing_subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          invoice_url: string | null
          is_active: boolean | null
          name: string
          payment_method: string | null
          payment_status: string | null
          period: string | null
          price: number
          privileges:
            | Database["public"]["Enums"]["subscription_privilege"][]
            | null
          tier_limit: number | null
          tier_type: string
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_url?: string | null
          is_active?: boolean | null
          name: string
          payment_method?: string | null
          payment_status?: string | null
          period?: string | null
          price?: number
          privileges?:
            | Database["public"]["Enums"]["subscription_privilege"][]
            | null
          tier_limit?: number | null
          tier_type: string
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_url?: string | null
          is_active?: boolean | null
          name?: string
          payment_method?: string | null
          payment_status?: string | null
          period?: string | null
          price?: number
          privileges?:
            | Database["public"]["Enums"]["subscription_privilege"][]
            | null
          tier_limit?: number | null
          tier_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      medication_adherence: {
        Row: {
          action_time: string | null
          created_at: string | null
          id: string
          reminder_id: string
          scheduled_time: string
          status: Database["public"]["Enums"]["adherence_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_time?: string | null
          created_at?: string | null
          id?: string
          reminder_id: string
          scheduled_time: string
          status?: Database["public"]["Enums"]["adherence_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_time?: string | null
          created_at?: string | null
          id?: string
          reminder_id?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["adherence_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_adherence_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "medication_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_adherence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      medication_enquiries: {
        Row: {
          actual_delivery: string | null
          courier_name: string | null
          created_at: string
          custom_area: string | null
          delivery_address: string | null
          delivery_distance_km: number | null
          delivery_gps: string | null
          delivery_proof_url: string | null
          delivery_status: Database["public"]["Enums"]["delivery_status"] | null
          dosage: string | null
          drug_id: string | null
          enquiry_type: string | null
          escrow_id: string | null
          estimated_delivery: string | null
          fulfilment_mode: string | null
          hcp_prescriber_id: string | null
          id: string
          insurance_policy_number: string | null
          insurance_provider: string | null
          is_insured: boolean | null
          is_priority: boolean
          medication_description: string | null
          medication_name: string
          notify_on_availability: boolean
          payment_amount: number | null
          payment_status: string | null
          pharmacist_notes: string | null
          pharmacy_id: string | null
          pickup_confirmation_code: string | null
          prescription_id: string | null
          prescription_url: string | null
          quantity: number
          search_area_mode: string | null
          search_radius_km: number | null
          status: string | null
          tracking_number: string | null
          unit: string | null
          updated_at: string
          urgency: string | null
          user_id: string
        }
        Insert: {
          actual_delivery?: string | null
          courier_name?: string | null
          created_at?: string
          custom_area?: string | null
          delivery_address?: string | null
          delivery_distance_km?: number | null
          delivery_gps?: string | null
          delivery_proof_url?: string | null
          delivery_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          dosage?: string | null
          drug_id?: string | null
          enquiry_type?: string | null
          escrow_id?: string | null
          estimated_delivery?: string | null
          fulfilment_mode?: string | null
          hcp_prescriber_id?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_insured?: boolean | null
          is_priority?: boolean
          medication_description?: string | null
          medication_name: string
          notify_on_availability?: boolean
          payment_amount?: number | null
          payment_status?: string | null
          pharmacist_notes?: string | null
          pharmacy_id?: string | null
          pickup_confirmation_code?: string | null
          prescription_id?: string | null
          prescription_url?: string | null
          quantity: number
          search_area_mode?: string | null
          search_radius_km?: number | null
          status?: string | null
          tracking_number?: string | null
          unit?: string | null
          updated_at?: string
          urgency?: string | null
          user_id: string
        }
        Update: {
          actual_delivery?: string | null
          courier_name?: string | null
          created_at?: string
          custom_area?: string | null
          delivery_address?: string | null
          delivery_distance_km?: number | null
          delivery_gps?: string | null
          delivery_proof_url?: string | null
          delivery_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
          dosage?: string | null
          drug_id?: string | null
          enquiry_type?: string | null
          escrow_id?: string | null
          estimated_delivery?: string | null
          fulfilment_mode?: string | null
          hcp_prescriber_id?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_insured?: boolean | null
          is_priority?: boolean
          medication_description?: string | null
          medication_name?: string
          notify_on_availability?: boolean
          payment_amount?: number | null
          payment_status?: string | null
          pharmacist_notes?: string | null
          pharmacy_id?: string | null
          pickup_confirmation_code?: string | null
          prescription_id?: string | null
          prescription_url?: string | null
          quantity?: number
          search_area_mode?: string | null
          search_radius_km?: number | null
          status?: string | null
          tracking_number?: string | null
          unit?: string | null
          updated_at?: string
          urgency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_enquiries_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_enquiries_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_enquiries_hcp_prescriber_id_fkey"
            columns: ["hcp_prescriber_id"]
            isOneToOne: false
            referencedRelation: "hcp_verifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_enquiries_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_enquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      medication_reminders: {
        Row: {
          created_at: string | null
          dosage_amount: string
          drug_color: string | null
          drug_id: string | null
          drug_name: string
          drug_type: string | null
          end_date: string | null
          gap_days: number | null
          id: string
          instructions: string | null
          interval: number
          interval_unit: string | null
          is_active: boolean | null
          is_enabled: boolean | null
          last_sent_at: string | null
          notification_schedule: string | null
          number_of_intakes: number | null
          purpose: Json | null
          schedule_gap: number | null
          selected_days: string[] | null
          start_date: string | null
          updated_at: string | null
          user_id: string
          week_days: string[] | null
        }
        Insert: {
          created_at?: string | null
          dosage_amount: string
          drug_color?: string | null
          drug_id?: string | null
          drug_name: string
          drug_type?: string | null
          end_date?: string | null
          gap_days?: number | null
          id?: string
          instructions?: string | null
          interval: number
          interval_unit?: string | null
          is_active?: boolean | null
          is_enabled?: boolean | null
          last_sent_at?: string | null
          notification_schedule?: string | null
          number_of_intakes?: number | null
          purpose?: Json | null
          schedule_gap?: number | null
          selected_days?: string[] | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
          week_days?: string[] | null
        }
        Update: {
          created_at?: string | null
          dosage_amount?: string
          drug_color?: string | null
          drug_id?: string | null
          drug_name?: string
          drug_type?: string | null
          end_date?: string | null
          gap_days?: number | null
          id?: string
          instructions?: string | null
          interval?: number
          interval_unit?: string | null
          is_active?: boolean | null
          is_enabled?: boolean | null
          last_sent_at?: string | null
          notification_schedule?: string | null
          number_of_intakes?: number | null
          purpose?: Json | null
          schedule_gap?: number | null
          selected_days?: string[] | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
          week_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_reminders_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_url: string | null
          content: string | null
          conversation_id: string
          created_at: string
          edited_at: string | null
          flag_reason: string | null
          id: string
          is_deleted: boolean
          is_edited: boolean | null
          is_flagged: boolean | null
          message_type: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_action: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          flag_reason?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean | null
          is_flagged?: boolean | null
          message_type?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_action?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          flag_reason?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean | null
          is_flagged?: boolean | null
          message_type?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_action?: string | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_automation_rules: {
        Row: {
          channel: string[] | null
          condition_json: Json | null
          created_at: string
          created_by: string | null
          fire_count: number | null
          id: string
          is_active: boolean | null
          last_fired_at: string | null
          name: string
          source_module: string
          target_audience: string | null
          template_id: string | null
          trigger_event: string
        }
        Insert: {
          channel?: string[] | null
          condition_json?: Json | null
          created_at?: string
          created_by?: string | null
          fire_count?: number | null
          id?: string
          is_active?: boolean | null
          last_fired_at?: string | null
          name: string
          source_module: string
          target_audience?: string | null
          template_id?: string | null
          trigger_event: string
        }
        Update: {
          channel?: string[] | null
          condition_json?: Json | null
          created_at?: string
          created_by?: string | null
          fire_count?: number | null
          id?: string
          is_active?: boolean | null
          last_fired_at?: string | null
          name?: string
          source_module?: string
          target_audience?: string | null
          template_id?: string | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_campaigns: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          body: string
          created_at: string
          created_by: string | null
          delivery_stats: Json | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          rejection_reason: string | null
          scheduled_at: string | null
          segment_filter: Json | null
          sent_at: string | null
          status: string
          submitted_for_approval_at: string | null
          template_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          delivery_stats?: Json | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          scheduled_at?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          status?: string
          submitted_for_approval_at?: string | null
          template_id?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          delivery_stats?: Json | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          scheduled_at?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          status?: string
          submitted_for_approval_at?: string | null
          template_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_delivery_receipts: {
        Row: {
          campaign_id: string | null
          created_at: string
          expo_batch_index: number | null
          expo_push_token: string | null
          expo_request_id: number | null
          expo_ticket_id: string | null
          id: string
          notification_id: string
          receipt_checked_at: string | null
          receipt_error: string | null
          receipt_status: string
          send_error: string | null
          send_status: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          expo_batch_index?: number | null
          expo_push_token?: string | null
          expo_request_id?: number | null
          expo_ticket_id?: string | null
          id?: string
          notification_id: string
          receipt_checked_at?: string | null
          receipt_error?: string | null
          receipt_status?: string
          send_error?: string | null
          send_status?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          expo_batch_index?: number | null
          expo_push_token?: string | null
          expo_request_id?: number | null
          expo_ticket_id?: string | null
          id?: string
          notification_id?: string
          receipt_checked_at?: string | null
          receipt_error?: string | null
          receipt_status?: string
          send_error?: string | null
          send_status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_receipts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notification_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_receipts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notification_log_export"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_receipts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          source_module: string
          subject: string | null
          template_type: string
          updated_at: string
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          source_module: string
          subject?: string | null
          template_type: string
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          source_module?: string
          subject?: string | null
          template_type?: string
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          campaign_id: string | null
          channel: string
          created_at: string | null
          delivered_at: string | null
          id: string
          is_broadcast: boolean | null
          is_read: boolean | null
          metadata: Json | null
          opened_at: string | null
          read_at: string | null
          sent_by: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          campaign_id?: string | null
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          is_broadcast?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          opened_at?: string | null
          read_at?: string | null
          sent_by?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          is_broadcast?: boolean | null
          is_read?: boolean | null
          metadata?: Json | null
          opened_at?: string | null
          read_at?: string | null
          sent_by?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      onboarding_requests: {
        Row: {
          business_name: string
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          metadata: Json | null
          notes: string | null
          phone_number: string | null
          request_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          business_name: string
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          metadata?: Json | null
          notes?: string | null
          phone_number?: string | null
          request_type: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          metadata?: Json | null
          notes?: string | null
          phone_number?: string | null
          request_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      operational_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          entered_by: string | null
          id: string
          month: string
          note: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          entered_by?: string | null
          id?: string
          month: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          entered_by?: string | null
          id?: string
          month?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          attempts: number
          created_at: string | null
          expires_at: string
          id: string
          otp_code: string
          phone_number: string
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          attempts?: number
          created_at?: string | null
          expires_at: string
          id?: string
          otp_code: string
          phone_number: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          attempts?: number
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          phone_number?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      period_ai_jobs: {
        Row: {
          completed_at: string | null
          configuration: Json
          created_at: string
          error_code: string | null
          frequency_cap_days: number | null
          id: string
          input_tokens: number | null
          job_type: string
          latency_ms: number | null
          model_key: string
          model_version: string | null
          output: Json
          output_tokens: number | null
          prompt_version: string
          requested_by: string
          scheduled_at: string | null
          scheduled_by: string | null
          source_ids: Json
          source_menus: Database["public"]["Enums"]["period_source_menu"][]
          started_at: string | null
          status: Database["public"]["Enums"]["period_ai_job_status"]
          surface_channel: string | null
          surface_duration_weeks: number | null
          validation: Json
        }
        Insert: {
          completed_at?: string | null
          configuration?: Json
          created_at?: string
          error_code?: string | null
          frequency_cap_days?: number | null
          id?: string
          input_tokens?: number | null
          job_type: string
          latency_ms?: number | null
          model_key?: string
          model_version?: string | null
          output?: Json
          output_tokens?: number | null
          prompt_version?: string
          requested_by: string
          scheduled_at?: string | null
          scheduled_by?: string | null
          source_ids?: Json
          source_menus: Database["public"]["Enums"]["period_source_menu"][]
          started_at?: string | null
          status?: Database["public"]["Enums"]["period_ai_job_status"]
          surface_channel?: string | null
          surface_duration_weeks?: number | null
          validation?: Json
        }
        Update: {
          completed_at?: string | null
          configuration?: Json
          created_at?: string
          error_code?: string | null
          frequency_cap_days?: number | null
          id?: string
          input_tokens?: number | null
          job_type?: string
          latency_ms?: number | null
          model_key?: string
          model_version?: string | null
          output?: Json
          output_tokens?: number | null
          prompt_version?: string
          requested_by?: string
          scheduled_at?: string | null
          scheduled_by?: string | null
          source_ids?: Json
          source_menus?: Database["public"]["Enums"]["period_source_menu"][]
          started_at?: string | null
          status?: Database["public"]["Enums"]["period_ai_job_status"]
          surface_channel?: string | null
          surface_duration_weeks?: number | null
          validation?: Json
        }
        Relationships: []
      }
      period_ai_model_metrics: {
        Row: {
          action_count: number
          confidence_coverage: number | null
          created_at: string
          drift_score: number | null
          id: string
          mean_absolute_error: number | null
          metadata: Json
          metric_date: string
          model_key: string
          model_version: string | null
          notification_type: string
          opened_count: number
          recipient_count: number
          sample_size: number | null
          status: string
        }
        Insert: {
          action_count?: number
          confidence_coverage?: number | null
          created_at?: string
          drift_score?: number | null
          id?: string
          mean_absolute_error?: number | null
          metadata?: Json
          metric_date: string
          model_key: string
          model_version?: string | null
          notification_type: string
          opened_count?: number
          recipient_count?: number
          sample_size?: number | null
          status?: string
        }
        Update: {
          action_count?: number
          confidence_coverage?: number | null
          created_at?: string
          drift_score?: number | null
          id?: string
          mean_absolute_error?: number | null
          metadata?: Json
          metric_date?: string
          model_key?: string
          model_version?: string | null
          notification_type?: string
          opened_count?: number
          recipient_count?: number
          sample_size?: number | null
          status?: string
        }
        Relationships: []
      }
      period_ai_recommendations: {
        Row: {
          confidence: number | null
          created_at: string
          expires_at: string | null
          feature_summary: Json
          id: string
          model_key: string
          model_version: string
          policy_version: string
          reason_code: string
          recommendation_type: string
          status: string
          target_id: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          expires_at?: string | null
          feature_summary?: Json
          id?: string
          model_key?: string
          model_version?: string
          policy_version?: string
          reason_code: string
          recommendation_type: string
          status?: string
          target_id?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          expires_at?: string | null
          feature_summary?: Json
          id?: string
          model_key?: string
          model_version?: string
          policy_version?: string
          reason_code?: string
          recommendation_type?: string
          status?: string
          target_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      period_app_events: {
        Row: {
          app_version: string | null
          duration_ms: number | null
          event_name: string
          id: string
          metadata: Json
          occurred_at: string
          platform: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          duration_ms?: number | null
          event_name: string
          id?: string
          metadata?: Json
          occurred_at?: string
          platform?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          duration_ms?: number | null
          event_name?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          platform?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      period_campaigns: {
        Row: {
          action_count: number
          approved_at: string | null
          approved_by: string | null
          campaign_type: string
          channel: string
          consent_type: string
          created_at: string
          created_by: string | null
          frequency_cap_days: number
          id: string
          minimum_cohort_size: number
          name: string
          opened_count: number
          partner_name: string | null
          reached_count: number
          scheduled_at: string | null
          sent_at: string | null
          status: string
          target_definition: Json
          updated_at: string
        }
        Insert: {
          action_count?: number
          approved_at?: string | null
          approved_by?: string | null
          campaign_type: string
          channel?: string
          consent_type?: string
          created_at?: string
          created_by?: string | null
          frequency_cap_days?: number
          id?: string
          minimum_cohort_size?: number
          name: string
          opened_count?: number
          partner_name?: string | null
          reached_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          target_definition?: Json
          updated_at?: string
        }
        Update: {
          action_count?: number
          approved_at?: string | null
          approved_by?: string | null
          campaign_type?: string
          channel?: string
          consent_type?: string
          created_at?: string
          created_by?: string | null
          frequency_cap_days?: number
          id?: string
          minimum_cohort_size?: number
          name?: string
          opened_count?: number
          partner_name?: string | null
          reached_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          target_definition?: Json
          updated_at?: string
        }
        Relationships: []
      }
      period_consent_events: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          id: string
          policy_version: string
          source: string
          user_id: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted: boolean
          id?: string
          policy_version: string
          source: string
          user_id: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          id?: string
          policy_version?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      period_content: {
        Row: {
          ai_job_id: string | null
          body_html: string
          clinical_reviewed_at: string | null
          completion_count: number
          content_type: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          curation_type: string
          featured: boolean
          helpful_count: number
          id: string
          locale: string
          media_url: string | null
          metadata: Json
          not_helpful_count: number
          publish_from: string | null
          publish_until: string | null
          published_at: string | null
          reading_level: string
          reading_minutes: number | null
          reads: number
          recommendation_eligible: boolean
          review_expires_at: string | null
          reviewed_by: string | null
          scheduled_at: string | null
          slug: string | null
          status: string
          summary: string | null
          tags: string[]
          title: string
          topic: string
          updated_at: string
          version: number
        }
        Insert: {
          ai_job_id?: string | null
          body_html: string
          clinical_reviewed_at?: string | null
          completion_count?: number
          content_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          curation_type?: string
          featured?: boolean
          helpful_count?: number
          id?: string
          locale?: string
          media_url?: string | null
          metadata?: Json
          not_helpful_count?: number
          publish_from?: string | null
          publish_until?: string | null
          published_at?: string | null
          reading_level?: string
          reading_minutes?: number | null
          reads?: number
          recommendation_eligible?: boolean
          review_expires_at?: string | null
          reviewed_by?: string | null
          scheduled_at?: string | null
          slug?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          topic: string
          updated_at?: string
          version?: number
        }
        Update: {
          ai_job_id?: string | null
          body_html?: string
          clinical_reviewed_at?: string | null
          completion_count?: number
          content_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          curation_type?: string
          featured?: boolean
          helpful_count?: number
          id?: string
          locale?: string
          media_url?: string | null
          metadata?: Json
          not_helpful_count?: number
          publish_from?: string | null
          publish_until?: string | null
          published_at?: string | null
          reading_level?: string
          reading_minutes?: number | null
          reads?: number
          recommendation_eligible?: boolean
          review_expires_at?: string | null
          reviewed_by?: string | null
          scheduled_at?: string | null
          slug?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          topic?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "period_content_ai_job_id_fkey"
            columns: ["ai_job_id"]
            isOneToOne: false
            referencedRelation: "period_ai_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      period_content_bookmarks: {
        Row: {
          content_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_content_bookmarks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "period_content"
            referencedColumns: ["id"]
          },
        ]
      }
      period_content_categories: {
        Row: {
          created_at: string
          id: string
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      period_content_collection_items: {
        Row: {
          added_by: string | null
          collection_id: string
          content_id: string
          created_at: string
          display_order: number
          reason: string | null
        }
        Insert: {
          added_by?: string | null
          collection_id: string
          content_id: string
          created_at?: string
          display_order?: number
          reason?: string | null
        }
        Update: {
          added_by?: string | null
          collection_id?: string
          content_id?: string
          created_at?: string
          display_order?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_content_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "period_content_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_content_collection_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "period_content"
            referencedColumns: ["id"]
          },
        ]
      }
      period_content_collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          curation_type: string
          description: string | null
          display_order: number
          ends_at: string | null
          id: string
          published_at: string | null
          reviewed_by: string | null
          slug: string
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          curation_type?: string
          description?: string | null
          display_order?: number
          ends_at?: string | null
          id?: string
          published_at?: string | null
          reviewed_by?: string | null
          slug: string
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          curation_type?: string
          description?: string | null
          display_order?: number
          ends_at?: string | null
          id?: string
          published_at?: string | null
          reviewed_by?: string | null
          slug?: string
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      period_content_events: {
        Row: {
          app_version: string | null
          content_id: string
          event_type: string
          id: string
          occurred_at: string
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          content_id: string
          event_type: string
          id?: string
          occurred_at?: string
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          content_id?: string
          event_type?: string
          id?: string
          occurred_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_content_events_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "period_content"
            referencedColumns: ["id"]
          },
        ]
      }
      period_content_progress: {
        Row: {
          completed_at: string | null
          content_id: string
          last_position: string | null
          progress_percent: number
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          last_position?: string | null
          progress_percent?: number
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          last_position?: string | null
          progress_percent?: number
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_content_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "period_content"
            referencedColumns: ["id"]
          },
        ]
      }
      period_content_publications: {
        Row: {
          channel: string
          content_id: string
          created_at: string
          display_order: number
          ends_at: string | null
          featured: boolean
          id: string
          minimum_app_version: string | null
          published_by: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          content_id: string
          created_at?: string
          display_order?: number
          ends_at?: string | null
          featured?: boolean
          id?: string
          minimum_app_version?: string | null
          published_by?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          content_id?: string
          created_at?: string
          display_order?: number
          ends_at?: string | null
          featured?: boolean
          id?: string
          minimum_app_version?: string | null
          published_by?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_content_publications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "period_content"
            referencedColumns: ["id"]
          },
        ]
      }
      period_content_sources: {
        Row: {
          created_at: string
          id: string
          linked_by: string | null
          period_content_id: string | null
          source_excerpt: string | null
          source_id: string
          source_menu: Database["public"]["Enums"]["period_source_menu"]
          source_snapshot_hash: string
          source_title: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_by?: string | null
          period_content_id?: string | null
          source_excerpt?: string | null
          source_id: string
          source_menu: Database["public"]["Enums"]["period_source_menu"]
          source_snapshot_hash: string
          source_title: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_by?: string | null
          period_content_id?: string | null
          source_excerpt?: string | null
          source_id?: string
          source_menu?: Database["public"]["Enums"]["period_source_menu"]
          source_snapshot_hash?: string
          source_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_content_sources_period_content_id_fkey"
            columns: ["period_content_id"]
            isOneToOne: false
            referencedRelation: "period_content"
            referencedColumns: ["id"]
          },
        ]
      }
      period_cycle_revisions: {
        Row: {
          before_values: Json
          created_at: string
          cycle_id: string
          forecast_impact: Json
          id: string
          proposed_values: Json
          reason: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          before_values: Json
          created_at?: string
          cycle_id: string
          forecast_impact?: Json
          id?: string
          proposed_values: Json
          reason: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          before_values?: Json
          created_at?: string
          cycle_id?: string
          forecast_impact?: Json
          id?: string
          proposed_values?: Json
          reason?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_cycle_revisions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "period_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      period_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          current_phase: string | null
          cycle_length: number | null
          fertile_window: unknown
          id: string
          mood: string | null
          next_period_forecast: string | null
          ovulation_forecast: string | null
          period_end_date: string | null
          period_length: number | null
          period_start_date: string
          source: string
          symptoms: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_phase?: string | null
          cycle_length?: number | null
          fertile_window?: unknown
          id?: string
          mood?: string | null
          next_period_forecast?: string | null
          ovulation_forecast?: string | null
          period_end_date?: string | null
          period_length?: number | null
          period_start_date: string
          source?: string
          symptoms?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_phase?: string | null
          cycle_length?: number | null
          fertile_window?: unknown
          id?: string
          mood?: string | null
          next_period_forecast?: string | null
          ovulation_forecast?: string | null
          period_end_date?: string | null
          period_length?: number | null
          period_start_date?: string
          source?: string
          symptoms?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      period_daily_logs: {
        Row: {
          app_version: string | null
          basal_body_temperature: number | null
          cervical_mucus: string | null
          client_event_id: string | null
          created_at: string
          cycle_id: string | null
          exercise_minutes: number | null
          flow: string | null
          id: string
          logged_on: string
          medication_logged: boolean
          medication_name: string | null
          moods: string[]
          note_category: string | null
          note_ciphertext: string | null
          sexual_activity: string | null
          source: string
          symptoms: Json
          sync_status: string
          temperature_unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          basal_body_temperature?: number | null
          cervical_mucus?: string | null
          client_event_id?: string | null
          created_at?: string
          cycle_id?: string | null
          exercise_minutes?: number | null
          flow?: string | null
          id?: string
          logged_on: string
          medication_logged?: boolean
          medication_name?: string | null
          moods?: string[]
          note_category?: string | null
          note_ciphertext?: string | null
          sexual_activity?: string | null
          source?: string
          symptoms?: Json
          sync_status?: string
          temperature_unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          basal_body_temperature?: number | null
          cervical_mucus?: string | null
          client_event_id?: string | null
          created_at?: string
          cycle_id?: string | null
          exercise_minutes?: number | null
          flow?: string | null
          id?: string
          logged_on?: string
          medication_logged?: boolean
          medication_name?: string | null
          moods?: string[]
          note_category?: string | null
          note_ciphertext?: string | null
          sexual_activity?: string | null
          source?: string
          symptoms?: Json
          sync_status?: string
          temperature_unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_daily_logs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "period_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      period_feature_flags: {
        Row: {
          description: string
          enabled: boolean
          key: string
          minimum_app_version: string | null
          rollout_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description: string
          enabled?: boolean
          key: string
          minimum_app_version?: string | null
          rollout_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string
          enabled?: boolean
          key?: string
          minimum_app_version?: string | null
          rollout_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      period_fertility_insights: {
        Row: {
          confidence: number | null
          created_at: string
          cycle_id: string | null
          evidence: Json
          expires_at: string | null
          id: string
          insight_date: string
          insight_type: string
          message: string
          safety_level: string
          source_model: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          cycle_id?: string | null
          evidence?: Json
          expires_at?: string | null
          id?: string
          insight_date?: string
          insight_type: string
          message: string
          safety_level?: string
          source_model?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          cycle_id?: string | null
          evidence?: Json
          expires_at?: string | null
          id?: string
          insight_date?: string
          insight_type?: string
          message?: string
          safety_level?: string
          source_model?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_fertility_insights_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "period_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      period_forecasts: {
        Row: {
          absolute_error_days: number | null
          confidence: number | null
          confirmed_period_start: string | null
          cycle_id: string | null
          explanation_code: string | null
          fertile_window: unknown
          generated_at: string
          id: string
          input_window_end: string | null
          input_window_start: string | null
          metadata: Json
          model_key: string
          model_version: string
          predicted_ovulation_date: string | null
          predicted_period_start: string
          superseded_at: string | null
          user_id: string
        }
        Insert: {
          absolute_error_days?: number | null
          confidence?: number | null
          confirmed_period_start?: string | null
          cycle_id?: string | null
          explanation_code?: string | null
          fertile_window?: unknown
          generated_at?: string
          id?: string
          input_window_end?: string | null
          input_window_start?: string | null
          metadata?: Json
          model_key: string
          model_version: string
          predicted_ovulation_date?: string | null
          predicted_period_start: string
          superseded_at?: string | null
          user_id: string
        }
        Update: {
          absolute_error_days?: number | null
          confidence?: number | null
          confirmed_period_start?: string | null
          cycle_id?: string | null
          explanation_code?: string | null
          fertile_window?: unknown
          generated_at?: string
          id?: string
          input_window_end?: string | null
          input_window_start?: string | null
          metadata?: Json
          model_key?: string
          model_version?: string
          predicted_ovulation_date?: string | null
          predicted_period_start?: string
          superseded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_forecasts_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "period_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      period_notes: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          cycle_id: string | null
          flag_reason: string | null
          flagged_at: string | null
          id: string
          note_ciphertext: string
          resolution_code: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          cycle_id?: string | null
          flag_reason?: string | null
          flagged_at?: string | null
          id?: string
          note_ciphertext: string
          resolution_code?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          cycle_id?: string | null
          flag_reason?: string | null
          flagged_at?: string | null
          id?: string
          note_ciphertext?: string
          resolution_code?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_notes_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "period_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      period_notification_events: {
        Row: {
          app_version: string | null
          campaign_id: string | null
          channel: string
          id: string
          metadata: Json
          notification_type: string
          occurred_at: string
          status: string
          suppression_reason: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          campaign_id?: string | null
          channel: string
          id?: string
          metadata?: Json
          notification_type: string
          occurred_at?: string
          status: string
          suppression_reason?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          campaign_id?: string | null
          channel?: string
          id?: string
          metadata?: Json
          notification_type?: string
          occurred_at?: string
          status?: string
          suppression_reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_notification_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "period_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      period_notification_preferences: {
        Row: {
          content_reminders: boolean
          fertile_window_reminders: boolean
          ovulation_test_reminders: boolean
          period_reminders: boolean
          preconception_checklist_reminders: boolean
          prenatal_vitamin_reminders: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_reminders?: boolean
          fertile_window_reminders?: boolean
          ovulation_test_reminders?: boolean
          period_reminders?: boolean
          preconception_checklist_reminders?: boolean
          prenatal_vitamin_reminders?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_reminders?: boolean
          fertile_window_reminders?: boolean
          ovulation_test_reminders?: boolean
          period_reminders?: boolean
          preconception_checklist_reminders?: boolean
          prenatal_vitamin_reminders?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      period_ovulation_tests: {
        Row: {
          app_version: string | null
          brand: string | null
          client_event_id: string | null
          created_at: string
          id: string
          logged_on: string
          notes_ciphertext: string | null
          result: string
          source: string
          tested_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          brand?: string | null
          client_event_id?: string | null
          created_at?: string
          id?: string
          logged_on: string
          notes_ciphertext?: string | null
          result: string
          source?: string
          tested_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          brand?: string | null
          client_event_id?: string | null
          created_at?: string
          id?: string
          logged_on?: string
          notes_ciphertext?: string | null
          result?: string
          source?: string
          tested_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      period_preconception_appointments: {
        Row: {
          appointment_date: string
          clinician_name: string | null
          created_at: string
          facility_id: string | null
          id: string
          notes_ciphertext: string | null
          purpose: string
          questions: string[]
          request_status: string
          status: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          clinician_name?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          notes_ciphertext?: string | null
          purpose?: string
          questions?: string[]
          request_status?: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          clinician_name?: string | null
          created_at?: string
          facility_id?: string | null
          id?: string
          notes_ciphertext?: string | null
          purpose?: string
          questions?: string[]
          request_status?: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_preconception_appointments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      period_pregnancy_tests: {
        Row: {
          app_version: string | null
          brand: string | null
          client_event_id: string | null
          created_at: string
          id: string
          logged_on: string
          notes_ciphertext: string | null
          result: string
          source: string
          tested_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          brand?: string | null
          client_event_id?: string | null
          created_at?: string
          id?: string
          logged_on: string
          notes_ciphertext?: string | null
          result: string
          source?: string
          tested_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          brand?: string | null
          client_event_id?: string | null
          created_at?: string
          id?: string
          logged_on?: string
          notes_ciphertext?: string | null
          result?: string
          source?: string
          tested_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      period_premium_grants: {
        Row: {
          created_at: string
          expires_at: string
          granted_by: string | null
          id: string
          notes: string | null
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          source: string
          starts_at: string
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          source?: string
          starts_at?: string
          tier?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          source?: string
          starts_at?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      period_premium_settings: {
        Row: {
          auto_lock_on_expiry: boolean
          expiry_reminder_days: number
          id: number
          onboarding_trial_days: number
          show_paywall_on_expiry: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_lock_on_expiry?: boolean
          expiry_reminder_days?: number
          id?: number
          onboarding_trial_days?: number
          show_paywall_on_expiry?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_lock_on_expiry?: boolean
          expiry_reminder_days?: number
          id?: number
          onboarding_trial_days?: number
          show_paywall_on_expiry?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      period_privacy_requests: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          request_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          request_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          request_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      period_reminder_log: {
        Row: {
          checklist_item_id: string | null
          created_at: string
          id: string
          reminder_kind: string
          sent_on: string
          user_id: string
        }
        Insert: {
          checklist_item_id?: string | null
          created_at?: string
          id?: string
          reminder_kind: string
          sent_on: string
          user_id: string
        }
        Update: {
          checklist_item_id?: string | null
          created_at?: string
          id?: string
          reminder_kind?: string
          sent_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_reminder_log_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "period_ttc_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      period_safety_flags: {
        Row: {
          assigned_to: string | null
          created_at: string
          cycle_id: string | null
          daily_log_id: string | null
          due_at: string | null
          flag_type: string
          id: string
          resolution_code: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_version: string
          severity: string
          status: string
          trigger_summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          cycle_id?: string | null
          daily_log_id?: string | null
          due_at?: string | null
          flag_type: string
          id?: string
          resolution_code?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_version: string
          severity: string
          status?: string
          trigger_summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          cycle_id?: string | null
          daily_log_id?: string | null
          due_at?: string | null
          flag_type?: string
          id?: string
          resolution_code?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_version?: string
          severity?: string
          status?: string
          trigger_summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_safety_flags_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "period_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_safety_flags_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "period_daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      period_source_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string
          created_at: string
          document_id: string
          heading: string | null
          id: string
        }
        Insert: {
          chunk_index: number
          content: string
          content_hash: string
          created_at?: string
          document_id: string
          heading?: string | null
          id?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          content_hash?: string
          created_at?: string
          document_id?: string
          heading?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_source_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "period_source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      period_source_documents: {
        Row: {
          body_text: string
          id: string
          indexed_at: string
          source_hash: string
          source_id: string
          source_menu: Database["public"]["Enums"]["period_source_menu"]
          source_status: string
          source_updated_at: string | null
          summary: string | null
          title: string
        }
        Insert: {
          body_text: string
          id?: string
          indexed_at?: string
          source_hash: string
          source_id: string
          source_menu: Database["public"]["Enums"]["period_source_menu"]
          source_status?: string
          source_updated_at?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          body_text?: string
          id?: string
          indexed_at?: string
          source_hash?: string
          source_id?: string
          source_menu?: Database["public"]["Enums"]["period_source_menu"]
          source_status?: string
          source_updated_at?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      period_source_embeddings: {
        Row: {
          chunk_id: string
          created_at: string
          embedding: number[]
          embedding_model: string
          embedding_version: string
        }
        Insert: {
          chunk_id: string
          created_at?: string
          embedding: number[]
          embedding_model: string
          embedding_version: string
        }
        Update: {
          chunk_id?: string
          created_at?: string
          embedding?: number[]
          embedding_model?: string
          embedding_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_source_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: true
            referencedRelation: "period_source_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      period_symptom_logs: {
        Row: {
          created_at: string
          cycle_id: string | null
          id: string
          logged_on: string
          metadata: Json
          severity: number | null
          symptom: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          id?: string
          logged_on: string
          metadata?: Json
          severity?: number | null
          symptom: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          id?: string
          logged_on?: string
          metadata?: Json
          severity?: number | null
          symptom?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_symptom_logs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "period_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      period_trivia_blocked_devices: {
        Row: {
          blocked_by: string | null
          created_at: string
          detected_at: string
          device_hash: string
          evidence: string | null
          id: string
          mobile_hash: string | null
          status: string
          unblocked_at: string | null
          unblocked_by: string | null
          user_id: string | null
          violation: string
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          detected_at?: string
          device_hash: string
          evidence?: string | null
          id?: string
          mobile_hash?: string | null
          status?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
          user_id?: string | null
          violation: string
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          detected_at?: string
          device_hash?: string
          evidence?: string | null
          id?: string
          mobile_hash?: string | null
          status?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
          user_id?: string | null
          violation?: string
        }
        Relationships: []
      }
      period_trivia_events: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string
          id: string
          lead_form_enabled: boolean
          leaderboard_publish_at: string | null
          question_count: number
          reviewed_at: string | null
          reviewed_by: string | null
          reward_id: string | null
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["period_trivia_event_status"]
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          lead_form_enabled?: boolean
          leaderboard_publish_at?: string | null
          question_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_id?: string | null
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["period_trivia_event_status"]
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          lead_form_enabled?: boolean
          leaderboard_publish_at?: string | null
          question_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_id?: string | null
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["period_trivia_event_status"]
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_trivia_events_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "period_trivia_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      period_trivia_fulfillment: {
        Row: {
          confirmed_at: string | null
          created_at: string
          event_id: string
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          notes: string | null
          prize_status: string
          prompt_sent_at: string | null
          reward_id: string | null
          sent_at: string | null
          sent_by: string | null
          submission_id: string | null
          tier_label: string
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          event_id: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          notes?: string | null
          prize_status?: string
          prompt_sent_at?: string | null
          reward_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          submission_id?: string | null
          tier_label: string
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          event_id?: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          notes?: string | null
          prize_status?: string
          prompt_sent_at?: string | null
          reward_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          submission_id?: string | null
          tier_label?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_trivia_fulfillment_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "period_trivia_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_trivia_fulfillment_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "period_trivia_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_trivia_fulfillment_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "period_trivia_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      period_trivia_leads: {
        Row: {
          acquisition_source: string
          admin_notes_ciphertext: string | null
          assigned_to: string | null
          campaign_code: string | null
          consent_version: string
          consented_at: string
          created_at: string
          event_id: string
          full_name_ciphertext: string
          id: string
          last_contacted_at: string | null
          mobile_ciphertext: string
          mobile_hash: string
          social_handle_ciphertext: string
          social_platform: string
          status: Database["public"]["Enums"]["period_lead_status"]
          submission_id: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          acquisition_source?: string
          admin_notes_ciphertext?: string | null
          assigned_to?: string | null
          campaign_code?: string | null
          consent_version: string
          consented_at?: string
          created_at?: string
          event_id: string
          full_name_ciphertext: string
          id?: string
          last_contacted_at?: string | null
          mobile_ciphertext: string
          mobile_hash: string
          social_handle_ciphertext: string
          social_platform?: string
          status?: Database["public"]["Enums"]["period_lead_status"]
          submission_id: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          acquisition_source?: string
          admin_notes_ciphertext?: string | null
          assigned_to?: string | null
          campaign_code?: string | null
          consent_version?: string
          consented_at?: string
          created_at?: string
          event_id?: string
          full_name_ciphertext?: string
          id?: string
          last_contacted_at?: string | null
          mobile_ciphertext?: string
          mobile_hash?: string
          social_handle_ciphertext?: string
          social_platform?: string
          status?: Database["public"]["Enums"]["period_lead_status"]
          submission_id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_trivia_leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "period_trivia_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_trivia_leads_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "period_trivia_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      period_trivia_questions: {
        Row: {
          ai_job_id: string | null
          correct_option: number
          created_at: string
          created_by: string | null
          difficulty: string
          event_id: string | null
          explanation: string
          id: string
          manual_batch_id: string | null
          options: Json
          position: number | null
          published_at: string | null
          question: string
          reviewed_by: string | null
          source_refs: Json
          status: string
          topic: string
          updated_at: string
          validation_status: string
        }
        Insert: {
          ai_job_id?: string | null
          correct_option: number
          created_at?: string
          created_by?: string | null
          difficulty?: string
          event_id?: string | null
          explanation: string
          id?: string
          manual_batch_id?: string | null
          options: Json
          position?: number | null
          published_at?: string | null
          question: string
          reviewed_by?: string | null
          source_refs?: Json
          status?: string
          topic: string
          updated_at?: string
          validation_status?: string
        }
        Update: {
          ai_job_id?: string | null
          correct_option?: number
          created_at?: string
          created_by?: string | null
          difficulty?: string
          event_id?: string | null
          explanation?: string
          id?: string
          manual_batch_id?: string | null
          options?: Json
          position?: number | null
          published_at?: string | null
          question?: string
          reviewed_by?: string | null
          source_refs?: Json
          status?: string
          topic?: string
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_trivia_questions_ai_job_id_fkey"
            columns: ["ai_job_id"]
            isOneToOne: false
            referencedRelation: "period_ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_trivia_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "period_trivia_events"
            referencedColumns: ["id"]
          },
        ]
      }
      period_trivia_rewards: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          reward_type: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          reward_type?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          reward_type?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      period_trivia_rules: {
        Row: {
          description: string
          enforced_by: string
          is_active: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string
          enforced_by?: string
          is_active?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string
          enforced_by?: string
          is_active?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      period_trivia_submissions: {
        Row: {
          answers: Json
          device_hash: string
          duration_seconds: number | null
          event_id: string
          id: string
          mobile_hash: string
          question_count: number
          score: number
          submitted_at: string
          user_id: string | null
        }
        Insert: {
          answers: Json
          device_hash: string
          duration_seconds?: number | null
          event_id: string
          id?: string
          mobile_hash: string
          question_count?: number
          score: number
          submitted_at?: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          device_hash?: string
          duration_seconds?: number | null
          event_id?: string
          id?: string
          mobile_hash?: string
          question_count?: number
          score?: number
          submitted_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_trivia_submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "period_trivia_events"
            referencedColumns: ["id"]
          },
        ]
      }
      period_ttc_checklist_items: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          source_label: string | null
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          source_label?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          source_label?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      period_ttc_checklist_progress: {
        Row: {
          checklist_item_id: string
          completed_at: string | null
          created_at: string
          notes_ciphertext: string | null
          reminder_enabled: boolean
          reminder_time: string | null
          status: string
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_item_id: string
          completed_at?: string | null
          created_at?: string
          notes_ciphertext?: string | null
          reminder_enabled?: boolean
          reminder_time?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_item_id?: string
          completed_at?: string | null
          created_at?: string
          notes_ciphertext?: string | null
          reminder_enabled?: boolean
          reminder_time?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_ttc_checklist_progress_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "period_ttc_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      period_ttc_profiles: {
        Row: {
          chronic_condition_review_status: string
          conception_timeline: string | null
          created_at: string
          dental_check_status: string
          lifestyle_focus_areas: string[]
          medication_review_status: string
          notes_ciphertext: string | null
          partner_involved: boolean | null
          preconception_visit_date: string | null
          preconception_visit_status: string
          prenatal_vitamin_started_on: string | null
          show_conception_language: boolean
          sti_screening_status: string
          trying_since: string | null
          updated_at: string
          user_id: string
          vaccine_review_status: string
        }
        Insert: {
          chronic_condition_review_status?: string
          conception_timeline?: string | null
          created_at?: string
          dental_check_status?: string
          lifestyle_focus_areas?: string[]
          medication_review_status?: string
          notes_ciphertext?: string | null
          partner_involved?: boolean | null
          preconception_visit_date?: string | null
          preconception_visit_status?: string
          prenatal_vitamin_started_on?: string | null
          show_conception_language?: boolean
          sti_screening_status?: string
          trying_since?: string | null
          updated_at?: string
          user_id: string
          vaccine_review_status?: string
        }
        Update: {
          chronic_condition_review_status?: string
          conception_timeline?: string | null
          created_at?: string
          dental_check_status?: string
          lifestyle_focus_areas?: string[]
          medication_review_status?: string
          notes_ciphertext?: string | null
          partner_involved?: boolean | null
          preconception_visit_date?: string | null
          preconception_visit_status?: string
          prenatal_vitamin_started_on?: string | null
          show_conception_language?: boolean
          sti_screening_status?: string
          trying_since?: string | null
          updated_at?: string
          user_id?: string
          vaccine_review_status?: string
        }
        Relationships: []
      }
      period_user_settings: {
        Row: {
          created_at: string
          locale: string
          onboarding_completed_at: string | null
          onboarding_version: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          region: string | null
          reminders_enabled: boolean
          timezone: string
          tracking_goal: string
          typical_cycle_length: number | null
          typical_period_length: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          locale?: string
          onboarding_completed_at?: string | null
          onboarding_version?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          region?: string | null
          reminders_enabled?: boolean
          timezone?: string
          tracking_goal?: string
          typical_cycle_length?: number | null
          typical_period_length?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          locale?: string
          onboarding_completed_at?: string | null
          onboarding_version?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          region?: string | null
          reminders_enabled?: boolean
          timezone?: string
          tracking_goal?: string
          typical_cycle_length?: number | null
          typical_period_length?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget: number | null
          campaign_type: string
          clicks: number | null
          conversions: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          impressions: number | null
          pharmacy_id: string
          spend: number | null
          start_date: string
          status: Database["public"]["Enums"]["campaign_status"] | null
          target_medications: string[] | null
          target_regions: string[] | null
          target_user_segments: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget?: number | null
          campaign_type: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          pharmacy_id: string
          spend?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_medications?: string[] | null
          target_regions?: string[] | null
          target_user_segments?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget?: number | null
          campaign_type?: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          pharmacy_id?: string
          spend?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_medications?: string[] | null
          target_regions?: string[] | null
          target_user_segments?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pharmacy_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pharmacy_campaigns_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_marketing_campaigns: {
        Row: {
          audience_count: number | null
          channel: string
          created_at: string
          created_by: string | null
          delivery_stats: Json
          id: string
          message: string
          name: string
          pharmacy_id: string | null
          radius_km: number
          scheduled_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          audience_count?: number | null
          channel?: string
          created_at?: string
          created_by?: string | null
          delivery_stats?: Json
          id?: string
          message: string
          name: string
          pharmacy_id?: string | null
          radius_km?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          audience_count?: number | null
          channel?: string
          created_at?: string
          created_by?: string | null
          delivery_stats?: Json
          id?: string
          message?: string
          name?: string
          pharmacy_id?: string | null
          radius_km?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pharmacy_marketing_campaigns_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_api_keys: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          environment: string
          id: string
          key_hash: string | null
          key_hint: string | null
          last_used: string | null
          name: string
          provider: string
          revoked_at: string | null
          rotated_from_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          key_hash?: string | null
          key_hint?: string | null
          last_used?: string | null
          name: string
          provider: string
          revoked_at?: string | null
          rotated_from_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          environment?: string
          id?: string
          key_hash?: string | null
          key_hint?: string | null
          last_used?: string | null
          name?: string
          provider?: string
          revoked_at?: string | null
          rotated_from_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_api_keys_rotated_from_id_fkey"
            columns: ["rotated_from_id"]
            isOneToOne: false
            referencedRelation: "platform_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_broadcasts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          completed_at: string | null
          created_at: string
          created_by: string
          delivery_stats: Json | null
          failed_count: number | null
          id: string
          message: string
          read_count: number | null
          scheduled_at: string | null
          segment_filter: Json | null
          sent_at: string | null
          sent_count: number | null
          status: Database["public"]["Enums"]["broadcast_status"] | null
          target_facility_types: string[] | null
          target_regions: string[] | null
          title: string
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          broadcast_type: Database["public"]["Enums"]["broadcast_type"]
          completed_at?: string | null
          created_at?: string
          created_by: string
          delivery_stats?: Json | null
          failed_count?: number | null
          id?: string
          message: string
          read_count?: number | null
          scheduled_at?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          status?: Database["public"]["Enums"]["broadcast_status"] | null
          target_facility_types?: string[] | null
          target_regions?: string[] | null
          title: string
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          broadcast_type?: Database["public"]["Enums"]["broadcast_type"]
          completed_at?: string | null
          created_at?: string
          created_by?: string
          delivery_stats?: Json | null
          failed_count?: number | null
          id?: string
          message?: string
          read_count?: number | null
          scheduled_at?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          status?: Database["public"]["Enums"]["broadcast_status"] | null
          target_facility_types?: string[] | null
          target_regions?: string[] | null
          title?: string
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_broadcasts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string
          provider: string
          status: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          name: string
          provider: string
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string
          provider?: string
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      platform_metrics_history: {
        Row: {
          active_medication_remainders: number
          created_at: string | null
          daily_active_users: number
          date: string | null
          facility_types: Json
          female_count: number
          id: string
          male_count: number
          monthly_active_users: number
          new_signups_today: number
          other_gender_count: number
          sticky_users_count: number
          symptoms_reported_count: number
          total_facilities: number
          total_users: number
          upated_at: string | null
          vitals_logged_count: number
        }
        Insert: {
          active_medication_remainders: number
          created_at?: string | null
          daily_active_users: number
          date?: string | null
          facility_types: Json
          female_count: number
          id?: string
          male_count: number
          monthly_active_users: number
          new_signups_today: number
          other_gender_count: number
          sticky_users_count: number
          symptoms_reported_count?: number
          total_facilities: number
          total_users: number
          upated_at?: string | null
          vitals_logged_count?: number
        }
        Update: {
          active_medication_remainders?: number
          created_at?: string | null
          daily_active_users?: number
          date?: string | null
          facility_types?: Json
          female_count?: number
          id?: string
          male_count?: number
          monthly_active_users?: number
          new_signups_today?: number
          other_gender_count?: number
          sticky_users_count?: number
          symptoms_reported_count?: number
          total_facilities?: number
          total_users?: number
          upated_at?: string | null
          vitals_logged_count?: number
        }
        Relationships: []
      }
      platform_metrics_snapshots: {
        Row: {
          active_facilities: number | null
          active_ibps: number | null
          active_users: number | null
          ad_revenue: number | null
          avg_session_duration_minutes: number | null
          created_at: string
          engagement_metrics: Json | null
          id: string
          new_users: number | null
          retention_rate: number | null
          revenue: number | null
          snapshot_date: string
          subscription_revenue: number | null
          top_facility_types: Json | null
          top_regions: Json | null
          total_challenges: number | null
          total_enquiries: number | null
          total_facilities: number | null
          total_ibps: number | null
          total_messages: number | null
          total_users: number | null
          total_workouts: number | null
        }
        Insert: {
          active_facilities?: number | null
          active_ibps?: number | null
          active_users?: number | null
          ad_revenue?: number | null
          avg_session_duration_minutes?: number | null
          created_at?: string
          engagement_metrics?: Json | null
          id?: string
          new_users?: number | null
          retention_rate?: number | null
          revenue?: number | null
          snapshot_date: string
          subscription_revenue?: number | null
          top_facility_types?: Json | null
          top_regions?: Json | null
          total_challenges?: number | null
          total_enquiries?: number | null
          total_facilities?: number | null
          total_ibps?: number | null
          total_messages?: number | null
          total_users?: number | null
          total_workouts?: number | null
        }
        Update: {
          active_facilities?: number | null
          active_ibps?: number | null
          active_users?: number | null
          ad_revenue?: number | null
          avg_session_duration_minutes?: number | null
          created_at?: string
          engagement_metrics?: Json | null
          id?: string
          new_users?: number | null
          retention_rate?: number | null
          revenue?: number | null
          snapshot_date?: string
          subscription_revenue?: number | null
          top_facility_types?: Json | null
          top_regions?: Json | null
          total_challenges?: number | null
          total_enquiries?: number | null
          total_facilities?: number | null
          total_ibps?: number | null
          total_messages?: number | null
          total_users?: number | null
          total_workouts?: number | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          compliance: Json
          created_at: string
          default_language: string
          deletion_settings: Json
          id: string
          maintenance_allowed_routes: string[]
          maintenance_message: string | null
          maintenance_mode: boolean
          maintenance_scheduled_end: string | null
          maintenance_scheduled_start: string | null
          platform_name: string
          security_settings: Json
          share_url: string | null
          support_email: string | null
          support_phone: string | null
          support_whatsapp: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          compliance?: Json
          created_at?: string
          default_language?: string
          deletion_settings?: Json
          id?: string
          maintenance_allowed_routes?: string[]
          maintenance_message?: string | null
          maintenance_mode?: boolean
          maintenance_scheduled_end?: string | null
          maintenance_scheduled_start?: string | null
          platform_name?: string
          security_settings?: Json
          share_url?: string | null
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          compliance?: Json
          created_at?: string
          default_language?: string
          deletion_settings?: Json
          id?: string
          maintenance_allowed_routes?: string[]
          maintenance_message?: string | null
          maintenance_mode?: boolean
          maintenance_scheduled_end?: string | null
          maintenance_scheduled_start?: string | null
          platform_name?: string
          security_settings?: Json
          share_url?: string | null
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_webhooks: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          events: string[]
          id: string
          last_delivery_at: string | null
          last_delivery_status: string | null
          name: string
          secret_hash: string | null
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          name: string
          secret_hash?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          name?: string
          secret_hash?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_webhooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rate_limit_counters: {
        Row: {
          request_count: number
          route_key: string
          user_id: string
          window_start: string
        }
        Insert: {
          request_count?: number
          route_key: string
          user_id: string
          window_start: string
        }
        Update: {
          request_count?: number
          route_key?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string
          requested_by: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          requested_by?: string | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          requested_by?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      registrar_locations: {
        Row: {
          created_at: string
          id: number
          location: unknown
          registrar_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          location: unknown
          registrar_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          location?: unknown
          registrar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrar_locations_registrar_id_fkey"
            columns: ["registrar_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      report_definitions: {
        Row: {
          ai_narrative: boolean
          cadence: string
          created_at: string
          created_by: string | null
          delivery_hour: number
          enabled: boolean
          id: string
          name: string
          next_run_at: string | null
          sections: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          ai_narrative?: boolean
          cadence: string
          created_at?: string
          created_by?: string | null
          delivery_hour?: number
          enabled?: boolean
          id?: string
          name: string
          next_run_at?: string | null
          sections?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          ai_narrative?: boolean
          cadence?: string
          created_at?: string
          created_by?: string | null
          delivery_hour?: number
          enabled?: boolean
          id?: string
          name?: string
          next_run_at?: string | null
          sections?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_delivery_logs: {
        Row: {
          channel: string
          created_at: string
          detail: string | null
          id: string
          recipient_id: string | null
          run_id: string
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          detail?: string | null
          id?: string
          recipient_id?: string | null
          run_id: string
          status: string
        }
        Update: {
          channel?: string
          created_at?: string
          detail?: string | null
          id?: string
          recipient_id?: string | null
          run_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_delivery_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "report_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      report_metrics_snapshots: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          period_end: string
          period_start: string
          section: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics: Json
          period_end: string
          period_start: string
          section: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          period_end?: string
          period_start?: string
          section?: string
        }
        Relationships: []
      }
      report_recipients: {
        Row: {
          admin_id: string
          channels: string[]
          created_at: string
          created_by: string | null
          definition_id: string
          id: string
          redacted_sections: Json
        }
        Insert: {
          admin_id: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          definition_id: string
          id?: string
          redacted_sections?: Json
        }
        Update: {
          admin_id?: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          definition_id?: string
          id?: string
          redacted_sections?: Json
        }
        Relationships: [
          {
            foreignKeyName: "report_recipients_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "report_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          anomalies: Json
          awaiting: Json
          cadence: string
          completed_at: string | null
          created_at: string
          definition_id: string
          error: string | null
          id: string
          idempotency_key: string
          metrics: Json | null
          narrative_md: string | null
          narrative_model: string | null
          period_end: string
          period_start: string
          started_at: string | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          anomalies?: Json
          awaiting?: Json
          cadence: string
          completed_at?: string | null
          created_at?: string
          definition_id: string
          error?: string | null
          id?: string
          idempotency_key: string
          metrics?: Json | null
          narrative_md?: string | null
          narrative_model?: string | null
          period_end: string
          period_start: string
          started_at?: string | null
          status?: string
          triggered_by?: string | null
        }
        Update: {
          anomalies?: Json
          awaiting?: Json
          cadence?: string
          completed_at?: string | null
          created_at?: string
          definition_id?: string
          error?: string | null
          id?: string
          idempotency_key?: string
          metrics?: Json | null
          narrative_md?: string | null
          narrative_model?: string | null
          period_end?: string
          period_start?: string
          started_at?: string | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "report_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_canaries: {
        Row: {
          context: string
          hit_at: string | null
          id: string
          issued_at: string
          owner_id: string
          token: string
        }
        Insert: {
          context: string
          hit_at?: string | null
          id?: string
          issued_at?: string
          owner_id: string
          token: string
        }
        Update: {
          context?: string
          hit_at?: string | null
          id?: string
          issued_at?: string
          owner_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_canaries_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      security_device_signals: {
        Row: {
          created_at: string
          detail: Json
          id: string
          signal_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          signal_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          signal_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_device_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      security_threats: {
        Row: {
          affected_records: string | null
          affected_users: number | null
          auto_detected: boolean | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          mitigated_at: string | null
          mitigated_by: string | null
          mitigation_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_ip: string | null
          source_module: string | null
          status: Database["public"]["Enums"]["threat_status"] | null
          threat_level: Database["public"]["Enums"]["threat_level"]
          threat_type: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_records?: string | null
          affected_users?: number | null
          auto_detected?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          mitigated_at?: string | null
          mitigated_by?: string | null
          mitigation_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_ip?: string | null
          source_module?: string | null
          status?: Database["public"]["Enums"]["threat_status"] | null
          threat_level: Database["public"]["Enums"]["threat_level"]
          threat_type: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_records?: string | null
          affected_users?: number | null
          auto_detected?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          mitigated_at?: string | null
          mitigated_by?: string | null
          mitigation_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_ip?: string | null
          source_module?: string | null
          status?: Database["public"]["Enums"]["threat_status"] | null
          threat_level?: Database["public"]["Enums"]["threat_level"]
          threat_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_threats_mitigated_by_fkey"
            columns: ["mitigated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "security_threats_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      service_charge_rates: {
        Row: {
          basis: string
          key: string
          label: string
          rate_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          basis?: string
          key: string
          label: string
          rate_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          basis?: string
          key?: string
          label?: string
          rate_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      session: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          token: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id: string
          ip_address?: string | null
          token: string
          updated_at: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          token?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_user_id_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_change_log: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          setting_area: string
          setting_key: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          setting_area: string
          setting_key: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          setting_area?: string
          setting_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_change_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      storage_cleanup_queue: {
        Row: {
          bucket_name: string
          created_at: string | null
          file_paths: Json
          id: string
        }
        Insert: {
          bucket_name?: string
          created_at?: string | null
          file_paths: Json
          id?: string
        }
        Update: {
          bucket_name?: string
          created_at?: string | null
          file_paths?: Json
          id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_ad_campaigns: number | null
          max_listings: number | null
          max_storage_gb: number | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          slug: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_ad_campaigns?: number | null
          max_listings?: number | null
          max_storage_gb?: number | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug: string
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_ad_campaigns?: number | null
          max_listings?: number | null
          max_storage_gb?: number | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          benefits: Json
          created_at: string
          description: string | null
          display_order: number
          duration_days: number | null
          id: string
          is_active: boolean
          key: string
          name: string
          price_ghs: number
        }
        Insert: {
          benefits?: Json
          created_at?: string
          description?: string | null
          display_order?: number
          duration_days?: number | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          price_ghs?: number
        }
        Update: {
          benefits?: Json
          created_at?: string
          description?: string | null
          display_order?: number
          duration_days?: number | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          price_ghs?: number
        }
        Relationships: []
      }
      subscription_upgrade_requests: {
        Row: {
          decline_reason: string | null
          id: string
          note: string | null
          pass_type: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tier_key: string
          user_id: string
        }
        Insert: {
          decline_reason?: string | null
          id?: string
          note?: string | null
          pass_type: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tier_key: string
          user_id: string
        }
        Update: {
          decline_reason?: string | null
          id?: string
          note?: string | null
          pass_type?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tier_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_upgrade_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      symptom_body_parts: {
        Row: {
          body_part_id: string
          source: string
          symptom_id: string
        }
        Insert: {
          body_part_id: string
          source?: string
          symptom_id: string
        }
        Update: {
          body_part_id?: string
          source?: string
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_body_parts_body_part_id_body_parts_id_fk"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_body_parts_symptom_id_symptoms_id_fk"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_categories: {
        Row: {
          category_id: string
          symptom_id: string
        }
        Insert: {
          category_id: string
          symptom_id: string
        }
        Update: {
          category_id?: string
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_categories_category_id_categories_id_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_categories_symptom_id_symptoms_id_fk"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_causes: {
        Row: {
          cause_name: string
          id: string
          other_possible_causes: Json | null
          symptom_id: string | null
        }
        Insert: {
          cause_name: string
          id?: string
          other_possible_causes?: Json | null
          symptom_id?: string | null
        }
        Update: {
          cause_name?: string
          id?: string
          other_possible_causes?: Json | null
          symptom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_causes_symptom_id_symptoms_id_fk"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_types: {
        Row: {
          about_type: Json | null
          id: string
          symptom_id: string | null
          type_name: string
        }
        Insert: {
          about_type?: Json | null
          id?: string
          symptom_id?: string | null
          type_name: string
        }
        Update: {
          about_type?: Json | null
          id?: string
          symptom_id?: string | null
          type_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_types_symptom_id_symptoms_id_fk"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_views: {
        Row: {
          created_at: string | null
          id: string
          symptom_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          symptom_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          symptom_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_views_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      symptoms: {
        Row: {
          about: Json | null
          attribution: Json | null
          author_id: string | null
          complications: Json | null
          contact_your_doctor: Json | null
          created_at: string
          diagnosis: Json | null
          featured_from: string | null
          featured_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_systemic: boolean | null
          metadata: Json | null
          more_information: Json | null
          name: string | null
          nhs_link: string | null
          prevention: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_vector: unknown
          severity: string | null
          slug: string | null
          specialist: string | null
          status: string | null
          treatment: Json | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          about?: Json | null
          attribution?: Json | null
          author_id?: string | null
          complications?: Json | null
          contact_your_doctor?: Json | null
          created_at?: string
          diagnosis?: Json | null
          featured_from?: string | null
          featured_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_systemic?: boolean | null
          metadata?: Json | null
          more_information?: Json | null
          name?: string | null
          nhs_link?: string | null
          prevention?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_vector?: unknown
          severity?: string | null
          slug?: string | null
          specialist?: string | null
          status?: string | null
          treatment?: Json | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          about?: Json | null
          attribution?: Json | null
          author_id?: string | null
          complications?: Json | null
          contact_your_doctor?: Json | null
          created_at?: string
          diagnosis?: Json | null
          featured_from?: string | null
          featured_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_systemic?: boolean | null
          metadata?: Json | null
          more_information?: Json | null
          name?: string | null
          nhs_link?: string | null
          prevention?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_vector?: unknown
          severity?: string | null
          slug?: string | null
          specialist?: string | null
          status?: string | null
          treatment?: Json | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "symptoms_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "symptoms_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tax_filings: {
        Row: {
          created_at: string
          due_date: string | null
          filed_at: string | null
          id: string
          notes: string | null
          period: string
          remitted_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          filed_at?: string | null
          id?: string
          notes?: string | null
          period: string
          remitted_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          filed_at?: string | null
          id?: string
          notes?: string | null
          period?: string
          remitted_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      top_rated_items: {
        Row: {
          added_at: string
          added_by: string | null
          expire_at: string | null
          id: string
          image_url: string | null
          item_id: string
          module: string
          module_data: Json
          publish_from: string | null
          rank: number | null
          rating: number | null
          rating_count: number | null
          source: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          expire_at?: string | null
          id?: string
          image_url?: string | null
          item_id: string
          module: string
          module_data?: Json
          publish_from?: string | null
          rank?: number | null
          rating?: number | null
          rating_count?: number | null
          source: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          expire_at?: string | null
          id?: string
          image_url?: string | null
          item_id?: string
          module?: string
          module_data?: Json
          publish_from?: string | null
          rank?: number | null
          rating?: number | null
          rating_count?: number | null
          source?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "top_rated_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transaction_records: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          facility_id: string | null
          id: string
          metadata: Json | null
          payment_provider: string | null
          provider_reference: string | null
          status: string | null
          transaction_reference: string
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          provider_reference?: string | null
          status?: string | null
          transaction_reference: string
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          provider_reference?: string | null
          status?: string | null
          transaction_reference?: string
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_records_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          attempts: number
          category: string
          created_at: string
          created_by: string | null
          currency: string
          direction: string
          entity_kind: string
          failure_reason: string | null
          fee_amount: number | null
          fee_rate_applied: number | null
          id: string
          next_retry_at: string | null
          payer_business_id: string | null
          payer_class: string
          payer_code: string
          payer_name: string
          payer_user_id: string | null
          payment_method: string
          plan_key: string | null
          processed_at: string
          reference: string
          source: string
          source_id: string | null
          status: string
          txn_type_detail: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          amount?: number
          attempts?: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          direction?: string
          entity_kind?: string
          failure_reason?: string | null
          fee_amount?: number | null
          fee_rate_applied?: number | null
          id?: string
          next_retry_at?: string | null
          payer_business_id?: string | null
          payer_class?: string
          payer_code?: string
          payer_name?: string
          payer_user_id?: string | null
          payment_method?: string
          plan_key?: string | null
          processed_at?: string
          reference?: string
          source?: string
          source_id?: string | null
          status?: string
          txn_type_detail?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          amount?: number
          attempts?: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          direction?: string
          entity_kind?: string
          failure_reason?: string | null
          fee_amount?: number | null
          fee_rate_applied?: number | null
          id?: string
          next_retry_at?: string | null
          payer_business_id?: string | null
          payer_class?: string
          payer_code?: string
          payer_name?: string
          payer_user_id?: string | null
          payment_method?: string
          plan_key?: string | null
          processed_at?: string
          reference?: string
          source?: string
          source_id?: string | null
          status?: string
          txn_type_detail?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      twilio_whatsapp_handshakes: {
        Row: {
          created_at: string | null
          expires_at: string | null
          facility_email: string
          gps_address: string
          id: string
          phone_number: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          facility_email: string
          gps_address: string
          id?: string
          phone_number: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          facility_email?: string
          gps_address?: string
          id?: string
          phone_number?: string
          status?: string | null
        }
        Relationships: []
      }
      user: {
        Row: {
          banned: boolean | null
          created_at: string
          email: string
          email_verified: boolean
          id: string
          image: string | null
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          banned?: boolean | null
          created_at?: string
          email: string
          email_verified?: boolean
          id: string
          image?: string | null
          name: string
          role?: string
          updated_at?: string
        }
        Update: {
          banned?: boolean | null
          created_at?: string
          email?: string
          email_verified?: boolean
          id?: string
          image?: string | null
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_type: string | null
          invited_by: string | null
          is_revoked: boolean | null
          revoked_at: string | null
          revoked_by: string | null
          role: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invite_type?: string | null
          invited_by?: string | null
          is_revoked?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invite_type?: string | null
          invited_by?: string | null
          is_revoked?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_invites_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_invites_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_notes: {
        Row: {
          created_at: string
          emotion: string | null
          id: string
          medication_id: string | null
          note: string
          note_type: string | null
          timestamp: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          emotion?: string | null
          id?: string
          medication_id?: string | null
          note: string
          note_type?: string | null
          timestamp?: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          emotion?: string | null
          id?: string
          medication_id?: string | null
          note?: string
          note_type?: string | null
          timestamp?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medication_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_notes_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          admin_permissions: Json | null
          admin_role: Database["public"]["Enums"]["admin_role"] | null
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          department: string | null
          dob: string | null
          expo_push_token: string | null
          first_name: string
          fitcoins_balance: number | null
          has_completed_fitness_onboarding: boolean
          is_admin: boolean | null
          last_active: string | null
          last_login_at: string | null
          last_name: string
          last_review_prompt_at: string | null
          lifetime_fitcoins_earned: number
          location: string | null
          locked_until: string | null
          login_attempts: number | null
          marketing_consent: boolean
          medical_disclaimer_acknowledged_at: string | null
          mfa_enabled: boolean | null
          mfa_verified_at: string | null
          nhis_number: string | null
          notes: string | null
          phone_number: string
          public_id: string | null
          push_chats_enabled: boolean
          push_medication_enabled: boolean
          push_notifications_enabled: boolean
          push_promotions_enabled: boolean
          push_workouts_enabled: boolean
          region: string | null
          requires_password_change: boolean | null
          research_consent: boolean
          role: string
          sex: string | null
          status: string
          timezone: string
          updated_at: string
          user_id: string
          user_type: string
          whatsapp_opt_in: boolean
          whatsapp_opt_in_at: string | null
          whitelisted_ips: string[] | null
        }
        Insert: {
          admin_permissions?: Json | null
          admin_role?: Database["public"]["Enums"]["admin_role"] | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          dob?: string | null
          expo_push_token?: string | null
          first_name: string
          fitcoins_balance?: number | null
          has_completed_fitness_onboarding?: boolean
          is_admin?: boolean | null
          last_active?: string | null
          last_login_at?: string | null
          last_name: string
          last_review_prompt_at?: string | null
          lifetime_fitcoins_earned?: number
          location?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          marketing_consent?: boolean
          medical_disclaimer_acknowledged_at?: string | null
          mfa_enabled?: boolean | null
          mfa_verified_at?: string | null
          nhis_number?: string | null
          notes?: string | null
          phone_number: string
          public_id?: string | null
          push_chats_enabled?: boolean
          push_medication_enabled?: boolean
          push_notifications_enabled?: boolean
          push_promotions_enabled?: boolean
          push_workouts_enabled?: boolean
          region?: string | null
          requires_password_change?: boolean | null
          research_consent?: boolean
          role?: string
          sex?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id: string
          user_type?: string
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
          whitelisted_ips?: string[] | null
        }
        Update: {
          admin_permissions?: Json | null
          admin_role?: Database["public"]["Enums"]["admin_role"] | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          dob?: string | null
          expo_push_token?: string | null
          first_name?: string
          fitcoins_balance?: number | null
          has_completed_fitness_onboarding?: boolean
          is_admin?: boolean | null
          last_active?: string | null
          last_login_at?: string | null
          last_name?: string
          last_review_prompt_at?: string | null
          lifetime_fitcoins_earned?: number
          location?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          marketing_consent?: boolean
          medical_disclaimer_acknowledged_at?: string | null
          mfa_enabled?: boolean | null
          mfa_verified_at?: string | null
          nhis_number?: string | null
          notes?: string | null
          phone_number?: string
          public_id?: string | null
          push_chats_enabled?: boolean
          push_medication_enabled?: boolean
          push_notifications_enabled?: boolean
          push_promotions_enabled?: boolean
          push_workouts_enabled?: boolean
          region?: string | null
          requires_password_change?: boolean | null
          research_consent?: boolean
          role?: string
          sex?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          user_type?: string
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
          whitelisted_ips?: string[] | null
        }
        Relationships: []
      }
      user_push_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          device_name: string | null
          expo_push_token: string
          id: string
          last_seen_at: string
          os_version: string | null
          platform: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_name?: string | null
          expo_push_token: string
          id?: string
          last_seen_at?: string
          os_version?: string | null
          platform?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_name?: string | null
          expo_push_token?: string
          id?: string
          last_seen_at?: string
          os_version?: string | null
          platform?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          last_payment_at: string | null
          last_reminded_at: string | null
          next_payment_due: string | null
          next_renewal_at: string | null
          note: string | null
          payment_method: string | null
          paystack_reference: string | null
          plan_id: string | null
          risk_reason: string | null
          scope: string
          source: string
          started_at: string
          starts_at: string
          status: string | null
          subscribed_at: string
          tier_id: string | null
          total_paid: number | null
          total_payments: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          last_payment_at?: string | null
          last_reminded_at?: string | null
          next_payment_due?: string | null
          next_renewal_at?: string | null
          note?: string | null
          payment_method?: string | null
          paystack_reference?: string | null
          plan_id?: string | null
          risk_reason?: string | null
          scope?: string
          source?: string
          started_at?: string
          starts_at?: string
          status?: string | null
          subscribed_at?: string
          tier_id?: string | null
          total_paid?: number | null
          total_payments?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          last_payment_at?: string | null
          last_reminded_at?: string | null
          next_payment_due?: string | null
          next_renewal_at?: string | null
          note?: string | null
          payment_method?: string | null
          paystack_reference?: string | null
          plan_id?: string | null
          risk_reason?: string | null
          scope?: string
          source?: string
          started_at?: string
          starts_at?: string
          status?: string | null
          subscribed_at?: string
          tier_id?: string | null
          total_paid?: number | null
          total_payments?: number | null
          updated_at?: string
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
          {
            foreignKeyName: "user_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      verification: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          identifier: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id: string
          identifier: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          identifier?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      whatsapp_broadcasts: {
        Row: {
          audience_filter: Json
          created_at: string
          created_by: string | null
          delivery_stats: Json
          group_id: string | null
          id: string
          media_url: string | null
          message: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          audience_filter?: Json
          created_at?: string
          created_by?: string | null
          delivery_stats?: Json
          group_id?: string | null
          id?: string
          media_url?: string | null
          message: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          audience_filter?: Json
          created_at?: string
          created_by?: string | null
          delivery_stats?: Json
          group_id?: string | null
          id?: string
          media_url?: string | null
          message?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "whatsapp_broadcasts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcasts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          left_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      whatsapp_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          group_type: string
          id: string
          last_message_at: string | null
          linked_id: string | null
          linked_to: string
          member_count: number
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_type?: string
          id?: string
          last_message_at?: string | null
          linked_id?: string | null
          linked_to?: string
          member_count?: number
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_type?: string
          id?: string
          last_message_at?: string | null
          linked_id?: string | null
          linked_to?: string
          member_count?: number
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body_preview: string | null
          category: string | null
          created_at: string
          id: string
          language: string
          meta_template_id: string | null
          name: string
          status: string
          synced_at: string | null
        }
        Insert: {
          body_preview?: string | null
          category?: string | null
          created_at?: string
          id?: string
          language?: string
          meta_template_id?: string | null
          name: string
          status?: string
          synced_at?: string | null
        }
        Update: {
          body_preview?: string | null
          category?: string | null
          created_at?: string
          id?: string
          language?: string
          meta_template_id?: string | null
          name?: string
          status?: string
          synced_at?: string | null
        }
        Relationships: []
      }
      workout_reminders: {
        Row: {
          created_at: string
          days: string[]
          duration: string
          goals: string | null
          id: string
          is_active: boolean
          is_enabled: boolean
          last_sent_at: string | null
          time: string
          updated_at: string
          user_id: string
          workout_type: string
        }
        Insert: {
          created_at?: string
          days: string[]
          duration: string
          goals?: string | null
          id?: string
          is_active?: boolean
          is_enabled?: boolean
          last_sent_at?: string | null
          time: string
          updated_at?: string
          user_id: string
          workout_type: string
        }
        Update: {
          created_at?: string
          days?: string[]
          duration?: string
          goals?: string | null
          id?: string
          is_active?: boolean
          is_enabled?: boolean
          last_sent_at?: string | null
          time?: string
          updated_at?: string
          user_id?: string
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      condition_stats: {
        Row: {
          top_body_part: string | null
          top_category: string | null
          total_conditions: number | null
        }
        Relationships: []
      }
      fitness_challenge_leaderboard: {
        Row: {
          avatar_url: string | null
          challenge_id: string | null
          first_name: string | null
          last_name: string | null
          participant_id: string | null
          progress_pct: number | null
          rank: number | null
          status: string | null
          team_id: string | null
          team_name: string | null
          total_score: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_challenge_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenge_team_leaderboard"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fitness_challenge_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenge_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fitness_challenge_team_leaderboard: {
        Row: {
          avatar_url: string | null
          challenge_id: string | null
          member_count: number | null
          rank: number | null
          team_id: string | null
          team_name: string | null
          total_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_challenge_teams_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "fitness_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      healthy_living_info_view: {
        Row: {
          attribution: Json | null
          content: Json | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          metadata: Json | null
          name: string | null
          slug: string | null
          status: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          attribution?: Json | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          metadata?: Json | null
          name?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          attribution?: Json | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          metadata?: Json | null
          name?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      notification_log_export: {
        Row: {
          body: string | null
          campaign_id: string | null
          channel: string | null
          created_at: string | null
          delivered_at: string | null
          id: string | null
          is_broadcast: boolean | null
          is_read: boolean | null
          opened_at: string | null
          sent_by: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          body?: string | null
          campaign_id?: string | null
          channel?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string | null
          is_broadcast?: boolean | null
          is_read?: boolean | null
          opened_at?: string | null
          sent_by?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          body?: string | null
          campaign_id?: string | null
          channel?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string | null
          is_broadcast?: boolean | null
          is_read?: boolean | null
          opened_at?: string | null
          sent_by?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      accept_enquiry_offer: { Args: { p_response_id: string }; Returns: Json }
      activate_fitness_plan: {
        Args: { p_plan_id: string }
        Returns: {
          completed_at: string | null
          created_at: string
          current_day_number: number
          current_week: number
          id: string
          plan_id: string
          started_at: string
          status: string
          streak_weeks: number
          total_lbs_lifted: number
          total_minutes_invested: number
          total_workouts_completed: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "fitness_user_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_change_facility_status: {
        Args: { p_admin_id: string; payload: Json }
        Returns: undefined
      }
      admin_delete_facility: {
        Args: { p_admin_id: string; p_facility_id: string }
        Returns: undefined
      }
      admin_delete_medication_reminder: {
        Args: { p_admin_id: string; p_reminder_id: string }
        Returns: undefined
      }
      admin_global_search: {
        Args: { result_limit?: number; search_term: string }
        Returns: {
          entity_id: string
          entity_type: string
          href: string
          rank: number
          subtitle: string
          title: string
        }[]
      }
      admin_moderate_app_review: {
        Args: {
          p_note?: string
          p_review_id: string
          p_status: Database["public"]["Enums"]["review_status"]
        }
        Returns: undefined
      }
      admin_perform_facility_review_action: {
        Args: {
          p_admin_id: string
          p_comment_text?: string
          p_facility_id: string
          p_is_top_rated: boolean
          p_parent_id?: string
          p_rating?: number
        }
        Returns: undefined
      }
      admin_remove_top_rated: {
        Args: { p_item_id: string; p_module: string }
        Returns: undefined
      }
      admin_remove_top_rated_item: {
        Args: { p_item_id: string; p_module: string }
        Returns: undefined
      }
      admin_review_fitcoin_redemption: {
        Args: {
          p_action: string
          p_admin_id: string
          p_reason?: string
          p_redemption_id: string
        }
        Returns: Json
      }
      admin_session_heartbeat: {
        Args: { p_session_token: string }
        Returns: undefined
      }
      admin_update_facility_profile: {
        Args: {
          p_admin_id: string
          p_facility_id: string
          p_final_media_urls: string[]
          p_payload: Json
        }
        Returns: undefined
      }
      admin_upsert_medication_reminder: {
        Args: { p_payload: Json; p_reminder_id: string; p_user_id: string }
        Returns: string
      }
      admin_upsert_top_rated: {
        Args: {
          p_added_by?: string
          p_expire_at?: string
          p_image_url?: string
          p_item_id: string
          p_module: string
          p_publish_from?: string
          p_rank?: number
          p_rating?: number
          p_rating_count?: number
          p_source?: string
          p_subtitle?: string
          p_title: string
        }
        Returns: {
          added_at: string
          added_by: string
          id: string
          image_url: string
          item_id: string
          module: string
          rank: number
          rating: number
          rating_count: number
          source: string
          subtitle: string
          title: string
          updated_at: string
        }[]
      }
      admin_upsert_top_rated_item: {
        Args: {
          p_added_by?: string
          p_expire_at?: string
          p_image_url?: string
          p_item_id: string
          p_module: string
          p_publish_from?: string
          p_rank?: number
          p_rating?: number
          p_rating_count?: number
          p_source?: string
          p_subtitle?: string
          p_title: string
        }
        Returns: {
          added_at: string
          added_by: string
          id: string
          image_url: string
          item_id: string
          module: string
          rank: number
          rating: number
          rating_count: number
          source: string
          subtitle: string
          title: string
          updated_at: string
        }[]
      }
      anonymize_expired_financial_records: { Args: never; Returns: Json }
      apply_drug_body_part_rules: {
        Args: { p_only_unmapped?: boolean }
        Returns: number
      }
      apply_to_job: {
        Args: { p_job_id: string; p_payload: Json }
        Returns: Json
      }
      auth_user_exists_by_email: { Args: { p_email: string }; Returns: boolean }
      auto_cleanup_old_notifications: { Args: never; Returns: undefined }
      award_fitcoins: {
        Args: {
          p_amount: number
          p_reference_id?: string
          p_transaction_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      award_fitcoins_capped: {
        Args: {
          p_activity_key: string
          p_fallback: number
          p_reference_id?: string
          p_user_id: string
        }
        Returns: number
      }
      backfill_medication_drug_ids: { Args: never; Returns: Json }
      build_top_rated_module_data: {
        Args: { p_item_id: string; p_module: string }
        Returns: Json
      }
      can_insert_conversation_member: {
        Args: { target_conversation_id: string; target_user_id: string }
        Returns: boolean
      }
      cancel_medication_enquiry: { Args: { p_id: string }; Returns: Json }
      capture_daily_metrics: { Args: never; Returns: undefined }
      check_and_increment_rate_limit: {
        Args: {
          p_max_requests: number
          p_route_key: string
          p_user_id: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          request_count: number
          retry_after_seconds: number
          window_start: string
        }[]
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_notification_logs: { Args: never; Returns: undefined }
      collect_push_tickets: { Args: never; Returns: Json }
      contract_rpc_signatures: { Args: { p_names: string[] }; Returns: Json }
      count_created_at_delta: {
        Args: {
          p_created_at_column: string
          p_end_at?: string
          p_start_at: string
          p_table: unknown
        }
        Returns: Json
      }
      create_ibp_profile: {
        Args: {
          p_first_name: string
          p_ibp_data: Json
          p_last_name: string
          p_phone: string
          p_role: string
          p_user_id: string
          p_user_type: string
        }
        Returns: Json
      }
      create_profile_flag: {
        Args: {
          p_admin_id: string
          p_detail?: string
          p_reason: string
          p_user_id: string
        }
        Returns: string
      }
      delete_healthy_living_info: { Args: { p_id: string }; Returns: undefined }
      delete_my_cv: { Args: never; Returns: Json }
      delete_old_notifications: { Args: never; Returns: undefined }
      detect_admin_multi_ip_sessions: { Args: never; Returns: Json }
      dispatch_notification: {
        Args: { p_campaign_id?: string; p_recipients: Json }
        Returns: Json
      }
      dispatch_notification_async: {
        Args: { p_campaign_id?: string; p_recipients: Json }
        Returns: Json
      }
      end_admin_session: {
        Args: { p_reason?: string; p_session_token: string }
        Returns: undefined
      }
      end_other_admin_sessions: {
        Args: { p_admin_id: string; p_reason?: string }
        Returns: number
      }
      enforce_read_quota: {
        Args: {
          p_max_requests: number
          p_route_key: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      enqueue_due_report_runs: { Args: { p_now?: string }; Returns: number }
      expire_delete_account_grace_periods: { Args: never; Returns: Json }
      expire_device_sign_in_requests: { Args: never; Returns: undefined }
      expire_stale_admin_sessions: {
        Args: { p_idle_minutes?: number }
        Returns: number
      }
      facility_has_privilege: {
        Args: { p_facility_id: string; p_privilege: string }
        Returns: boolean
      }
      fitcoin_amount_for: {
        Args: { p_activity_key: string; p_fallback: number }
        Returns: number
      }
      fitness_member_ids: {
        Args: never
        Returns: {
          first_seen: string
          user_id: string
        }[]
      }
      fitness_plan_position: {
        Args: { p_duration_weeks: number; p_on?: string; p_started_at: string }
        Returns: {
          day_index: number
          day_number: number
          is_finished: boolean
          is_started: boolean
          total_days: number
          week_number: number
        }[]
      }
      fn_assign_admin_with_rules: {
        Args: { p_conversation_id: string; p_role?: string; p_user_id: string }
        Returns: undefined
      }
      fn_create_group_conversation:
        | {
            Args: {
              p_avatar_url: string
              p_created_by: string
              p_description: string
              p_member_ids: string[]
              p_name: string
            }
            Returns: string
          }
        | {
            Args: {
              p_avatar_url: string
              p_created_by: string
              p_description: string
              p_facility_id?: string
              p_member_ids: string[]
              p_name: string
            }
            Returns: string
          }
      fn_fitness_challenge_deadlines: { Args: never; Returns: number }
      fn_fitness_exercise_is_locked: {
        Args: { p_exercise_id: string }
        Returns: boolean
      }
      fn_fitness_expire_stale_assignments: { Args: never; Returns: undefined }
      fn_fitness_streak_alerts: { Args: never; Returns: number }
      fn_fitness_subscription_renewals: { Args: never; Returns: number }
      fn_make_group_leader: {
        Args: {
          p_conversation_id: string
          p_facility_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      fn_mark_conversation_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      fn_record_period_cycle: {
        Args: {
          p_confidence?: number
          p_cycle_length?: number
          p_explanation_code?: string
          p_fertile_window?: unknown
          p_model_key?: string
          p_model_version?: string
          p_next_period_forecast?: string
          p_ovulation_forecast?: string
          p_period_end_date?: string
          p_period_length?: number
          p_period_start_date: string
        }
        Returns: Json
      }
      get_admin_dashboard_metrics: {
        Args: { time_filter?: string }
        Returns: Json
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_task_stats: { Args: never; Returns: Json }
      get_ai_analytics: { Args: { time_filter?: string }; Returns: Json }
      get_ai_hub_overview: { Args: never; Returns: Json }
      get_anatomy_body_part_bundle: {
        Args: {
          p_body_part_id: string
          p_gender?: string
          p_preview_limit?: number
        }
        Returns: Json
      }
      get_anatomy_body_part_items: {
        Args: {
          p_body_part_id: string
          p_gender?: string
          p_kind: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: Json
      }
      get_anatomy_overview_stats: { Args: never; Returns: Json }
      get_anatomy_premium_config: { Args: never; Returns: Json }
      get_anatomy_quiz: { Args: { p_limit?: number }; Returns: Json }
      get_anatomy_region_content: {
        Args: { p_gender?: string; p_include_items?: boolean; p_region: string }
        Returns: Json
      }
      get_app_review_kpi_stats: { Args: never; Returns: Json }
      get_app_review_prompt_state: { Args: never; Returns: Json }
      get_bedtracker_route_suggestions: {
        Args: { p_limit?: number; p_pickup_gps: string; p_ward_type: string }
        Returns: {
          available_beds: number
          bed_tracker_facility_id: string
          distance_km: number
          facility_id: string
          facility_name: string
          gps_coordinates: string
          region: string
        }[]
      }
      get_best_time_stats: {
        Args: never
        Returns: {
          hour_bucket: number
          opened_count: number
          segment: string
        }[]
      }
      get_body_part_stats: {
        Args: never
        Returns: {
          body_part_id: string
          body_part_name: string
          condition_count: number
          symptom_count: number
        }[]
      }
      get_campaign_event_stats: {
        Args: { p_campaign_ids: string[] }
        Returns: Json
      }
      get_chat_kpi_stats: { Args: never; Returns: Json }
      get_chat_tab_counts: { Args: never; Returns: Json }
      get_content_dashboard_metrics: {
        Args: { time_filter?: string }
        Returns: Json
      }
      get_conversations: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: Json
      }
      get_dashboard_metrics: { Args: never; Returns: Json }
      get_delete_account_request_stats: { Args: never; Returns: Json }
      get_device_analytics: { Args: never; Returns: Json }
      get_device_sign_in_status: {
        Args: { p_request_id: string }
        Returns: Json
      }
      get_drug_adherence_stats: {
        Args: never
        Returns: {
          active_reminders: number
          adherence_rate: number
          avg_doses_per_day: number
          drug_id: string
          drug_name: string
          missed_30d: number
        }[]
      }
      get_drug_kpi_stats: {
        Args: never
        Returns: {
          drug_categories: number
          drugs_in_db: number
          interaction_flags_30d: number
          interaction_pairs: number
          pending_verifications: number
        }[]
      }
      get_due_live_trivia_events: {
        Args: { p_current_time: string }
        Returns: {
          id: string
          title: string
        }[]
      }
      get_due_medication_reminders: {
        Args: { p_current_time: string }
        Returns: {
          dosage_amount: string
          drug_name: string
          expected_time: string
          expo_push_token: string
          id: string
          instructions: string
          user_id: string
        }[]
      }
      get_due_period_reminders: {
        Args: { p_current_time: string }
        Returns: {
          body: string
          expo_push_token: string
          metadata: Json
          reminder_kind: string
          title: string
          user_id: string
        }[]
      }
      get_due_reminders: {
        Args: { p_current_time: string }
        Returns: {
          dosage_amount: string
          drug_name: string
          expected_time: string
          expo_push_token: string
          id: string
          instructions: string
          user_id: string
        }[]
      }
      get_due_workout_reminders: {
        Args: { p_current_time: string }
        Returns: {
          expo_push_token: string
          id: string
          user_id: string
          workout_type: string
        }[]
      }
      get_effective_admin_permissions: {
        Args: { p_user_id: string }
        Returns: {
          action: string
          key: string
          resource: string
        }[]
      }
      get_facilities_map: {
        Args: {
          maxlat: number
          maxlng: number
          minlat: number
          minlng: number
          p_district?: string
          p_facility_name?: string
          p_facility_type?: string
          p_is_top_rated?: boolean
          p_region?: string
          p_status?: string
          zoom_level: number
        }
        Returns: Json
      }
      get_facility_dashboard_metrics: {
        Args: { time_filter?: string }
        Returns: Json
      }
      get_facility_scout_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          data_earned_mb: number
          duplicates: number
          full_name: string
          region: string
          registered: number
          submissions: number
          user_id: string
        }[]
      }
      get_fitcoin_config: { Args: never; Returns: Json }
      get_fitcoins_dashboard: { Args: { p_user_id: string }; Returns: Json }
      get_fitness_activity_history: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: Json
      }
      get_fitness_ai_log_stats: {
        Args: { p_period_days?: number }
        Returns: Json
      }
      get_fitness_dashboard: { Args: { p_user_id: string }; Returns: Json }
      get_fitness_dashboard_kpis: { Args: never; Returns: Json }
      get_fitness_health_sync_stats: { Args: never; Returns: Json }
      get_fitness_schedule_stats: { Args: never; Returns: Json }
      get_fitness_social_proof: { Args: never; Returns: Json }
      get_fitness_users: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: Json
      }
      get_fitness_week: { Args: { p_user_id: string }; Returns: Json }
      get_flagged_content: { Args: never; Returns: Json }
      get_healthy_living_analytics: { Args: never; Returns: Json }
      get_healthy_living_kpi_stats: {
        Args: never
        Returns: {
          published_articles: number
          published_delta: number
          total_articles: number
          total_delta: number
          total_views: number
        }[]
      }
      get_home_carousel: { Args: never; Returns: Json }
      get_ibp_kpi_stats: { Args: never; Returns: Json }
      get_job_alert: { Args: never; Returns: Json }
      get_job_details: { Args: { p_id: string }; Returns: Json }
      get_job_listings: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_region?: string
          p_search?: string
          p_specialty?: string
          p_type?: string
        }
        Returns: Json
      }
      get_marketing_overview: { Args: never; Returns: Json }
      get_med_enquiry_overview: { Args: never; Returns: Json }
      get_medication_enquiry_detail: { Args: { p_id: string }; Returns: Json }
      get_medication_kpi_stats: { Args: never; Returns: Json }
      get_most_used_fitness_plans: { Args: { p_limit?: number }; Returns: Json }
      get_my_applications: { Args: never; Returns: Json }
      get_my_cv: { Args: never; Returns: Json }
      get_my_entitlement: { Args: never; Returns: Json }
      get_my_medication_enquiries: { Args: never; Returns: Json }
      get_notification_analytics: {
        Args: { time_filter?: string }
        Returns: Json
      }
      get_notification_segment_count: {
        Args: { p_segment_filter: Json }
        Returns: Json
      }
      get_outdoor_route_pins: {
        Args: never
        Returns: {
          area: string
          category: string
          difficulty: string
          distance_km: number
          has_gps: boolean
          id: string
          name: string
          pin_source: string
          rating: number
          region: string
          route_class: string
          start_lat: number
          start_lng: number
        }[]
      }
      get_platform_overview_metrics: {
        Args: { time_filter?: string }
        Returns: Json
      }
      get_public_app_config: { Args: never; Returns: Json }
      get_public_faqs: {
        Args: never
        Returns: {
          answer: string
          category_name: string
          id: string
          question: string
          view_count: number
        }[]
      }
      get_registrar_trails: {
        Args: { days_back?: number }
        Returns: {
          registrar_id: string
          trail: Json
        }[]
      }
      get_review_kpi_stats: { Args: never; Returns: Json }
      get_saved_jobs: { Args: never; Returns: Json }
      get_streak_detail: {
        Args: { p_month_start?: string; p_user_id: string }
        Returns: Json
      }
      get_subscription_tiers: { Args: never; Returns: Json }
      get_support_analytics: { Args: { time_filter?: string }; Returns: Json }
      get_symptom_analytics: { Args: never; Returns: Json }
      get_transactions_overview: { Args: never; Returns: Json }
      get_user_app_role: { Args: never; Returns: string }
      get_user_conversation_ids: {
        Args: never
        Returns: {
          conversation_id: string
        }[]
      }
      get_user_dashboard_metrics: {
        Args: { time_filter?: string }
        Returns: Json
      }
      get_user_kpi_stats: { Args: never; Returns: Json }
      get_whatsapp_stats: { Args: never; Returns: Json }
      global_search: { Args: { search_term: string }; Returns: Json }
      global_search_v2: {
        Args: { p_result_limit?: number; p_search_term: string }
        Returns: Json
      }
      has_4ol_permission: {
        Args: { p_key: string; p_user_id: string }
        Returns: boolean
      }
      increment_challenge_view_count: {
        Args: { challenge_id_param: string; user_id_param: string }
        Returns: undefined
      }
      increment_condition_view_count: {
        Args: { condition_id_param: string; user_id_param: string }
        Returns: undefined
      }
      increment_exercise_view_count: {
        Args: { exercise_id_param: string; user_id_param: string }
        Returns: undefined
      }
      increment_healthy_living_view_count: {
        Args: { healthy_living_id_param: string; user_id_param: string }
        Returns: undefined
      }
      increment_symptom_view_count: {
        Args: { symptom_id_param: string; user_id_param: string }
        Returns: undefined
      }
      insert_condition: {
        Args: {
          bodypartsids: string[]
          c_causes: Json[]
          c_payload: Json
          c_types: Json[]
          categoryids: string[]
        }
        Returns: string
      }
      insert_healthy_living_info: {
        Args: {
          p_attribution?: Json
          p_content_sections?: Json
          p_description?: string
          p_display_order?: number
          p_image_url?: string
          p_name: string
          p_parent_id?: string
          p_slug: string
        }
        Returns: {
          attribution: Json
          content: Json
          created_at: string | null
          description: string | null
          featured_from: string | null
          featured_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          metadata: Json
          name: string
          slug: string
          status: string
          updated_at: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "healthy_living_info"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      insert_healthy_living_info_tree: {
        Args: { p_node: Json; p_parent_id?: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_app_admin: { Args: never; Returns: boolean }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { p_user_id: string }; Returns: boolean }
      issue_canary: { Args: { p_context: string }; Returns: string }
      issue_device_sign_in_otp: {
        Args: { p_request_id: string; p_user_id: string }
        Returns: Json
      }
      join_fitness_challenge: {
        Args: { challenge_id_param: string; user_id_param: string }
        Returns: Json
      }
      join_fitness_outdoor_event: {
        Args: { event_id_param: string; user_id_param: string }
        Returns: Json
      }
      leave_fitness_outdoor_event: {
        Args: { event_id_param: string; user_id_param: string }
        Returns: Json
      }
      list_my_devices: {
        Args: never
        Returns: {
          app_version: string
          created_at: string
          device_name: string
          id: string
          is_current: boolean
          last_seen_at: string
          os_version: string
          platform: string
        }[]
      }
      log_admin_activity: {
        Args: {
          p_action_type: string
          p_admin_id: string
          p_description?: string
          p_ip_address?: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_severity?: string
          p_target_table: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_admin_read: {
        Args: { p_detail?: Json; p_route_key: string; p_row_count?: number }
        Returns: boolean
      }
      log_anatomy_interaction: {
        Args: { p_action?: string; p_body_part_id: string }
        Returns: boolean
      }
      log_device_attestation: {
        Args: {
          p_mechanism?: string
          p_platform: string
          p_token_present: boolean
        }
        Returns: undefined
      }
      log_manual_activity: {
        Args: {
          p_activity_type: string
          p_duration_minutes: number
          p_intensity?: string
          p_note?: string
          p_started_at: string
          p_user_id: string
        }
        Returns: Json
      }
      log_marketing_event: {
        Args: { p_campaign_id: string; p_event_type: string }
        Returns: undefined
      }
      moderate_content: {
        Args: {
          p_action: string
          p_action_notes?: string
          p_admin_id?: string
          p_flag_id: string
        }
        Returns: undefined
      }
      next_report_run_at: {
        Args: {
          p_after_at?: string
          p_cadence: string
          p_delivery_hour: number
          p_timezone: string
        }
        Returns: string
      }
      notify_fitness: {
        Args: {
          p_body: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      period_user_has_premium: { Args: { p_user_id: string }; Returns: boolean }
      purge_expired_report_runs: { Args: never; Returns: number }
      purge_or_anonymize_user: { Args: { p_user_id: string }; Returns: Json }
      raise_escrow_dispute: {
        Args: { p_enquiry_id: string; p_reason: string }
        Returns: Json
      }
      reconcile_notification_receipts: { Args: never; Returns: Json }
      record_app_review_prompt: {
        Args: { p_action: string }
        Returns: undefined
      }
      record_workout_completion: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      redeem_fitcoin_reward: {
        Args: { p_reward_id: string; p_user_id: string }
        Returns: Json
      }
      refresh_fitness_dashboard: { Args: never; Returns: undefined }
      register_facility_with_profile: {
        Args: {
          p_admin_id: string
          p_facility_data: Json
          p_first_name: string
          p_last_name: string
          p_owner_id: string
          p_phone_number: string
        }
        Returns: Json
      }
      register_push_token: {
        Args: {
          p_app_version?: string
          p_device_name?: string
          p_os_version?: string
          p_platform?: string
          p_token: string
        }
        Returns: undefined
      }
      register_symptom_complex: {
        Args: {
          body_part_ids: string[]
          category_ids: string[]
          s_causes: Json[]
          s_payload: Json
          s_types: Json[]
        }
        Returns: string
      }
      registrar_update_own_facility: {
        Args: { p_facility_id: string; p_payload: Json; p_user_id: string }
        Returns: undefined
      }
      replace_role_permissions: {
        Args: { p_permission_keys: string[]; p_role: string }
        Returns: undefined
      }
      report_bot_signal: {
        Args: { p_detail?: Json; p_kind: string }
        Returns: undefined
      }
      report_canary_hit: { Args: { p_token: string }; Returns: string }
      report_chat_content: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_report_detail?: string
          p_report_reason: string
        }
        Returns: Json
      }
      report_device_signal: {
        Args: { p_detail?: Json; p_signal_type: string }
        Returns: undefined
      }
      report_security_threat: {
        Args: {
          p_affected_users?: number
          p_description?: string
          p_metadata?: Json
          p_source_ip?: string
          p_source_module?: string
          p_threat_level: string
          p_threat_type: string
          p_title: string
        }
        Returns: string
      }
      request_device_sign_in: {
        Args: {
          p_device_name?: string
          p_expo_push_token?: string
          p_ip_address?: string
          p_location_label?: string
          p_os_version?: string
          p_platform?: string
        }
        Returns: Json
      }
      request_subscription_upgrade: {
        Args: { p_note?: string; p_pass_type: string; p_tier_key: string }
        Returns: string
      }
      request_user_id: { Args: never; Returns: string }
      resolve_device_sign_in: {
        Args: {
          p_approve: boolean
          p_request_id: string
          p_resolver_token?: string
        }
        Returns: Json
      }
      resolve_notification_segment: {
        Args: { p_segment_filter: Json }
        Returns: {
          user_id: string
        }[]
      }
      review_period_cycle_revision: {
        Args: {
          p_resolution: string
          p_reviewer: string
          p_revision_id: string
        }
        Returns: undefined
      }
      review_period_trivia_event: {
        Args: { p_event_id: string; p_reviewer: string }
        Returns: undefined
      }
      revoke_my_device: { Args: { p_device_id: string }; Returns: boolean }
      safe_to_timestamptz: { Args: { p_value: string }; Returns: string }
      save_my_cv: {
        Args: {
          p_file_name: string
          p_file_url: string
          p_mime_type?: string
          p_size_bytes?: number
        }
        Returns: Json
      }
      search_drug_names: { Args: { p_q: string }; Returns: Json }
      search_drugs: {
        Args: { lim?: number; q: string }
        Returns: {
          availability: string
          category: string
          dosage_form: string
          generic_name: string
          id: string
          name: string
          similarity: number
          strength: string
          strength_unit: string
        }[]
      }
      search_top_rated_items: {
        Args: {
          p_limit?: number
          p_page?: number
          p_search_term?: string
          p_table_name: string
        }
        Returns: {
          id: string
          image_url: string
          rating_average: number
          rating_count: number
          subtitle: string
          title: string
        }[]
      }
      send_due_notification_campaigns: { Args: never; Returns: undefined }
      send_notification_campaign: {
        Args: { p_admin_id?: string; p_campaign_id: string }
        Returns: Json
      }
      start_admin_session: {
        Args: {
          p_admin_id: string
          p_device_info?: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      submit_app_review: {
        Args: {
          p_app_version?: string
          p_comment_text?: string
          p_platform?: string
          p_prompt_source?: string
          p_rating: number
        }
        Returns: Json
      }
      submit_medication_enquiry: { Args: { p: Json }; Returns: Json }
      submit_period_trivia: {
        Args: {
          p_answers: Json
          p_campaign_code: string
          p_consent_version: string
          p_device_hash: string
          p_duration_seconds: number
          p_event_id: string
          p_full_name_ciphertext: string
          p_mobile_ciphertext: string
          p_mobile_hash: string
          p_score: number
          p_social_handle_ciphertext: string
          p_social_platform: string
          p_user_id: string
          p_utm_campaign: string
          p_utm_medium: string
          p_utm_source: string
        }
        Returns: string
      }
      sync_legacy_push_token: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      toggle_job_saved: { Args: { p_job_id: string }; Returns: Json }
      unregister_push_token: { Args: { p_token: string }; Returns: undefined }
      update_admin_task_status: {
        Args: {
          p_admin_id?: string
          p_board_position: number
          p_new_status: string
          p_task_id: string
        }
        Returns: undefined
      }
      update_condition: {
        Args: {
          bodypartsids: string[]
          c_causes: Json[]
          c_id: string
          c_payload: Json
          c_types: Json[]
          categoryids: string[]
        }
        Returns: string
      }
      update_healthy_living_info: {
        Args: {
          p_attribution?: Json
          p_content_sections?: Json
          p_description?: string
          p_display_order?: number
          p_id: string
          p_image_url?: string
          p_name: string
          p_parent_id?: string
          p_slug: string
        }
        Returns: {
          attribution: Json
          content: Json
          created_at: string | null
          description: string | null
          featured_from: string | null
          featured_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          metadata: Json
          name: string
          slug: string
          status: string
          updated_at: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "healthy_living_info"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_marketing_statuses: { Args: never; Returns: undefined }
      update_symptom_complex: {
        Args: {
          body_part_ids: string[]
          category_ids: string[]
          s_causes: Json[]
          s_id: string
          s_payload: Json
          s_types: Json[]
        }
        Returns: string
      }
      upsert_job_alert: { Args: { p_prefs: Json }; Returns: Json }
      upsert_open_to_offers: { Args: { p_open: boolean }; Returns: Json }
      user_can_manage_conversation: {
        Args: { target_conversation_id: string }
        Returns: boolean
      }
      user_has_push_token: { Args: { p_user_id: string }; Returns: boolean }
      verify_cron_shared_secret: {
        Args: { p_secret: string }
        Returns: boolean
      }
      verify_device_sign_in_otp: {
        Args: { p_otp: string; p_request_id: string }
        Returns: Json
      }
      withdraw_application: {
        Args: { p_application_id: string }
        Returns: Json
      }
    }
    Enums: {
      adherence_status: "taken" | "skipped" | "missed"
      admin_action_type:
        | "create"
        | "update"
        | "delete"
        | "verify"
        | "approve"
        | "reject"
        | "suspend"
        | "ban"
        | "export"
        | "login"
        | "logout"
        | "broadcast"
        | "settings_change"
      admin_role: "super_admin" | "admin" | "moderator" | "support" | "viewer"
      broadcast_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "sent"
        | "partial"
        | "failed"
      broadcast_type:
        | "all_users"
        | "segment"
        | "region"
        | "facility_type"
        | "premium_only"
        | "active_users"
      campaign_status:
        | "draft"
        | "scheduled"
        | "live"
        | "paused"
        | "ended"
        | "pending_review"
      category_type: "condition" | "symptom" | "healthy_living"
      challenge_status:
        | "draft"
        | "upcoming"
        | "active"
        | "completed"
        | "cancelled"
      delivery_status:
        | "pending"
        | "processing"
        | "shipped"
        | "in_transit"
        | "delivered"
        | "failed"
        | "returned"
      escrow_status:
        | "pending"
        | "held"
        | "released"
        | "refunded"
        | "disputed"
        | "resolved"
      facility_status_enum: "pending" | "active" | "rejected" | "inactive"
      facility_type_enum:
        | "hospitals_&_clinics"
        | "herbal_centers"
        | "diagnostic_labs"
        | "pharmacies"
        | "dental_clinics"
        | "homes"
        | "eye_clinics"
        | "osteopathy_centers"
        | "physiotherapy_centers"
        | "prosthetics_centers"
        | "psychiatric_centers"
        | "ibps"
        | "health_schools"
      ibp_status: "pending" | "approved" | "suspended" | "rejected"
      ledger_category: "fitness" | "medication" | "facility" | "general"
      marketing_status_enum:
        | "draft"
        | "scheduled"
        | "live"
        | "paused"
        | "ended"
        | "pending_review"
        | "rejected"
      marketing_type_enum: "ads" | "events" | "news" | "health" | "other"
      moderation_status:
        | "pending_review"
        | "approved"
        | "rejected"
        | "flagged"
        | "escalated"
        | "auto_moderated"
      offering_type: "subscription" | "walk-in" | "package" | "onetime_fee"
      period_ai_job_status:
        | "queued"
        | "running"
        | "review"
        | "complete"
        | "failed"
        | "cancelled"
      period_lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "converted"
        | "disqualified"
        | "do_not_contact"
      period_source_menu: "healthy_living" | "conditions" | "symptoms"
      period_trivia_event_status:
        | "draft"
        | "ready"
        | "live"
        | "ended"
        | "cancelled"
      region_enum:
        | "ahafo"
        | "ashanti"
        | "bono"
        | "bono east"
        | "central"
        | "eastern"
        | "greater accra"
        | "north east"
        | "northern"
        | "oti"
        | "savannah"
        | "upper east"
        | "upper west"
        | "volta"
        | "western"
        | "western north"
      review_status: "approved" | "rejected" | "pending"
      subscription_privilege:
        | "business_analytics"
        | "performance_analytics"
        | "popup_notification"
        | "top_rated_placement"
        | "featured_placement"
        | "ad_discount_10"
        | "ad_discount_25"
        | "ad_discount_30"
        | "ad_discount_40"
        | "ad_discount_50"
        | "ad_flyer_discount_10"
        | "advanced_analytics"
        | "priority_support"
      threat_level: "critical" | "high" | "medium" | "low" | "info"
      threat_status:
        | "open"
        | "mitigated"
        | "monitoring"
        | "review"
        | "resolved"
        | "auto_resolved"
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
      adherence_status: ["taken", "skipped", "missed"],
      admin_action_type: [
        "create",
        "update",
        "delete",
        "verify",
        "approve",
        "reject",
        "suspend",
        "ban",
        "export",
        "login",
        "logout",
        "broadcast",
        "settings_change",
      ],
      admin_role: ["super_admin", "admin", "moderator", "support", "viewer"],
      broadcast_status: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "partial",
        "failed",
      ],
      broadcast_type: [
        "all_users",
        "segment",
        "region",
        "facility_type",
        "premium_only",
        "active_users",
      ],
      campaign_status: [
        "draft",
        "scheduled",
        "live",
        "paused",
        "ended",
        "pending_review",
      ],
      category_type: ["condition", "symptom", "healthy_living"],
      challenge_status: [
        "draft",
        "upcoming",
        "active",
        "completed",
        "cancelled",
      ],
      delivery_status: [
        "pending",
        "processing",
        "shipped",
        "in_transit",
        "delivered",
        "failed",
        "returned",
      ],
      escrow_status: [
        "pending",
        "held",
        "released",
        "refunded",
        "disputed",
        "resolved",
      ],
      facility_status_enum: ["pending", "active", "rejected", "inactive"],
      facility_type_enum: [
        "hospitals_&_clinics",
        "herbal_centers",
        "diagnostic_labs",
        "pharmacies",
        "dental_clinics",
        "homes",
        "eye_clinics",
        "osteopathy_centers",
        "physiotherapy_centers",
        "prosthetics_centers",
        "psychiatric_centers",
        "ibps",
        "health_schools",
      ],
      ibp_status: ["pending", "approved", "suspended", "rejected"],
      ledger_category: ["fitness", "medication", "facility", "general"],
      marketing_status_enum: [
        "draft",
        "scheduled",
        "live",
        "paused",
        "ended",
        "pending_review",
        "rejected",
      ],
      marketing_type_enum: ["ads", "events", "news", "health", "other"],
      moderation_status: [
        "pending_review",
        "approved",
        "rejected",
        "flagged",
        "escalated",
        "auto_moderated",
      ],
      offering_type: ["subscription", "walk-in", "package", "onetime_fee"],
      period_ai_job_status: [
        "queued",
        "running",
        "review",
        "complete",
        "failed",
        "cancelled",
      ],
      period_lead_status: [
        "new",
        "contacted",
        "qualified",
        "converted",
        "disqualified",
        "do_not_contact",
      ],
      period_source_menu: ["healthy_living", "conditions", "symptoms"],
      period_trivia_event_status: [
        "draft",
        "ready",
        "live",
        "ended",
        "cancelled",
      ],
      region_enum: [
        "ahafo",
        "ashanti",
        "bono",
        "bono east",
        "central",
        "eastern",
        "greater accra",
        "north east",
        "northern",
        "oti",
        "savannah",
        "upper east",
        "upper west",
        "volta",
        "western",
        "western north",
      ],
      review_status: ["approved", "rejected", "pending"],
      subscription_privilege: [
        "business_analytics",
        "performance_analytics",
        "popup_notification",
        "top_rated_placement",
        "featured_placement",
        "ad_discount_10",
        "ad_discount_25",
        "ad_discount_30",
        "ad_discount_40",
        "ad_discount_50",
        "ad_flyer_discount_10",
        "advanced_analytics",
        "priority_support",
      ],
      threat_level: ["critical", "high", "medium", "low", "info"],
      threat_status: [
        "open",
        "mitigated",
        "monitoring",
        "review",
        "resolved",
        "auto_resolved",
      ],
    },
  },
} as const
