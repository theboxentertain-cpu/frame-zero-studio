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
      approvals: {
        Row: {
          approved_at: string
          gate: Database["public"]["Enums"]["fz_gate"]
          id: string
          note: string
          owner_id: string
          project_id: string
        }
        Insert: {
          approved_at?: string
          gate: Database["public"]["Enums"]["fz_gate"]
          id?: string
          note?: string
          owner_id: string
          project_id: string
        }
        Update: {
          approved_at?: string
          gate?: Database["public"]["Enums"]["fz_gate"]
          id?: string
          note?: string
          owner_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          archived_at: string | null
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          owner_id: string
          project_id: string
          purpose: string
          rights_note: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          owner_id?: string
          project_id: string
          purpose?: string
          rights_note?: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          owner_id?: string
          project_id?: string
          purpose?: string
          rights_note?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_revisions: {
        Row: {
          approved_decisions: string
          change_note: string | null
          created_at: string
          id: string
          notes: string
          owner_id: string
          project_id: string
          proposed_interpretation: string
          revision_no: number
          source_facts: string
        }
        Insert: {
          approved_decisions: string
          change_note?: string | null
          created_at?: string
          id?: string
          notes: string
          owner_id?: string
          project_id: string
          proposed_interpretation: string
          revision_no: number
          source_facts: string
        }
        Update: {
          approved_decisions?: string
          change_note?: string | null
          created_at?: string
          id?: string
          notes?: string
          owner_id?: string
          project_id?: string
          proposed_interpretation?: string
          revision_no?: number
          source_facts?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          approved_decisions: string
          created_at: string
          current_revision: number
          id: string
          notes: string
          owner_id: string
          project_id: string
          proposed_interpretation: string
          source_facts: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_decisions?: string
          created_at?: string
          current_revision?: number
          id?: string
          notes?: string
          owner_id?: string
          project_id: string
          proposed_interpretation?: string
          source_facts?: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_decisions?: string
          created_at?: string
          current_revision?: number
          id?: string
          notes?: string
          owner_id?: string
          project_id?: string
          proposed_interpretation?: string
          source_facts?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "briefs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          currency: string
          description: string
          id: string
          notes: string
          owner_id: string
          project_id: string
          quantity: number
          unit_cost: number
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          category?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          notes?: string
          owner_id?: string
          project_id: string
          quantity?: number
          unit_cost?: number
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          notes?: string
          owner_id?: string
          project_id?: string
          quantity?: number
          unit_cost?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          age_range: string
          appearance: string
          archived_at: string | null
          created_at: string
          id: string
          identity: string
          likeness_permission: string
          locked: boolean
          locked_at: string | null
          name: string
          owner_id: string
          project_id: string
          regional_background: string
          rights_notes: string
          story_role: string
          updated_at: string
          version: number
        }
        Insert: {
          age_range?: string
          appearance?: string
          archived_at?: string | null
          created_at?: string
          id?: string
          identity?: string
          likeness_permission?: string
          locked?: boolean
          locked_at?: string | null
          name?: string
          owner_id?: string
          project_id: string
          regional_background?: string
          rights_notes?: string
          story_role?: string
          updated_at?: string
          version?: number
        }
        Update: {
          age_range?: string
          appearance?: string
          archived_at?: string | null
          created_at?: string
          id?: string
          identity?: string
          likeness_permission?: string
          locked?: boolean
          locked_at?: string | null
          name?: string
          owner_id?: string
          project_id?: string
          regional_background?: string
          rights_notes?: string
          story_role?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "characters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      continuity_notes: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          id: string
          note: string
          owner_id: string
          project_id: string
          scene_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          category?: string
          created_at?: string
          id?: string
          note?: string
          owner_id?: string
          project_id: string
          scene_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          id?: string
          note?: string
          owner_id?: string
          project_id?: string
          scene_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "continuity_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continuity_notes_scene_id_project_id_fkey"
            columns: ["scene_id", "project_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      creative_references: {
        Row: {
          admired_attributes: string
          archived_at: string | null
          converted: boolean
          created_at: string
          id: string
          kind: string
          notes: string
          original_constraint: string
          owner_id: string
          project_id: string
          source_title: string
          updated_at: string
          version: number
        }
        Insert: {
          admired_attributes?: string
          archived_at?: string | null
          converted?: boolean
          created_at?: string
          id?: string
          kind?: string
          notes?: string
          original_constraint?: string
          owner_id?: string
          project_id: string
          source_title?: string
          updated_at?: string
          version?: number
        }
        Update: {
          admired_attributes?: string
          archived_at?: string | null
          converted?: boolean
          created_at?: string
          id?: string
          kind?: string
          notes?: string
          original_constraint?: string
          owner_id?: string
          project_id?: string
          source_title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "creative_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      dialogue_lines: {
        Row: {
          archived_at: string | null
          character_id: string | null
          code_switching: string
          created_at: string
          id: string
          line_text: string
          overlap_notes: string
          owner_id: string
          pause_notes: string
          project_id: string
          scene_id: string
          sort_order: number
          source_notes: string
          tactic: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          character_id?: string | null
          code_switching?: string
          created_at?: string
          id?: string
          line_text?: string
          overlap_notes?: string
          owner_id?: string
          pause_notes?: string
          project_id: string
          scene_id: string
          sort_order?: number
          source_notes?: string
          tactic?: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          character_id?: string | null
          code_switching?: string
          created_at?: string
          id?: string
          line_text?: string
          overlap_notes?: string
          owner_id?: string
          pause_notes?: string
          project_id?: string
          scene_id?: string
          sort_order?: number
          source_notes?: string
          tactic?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "dialogue_lines_character_id_project_id_fkey"
            columns: ["character_id", "project_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "dialogue_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dialogue_lines_scene_id_project_id_fkey"
            columns: ["scene_id", "project_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      history: {
        Row: {
          action: string
          created_at: string
          id: number
          owner_id: string
          project_id: string
          record_id: string
          record_version: number | null
          snapshot: Json | null
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          owner_id: string
          project_id: string
          record_id: string
          record_version?: number | null
          snapshot?: Json | null
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          owner_id?: string
          project_id?: string
          record_id?: string
          record_version?: number | null
          snapshot?: Json | null
          table_name?: string
        }
        Relationships: []
      }
      interpretations: {
        Row: {
          archived_at: string | null
          camera_logic: string
          created_at: string
          direction: string
          id: string
          notes: string
          objective: string
          obstacle: string
          owner_id: string
          project_id: string
          selected: boolean
          stakes: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          camera_logic?: string
          created_at?: string
          direction: string
          id?: string
          notes?: string
          objective?: string
          obstacle?: string
          owner_id?: string
          project_id: string
          selected?: boolean
          stakes?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          camera_logic?: string
          created_at?: string
          direction?: string
          id?: string
          notes?: string
          objective?: string
          obstacle?: string
          owner_id?: string
          project_id?: string
          selected?: boolean
          stakes?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "interpretations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          architecture: string
          archived_at: string | null
          created_at: string
          district: string
          evidence_notes: string
          governorate: string
          id: string
          interiors: string
          locked: boolean
          locked_at: string | null
          name: string
          owner_id: string
          period_year: string
          place: string
          project_id: string
          props: string
          sound_profile: string
          updated_at: string
          version: number
        }
        Insert: {
          architecture?: string
          archived_at?: string | null
          created_at?: string
          district?: string
          evidence_notes?: string
          governorate?: string
          id?: string
          interiors?: string
          locked?: boolean
          locked_at?: string | null
          name?: string
          owner_id?: string
          period_year?: string
          place?: string
          project_id: string
          props?: string
          sound_profile?: string
          updated_at?: string
          version?: number
        }
        Update: {
          architecture?: string
          archived_at?: string | null
          created_at?: string
          district?: string
          evidence_notes?: string
          governorate?: string
          id?: string
          interiors?: string
          locked?: boolean
          locked_at?: string | null
          name?: string
          owner_id?: string
          period_year?: string
          place?: string
          project_id?: string
          props?: string
          sound_profile?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_plans: {
        Row: {
          archived_at: string | null
          beats: string
          character_id: string
          created_at: string
          id: string
          listening_reaction: string
          locked: boolean
          locked_at: string | null
          objective: string
          obstacle: string
          owner_id: string
          partner_cue: string
          physical_action: string
          playable_tactic: string
          project_id: string
          scene_id: string
          source_scene_version: number
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          beats?: string
          character_id: string
          created_at?: string
          id?: string
          listening_reaction?: string
          locked?: boolean
          locked_at?: string | null
          objective?: string
          obstacle?: string
          owner_id?: string
          partner_cue?: string
          physical_action?: string
          playable_tactic?: string
          project_id: string
          scene_id: string
          source_scene_version?: number
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          beats?: string
          character_id?: string
          created_at?: string
          id?: string
          listening_reaction?: string
          locked?: boolean
          locked_at?: string | null
          objective?: string
          obstacle?: string
          owner_id?: string
          partner_cue?: string
          physical_action?: string
          playable_tactic?: string
          project_id?: string
          scene_id?: string
          source_scene_version?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_plans_character_id_project_id_fkey"
            columns: ["character_id", "project_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "performance_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_plans_scene_id_project_id_fkey"
            columns: ["scene_id", "project_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          locale: string
          mode: Database["public"]["Enums"]["fz_mode"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          mode?: Database["public"]["Enums"]["fz_mode"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          mode?: Database["public"]["Enums"]["fz_mode"]
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          duration_target: Database["public"]["Enums"]["fz_duration"]
          id: string
          logline_ar: string | null
          logline_en: string | null
          owner_id: string
          region: string | null
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          duration_target?: Database["public"]["Enums"]["fz_duration"]
          id?: string
          logline_ar?: string | null
          logline_en?: string | null
          owner_id?: string
          region?: string | null
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          duration_target?: Database["public"]["Enums"]["fz_duration"]
          id?: string
          logline_ar?: string | null
          logline_en?: string | null
          owner_id?: string
          region?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      scenes: {
        Row: {
          act: string
          archived_at: string | null
          created_at: string
          dramatic_purpose: string
          id: string
          location_id: string | null
          owner_id: string
          project_id: string
          scene_number: number
          status: string
          synopsis: string
          time_of_day: string
          title: string
          turning_point: string
          updated_at: string
          version: number
        }
        Insert: {
          act?: string
          archived_at?: string | null
          created_at?: string
          dramatic_purpose?: string
          id?: string
          location_id?: string | null
          owner_id?: string
          project_id: string
          scene_number?: number
          status?: string
          synopsis?: string
          time_of_day?: string
          title?: string
          turning_point?: string
          updated_at?: string
          version?: number
        }
        Update: {
          act?: string
          archived_at?: string | null
          created_at?: string
          dramatic_purpose?: string
          id?: string
          location_id?: string | null
          owner_id?: string
          project_id?: string
          scene_number?: number
          status?: string
          synopsis?: string
          time_of_day?: string
          title?: string
          turning_point?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenes_location_id_project_id_fkey"
            columns: ["location_id", "project_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shots: {
        Row: {
          archived_at: string | null
          blocking: string
          continuity_constraints: string
          created_at: string
          drama_function: string
          duration_sec: number | null
          editing_reason: string
          framing: string
          id: string
          lens_rationale: string
          movement_end: string
          movement_trigger: string
          owner_id: string
          project_id: string
          retake_notes: string
          scene_id: string
          shot_number: string
          sort_order: number
          source_scene_version: number
          subject: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          blocking?: string
          continuity_constraints?: string
          created_at?: string
          drama_function?: string
          duration_sec?: number | null
          editing_reason?: string
          framing?: string
          id?: string
          lens_rationale?: string
          movement_end?: string
          movement_trigger?: string
          owner_id?: string
          project_id: string
          retake_notes?: string
          scene_id: string
          shot_number?: string
          sort_order?: number
          source_scene_version?: number
          subject?: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          blocking?: string
          continuity_constraints?: string
          created_at?: string
          drama_function?: string
          duration_sec?: number | null
          editing_reason?: string
          framing?: string
          id?: string
          lens_rationale?: string
          movement_end?: string
          movement_trigger?: string
          owner_id?: string
          project_id?: string
          retake_notes?: string
          scene_id?: string
          shot_number?: string
          sort_order?: number
          source_scene_version?: number
          subject?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "shots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shots_scene_id_project_id_fkey"
            columns: ["scene_id", "project_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      treatments: {
        Row: {
          acting_intention: string
          archived_at: string | null
          camera_intention: string
          continuity_intention: string
          created_at: string
          id: string
          level: string
          location_intention: string
          owner_id: string
          parent_id: string | null
          project_id: string
          scene_id: string | null
          sort_order: number
          sound_intention: string
          source_brief_revision: number
          status: string
          summary: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          acting_intention?: string
          archived_at?: string | null
          camera_intention?: string
          continuity_intention?: string
          created_at?: string
          id?: string
          level?: string
          location_intention?: string
          owner_id?: string
          parent_id?: string | null
          project_id: string
          scene_id?: string | null
          sort_order?: number
          sound_intention?: string
          source_brief_revision?: number
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Update: {
          acting_intention?: string
          archived_at?: string | null
          camera_intention?: string
          continuity_intention?: string
          created_at?: string
          id?: string
          level?: string
          location_intention?: string
          owner_id?: string
          parent_id?: string | null
          project_id?: string
          scene_id?: string | null
          sort_order?: number
          sound_intention?: string
          source_brief_revision?: number
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "treatments_parent_id_project_id_fkey"
            columns: ["parent_id", "project_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "treatments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_scene_id_project_id_fkey"
            columns: ["scene_id", "project_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      voice_profiles: {
        Row: {
          archived_at: string | null
          character_id: string
          code_switching: string
          created_at: string
          dialect: string
          id: string
          owner_id: string
          project_id: string
          pronunciation_notes: string
          source_notes: string
          speech_register: string
          updated_at: string
          version: number
          voice_permission: string
        }
        Insert: {
          archived_at?: string | null
          character_id: string
          code_switching?: string
          created_at?: string
          dialect?: string
          id?: string
          owner_id?: string
          project_id: string
          pronunciation_notes?: string
          source_notes?: string
          speech_register?: string
          updated_at?: string
          version?: number
          voice_permission?: string
        }
        Update: {
          archived_at?: string | null
          character_id?: string
          code_switching?: string
          created_at?: string
          dialect?: string
          id?: string
          owner_id?: string
          project_id?: string
          pronunciation_notes?: string
          source_notes?: string
          speech_register?: string
          updated_at?: string
          version?: number
          voice_permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_character_id_project_id_fkey"
            columns: ["character_id", "project_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "voice_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fz_approve_gate: {
        Args: {
          _gate: Database["public"]["Enums"]["fz_gate"]
          _note?: string
          _project_id: string
        }
        Returns: string
      }
      fz_duplicate_project: { Args: { _project_id: string }; Returns: string }
      fz_gate_status: {
        Args: { _project_id: string }
        Returns: {
          approved: boolean
          approved_at: string
          gate: Database["public"]["Enums"]["fz_gate"]
          missing: string[]
          ready: boolean
          stale: boolean
        }[]
      }
      fz_owns_project: { Args: { _project_id: string }; Returns: boolean }
      fz_revoke_gate: {
        Args: {
          _gate: Database["public"]["Enums"]["fz_gate"]
          _project_id: string
        }
        Returns: undefined
      }
      fz_save_brief_revision: {
        Args: { _change_note?: string; _project_id: string }
        Returns: number
      }
    }
    Enums: {
      fz_duration: "30s" | "3min" | "15min" | "60min"
      fz_gate:
        | "treatment"
        | "world"
        | "shot_list"
        | "film_stills"
        | "motion"
        | "final_cut"
      fz_mode: "storyteller" | "filmmaker" | "director"
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
      fz_duration: ["30s", "3min", "15min", "60min"],
      fz_gate: [
        "treatment",
        "world",
        "shot_list",
        "film_stills",
        "motion",
        "final_cut",
      ],
      fz_mode: ["storyteller", "filmmaker", "director"],
    },
  },
} as const
