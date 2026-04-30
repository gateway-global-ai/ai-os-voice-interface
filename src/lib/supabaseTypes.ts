/**
 * TypeScript types for the Supabase CANI Sovereign Lane database schema.
 * Auto-generated shape — update when running `supabase gen types typescript`.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string | null;
          display_name: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          company: string | null;
          role: string | null;
          username: string | null;
          avatar_url: string | null;
          loyalty_declaration: string | null;
          interface_mode: 'voice' | 'chat' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      shell_preferences: {
        Row: {
          id: string;
          user_id: string;
          surface_mode: string | null;
          voice_route_id: string | null;
          theme_tokens: Record<string, unknown> | null;
          canvas_chrome: Record<string, unknown> | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shell_preferences']['Row'], 'id' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['shell_preferences']['Insert']>;
      };
      shell_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          session_token: string;
          entry_mode: string | null;
          surface_mode: string | null;
          created_at: string;
          last_active_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shell_sessions']['Row'], 'id' | 'created_at' | 'last_active_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['shell_sessions']['Insert']>;
      };
      intents: {
        Row: {
          intent_id: string;
          user_id: string | null;
          primary_intent: string;
          desired_outcome: string | null;
          leverage_available: string | null;
          leverage_being_used: string | null;
          leverage_rating: number | null;
          proven_path_identified: boolean | null;
          proven_path_used: string | null;
          proven_path_rating: number | null;
          clear_purpose: boolean | null;
          purpose_rating: number | null;
          clear_plan: boolean | null;
          plan_rating: number | null;
          clear_outcome: boolean | null;
          outcome_rating: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['intents']['Row'], 'intent_id' | 'created_at'> & { intent_id?: string };
        Update: Partial<Database['public']['Tables']['intents']['Insert']>;
      };
      skills: {
        Row: {
          skill_id: string;
          name: string;
          description: string | null;
          category: string | null;
          enabled: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['skills']['Row'], 'skill_id' | 'created_at'> & { skill_id?: string };
        Update: Partial<Database['public']['Tables']['skills']['Insert']>;
      };
      intent_skills: {
        Row: { intent_id: string; skill_id: string };
        Insert: Database['public']['Tables']['intent_skills']['Row'];
        Update: Partial<Database['public']['Tables']['intent_skills']['Row']>;
      };
      intent_tools: {
        Row: { intent_id: string; tool_id: string };
        Insert: Database['public']['Tables']['intent_tools']['Row'];
        Update: Partial<Database['public']['Tables']['intent_tools']['Row']>;
      };
      actions: {
        Row: {
          action_id: string;
          skill_id: string | null;
          intent_id: string | null;
          type: string | null;
          parameters: Record<string, unknown> | null;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['actions']['Row'], 'action_id' | 'timestamp'> & { action_id?: string };
        Update: Partial<Database['public']['Tables']['actions']['Insert']>;
      };
      outcomes: {
        Row: {
          outcome_id: string;
          action_id: string | null;
          description: string | null;
          success_flag: boolean | null;
          score: number | null;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['outcomes']['Row'], 'outcome_id' | 'timestamp'> & { outcome_id?: string };
        Update: Partial<Database['public']['Tables']['outcomes']['Insert']>;
      };
      grounding_context: {
        Row: {
          context_id: string;
          intent_id: string | null;
          user_id: string | null;
          key: string;
          value: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['grounding_context']['Row'], 'context_id' | 'created_at'> & { context_id?: string };
        Update: Partial<Database['public']['Tables']['grounding_context']['Insert']>;
      };
      user_plans: {
        Row: {
          plan_id: string;
          user_id: string;
          intent_focus: string | null;
          offer_help: boolean | null;
          grounding_needed: string | null;
          value_questions: string | null;
          visual_aids_needed: boolean | null;
          tools_help_needed: boolean | null;
          available_tools: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_plans']['Row'], 'plan_id' | 'created_at' | 'updated_at'> & { plan_id?: string };
        Update: Partial<Database['public']['Tables']['user_plans']['Insert']>;
      };
      tools: {
        Row: {
          tool_id: string;
          name: string;
          category: string | null;
          enabled: boolean;
          sort_order: number;
          description: string | null;
        };
        Insert: Database['public']['Tables']['tools']['Row'];
        Update: Partial<Database['public']['Tables']['tools']['Row']>;
      };
      shell_menus: {
        Row: {
          menu_id: string;
          menu_zone: string | null;
          permission_class: string | null;
          parent_menu_id: string | null;
          launch_mode: string | null;
          desktop_sub_path: string | null;
          data_source_ref: string | null;
          launched_from_action_id: string | null;
        };
        Insert: Database['public']['Tables']['shell_menus']['Row'];
        Update: Partial<Database['public']['Tables']['shell_menus']['Row']>;
      };
      shell_menu_items: {
        Row: {
          item_id: string;
          menu_id: string;
          level: number;
          action_id: string;
          label: string;
          icon: string | null;
          auth_required: boolean;
          sort_order: number;
          metadata: Record<string, unknown> | null;
        };
        Insert: Omit<Database['public']['Tables']['shell_menu_items']['Row'], 'item_id'> & { item_id?: string };
        Update: Partial<Database['public']['Tables']['shell_menu_items']['Insert']>;
      };
      ui_levels: {
        Row: {
          level_id: number;
          elements: Record<string, unknown>;
        };
        Insert: Database['public']['Tables']['ui_levels']['Row'];
        Update: Partial<Database['public']['Tables']['ui_levels']['Row']>;
      };
      knowledge_base: {
        Row: {
          entry_id: string;
          trigger: string | null;
          content: string;
          category: string | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['knowledge_base']['Row'], 'entry_id' | 'created_at' | 'updated_at'> & { entry_id?: string };
        Update: Partial<Database['public']['Tables']['knowledge_base']['Insert']>;
      };
      podcast_episodes: {
        Row: {
          episode_id: string;
          title: string;
          description: string | null;
          audio_url: string | null;
          transcript_url: string | null;
          cover_url: string | null;
          published_at: string | null;
          duration_seconds: number | null;
          slug: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['podcast_episodes']['Row'], 'episode_id' | 'created_at'> & { episode_id?: string };
        Update: Partial<Database['public']['Tables']['podcast_episodes']['Insert']>;
      };
      referral_codes: {
        Row: {
          code: string;
          description: string | null;
          active: boolean;
          uses_count: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['referral_codes']['Row'], 'uses_count' | 'created_at'> & { uses_count?: number };
        Update: Partial<Database['public']['Tables']['referral_codes']['Insert']>;
      };
      session_knowledge_inputs: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          declared_name: string;
          source_class: string;
          content_summary: string | null;
          content_type: string;
          raw_text: string;
          declared_at: string;
        };
        Insert: Omit<Database['public']['Tables']['session_knowledge_inputs']['Row'], 'id' | 'declared_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['session_knowledge_inputs']['Insert']>;
      };
      university_programs: {
        Row: {
          program_slug: string;
          title: string;
          description: string;
          access_model: 'free' | 'subscription' | 'manual';
          stripe_price_lookup_key: string | null;
          cursor_plugin_path: string | null;
          docs_urls: string[];
          status: 'draft' | 'review' | 'published' | 'blocked' | 'unverified';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['university_programs']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['university_programs']['Insert']>;
      };
      university_enrollments: {
        Row: {
          enrollment_id: string;
          owner_auth_id: string | null;
          program_slug: string;
          access_status: 'pending' | 'active' | 'past_due' | 'canceled' | 'blocked' | 'unverified';
          access_source: 'stripe' | 'manual' | 'admin' | 'unverified';
          stripe_subscription_id: string | null;
          evidence: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['university_enrollments']['Row'], 'enrollment_id' | 'created_at' | 'updated_at'> & { enrollment_id?: string };
        Update: Partial<Database['public']['Tables']['university_enrollments']['Insert']>;
      };
      stripe_customers: {
        Row: {
          owner_auth_id: string;
          stripe_customer_id: string;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stripe_customers']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['stripe_customers']['Insert']>;
      };
      stripe_subscriptions: {
        Row: {
          stripe_subscription_id: string;
          owner_auth_id: string;
          program_slug: string;
          stripe_customer_id: string;
          stripe_price_id: string | null;
          status: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'paused';
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stripe_subscriptions']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['stripe_subscriptions']['Insert']>;
      };
      stripe_billing_events: {
        Row: {
          stripe_event_id: string;
          event_type: string;
          processed_at: string;
          payload_summary: Record<string, unknown>;
        };
        Insert: Omit<Database['public']['Tables']['stripe_billing_events']['Row'], 'processed_at'>;
        Update: Partial<Database['public']['Tables']['stripe_billing_events']['Insert']>;
      };
      cursor_plugin_packages: {
        Row: {
          package_id: string;
          program_slug: string;
          title: string;
          package_path: string;
          install_target: string;
          docs_urls: string[];
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          no_mock_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cursor_plugin_packages']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cursor_plugin_packages']['Insert']>;
      };
      external_skill_sources: {
        Row: {
          source_id: string;
          source_name: string;
          source_url: string;
          repository_url: string | null;
          skill_manifest_url: string | null;
          license: string | null;
          description: string;
          install_command: string | null;
          manual_install: Record<string, unknown>;
          source_metadata: Record<string, unknown>;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          no_mock_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['external_skill_sources']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['external_skill_sources']['Insert']>;
      };
      external_skill_categories: {
        Row: {
          category_id: string;
          source_id: string;
          priority: number;
          phase: number;
          category_name: string;
          impact: string;
          prefix: string;
          expected_rule_count: number;
          summary: string;
          deployment_guidance: string;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['external_skill_categories']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['external_skill_categories']['Insert']>;
      };
      external_skill_rules: {
        Row: {
          rule_id: string;
          source_id: string;
          category_id: string;
          rule_slug: string;
          title: string;
          summary: string;
          rule_path: string;
          source_url: string;
          raw_url: string;
          source_sha: string | null;
          source_size_bytes: number | null;
          priority: number;
          phase: number;
          deployment_status: 'available' | 'queued' | 'installed' | 'blocked' | 'unverified';
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          dependency_hints: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['external_skill_rules']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['external_skill_rules']['Insert']>;
      };
      skill_deployment_phases: {
        Row: {
          phase_id: string;
          source_id: string;
          phase: number;
          title: string;
          category_ids: string[];
          rule_count: number;
          purpose: string;
          prerequisite_phase: number | null;
          deployment_status: 'available' | 'queued' | 'installed' | 'blocked' | 'unverified';
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['skill_deployment_phases']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['skill_deployment_phases']['Insert']>;
      };
      cursor_skill_registry: {
        Row: {
          cursor_skill_id: string;
          source_id: string | null;
          source_category_id: string | null;
          name: string;
          description: string;
          install_mode: 'reference' | 'copy' | 'clone' | 'plugin' | 'command';
          install_target: string;
          install_command: string | null;
          required_dependencies: string[];
          deployment_phase: number | null;
          deployment_status: 'available' | 'queued' | 'installed' | 'blocked' | 'unverified';
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          no_mock_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cursor_skill_registry']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cursor_skill_registry']['Insert']>;
      };
      cursor_action_registry: {
        Row: {
          cursor_action_id: string;
          source_id: string | null;
          cursor_skill_id: string | null;
          action_name: string;
          action_type:
            | 'install_skill'
            | 'install_phase'
            | 'run_review'
            | 'check_dependencies'
            | 'open_resource'
            | 'verify_install'
            | 'skills_init'
            | 'skills_list'
            | 'skills_push'
            | 'skills_validate'
            | 'skills_render'
            | 'skills_import'
            | 'skills_sync'
            | 'skillshub_install'
            | 'skillshub_tap_add'
            | 'skillshub_install_skill'
            | 'skillshub_link'
            | 'skillshub_agents'
            | 'skillshub_info'
            | 'skillshub_doctor'
            | 'skillshub_external_scan'
            | 'skillshub_search'
            | 'skillshub_update';
          shell_action_id: string | null;
          command_template: string;
          required_inputs: string[];
          required_dependencies: string[];
          output_contract: string;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cursor_action_registry']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cursor_action_registry']['Insert']>;
      };
      native_skill_protocols: {
        Row: {
          protocol_id: string;
          tool_name: string;
          crate_name: string;
          crate_version: string;
          crate_url: string;
          docs_url: string;
          repository_url: string | null;
          config_path: string;
          install_command: string;
          init_command: string;
          list_command: string;
          push_command: string;
          validate_command: string;
          render_command: string;
          supported_tools: Record<string, unknown>[];
          command_catalog: Record<string, unknown>[];
          dependency_catalog: Record<string, unknown>[];
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          no_mock_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['native_skill_protocols']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['native_skill_protocols']['Insert']>;
      };
      native_skill_deployment_evidence: {
        Row: {
          evidence_id: string;
          protocol_id: string;
          cursor_skill_id: string | null;
          action_id: string | null;
          owner_auth_id: string | null;
          target_project_path: string | null;
          command: string;
          exit_code: number | null;
          output_summary: string;
          evidence_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          recorded_at: string;
        };
        Insert: Omit<Database['public']['Tables']['native_skill_deployment_evidence']['Row'], 'evidence_id' | 'recorded_at'> & { evidence_id?: string };
        Update: Partial<Database['public']['Tables']['native_skill_deployment_evidence']['Insert']>;
      };
      skillshub_protocols: {
        Row: {
          protocol_id: string;
          source_id: string | null;
          tool_name: string;
          crate_name: string;
          crate_version: string;
          crate_url: string;
          docs_url: string;
          repository_url: string | null;
          install_command: string;
          registry_path: string;
          database_path: string;
          command_catalog: Record<string, unknown>[];
          supported_agents: Record<string, unknown>[];
          dependency_catalog: Record<string, unknown>[];
          skill_format_schema: Record<string, unknown>;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          no_mock_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['skillshub_protocols']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['skillshub_protocols']['Insert']>;
      };
      skill_taps: {
        Row: {
          tap_id: string;
          protocol_id: string;
          source_id: string | null;
          tap_ref: string;
          repository_url: string;
          branch: string | null;
          discovery_command: string;
          install_command: string | null;
          link_command: string;
          available_count: number | null;
          installed_count: number | null;
          tap_metadata: Record<string, unknown>;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          deployment_status: 'available' | 'linked' | 'installed' | 'blocked' | 'unverified';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['skill_taps']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['skill_taps']['Insert']>;
      };
      skill_allowed_tools: {
        Row: {
          allowed_tool_id: string;
          protocol_id: string;
          tap_id: string | null;
          cursor_skill_id: string | null;
          skill_source_ref: string;
          skill_name: string;
          allowed_tool: string;
          tool_class: 'read' | 'write' | 'execute' | 'network' | 'browser' | 'database' | 'shell' | 'mcp' | 'unknown';
          authority_level: 'read_only' | 'least_privilege' | 'developer' | 'operator' | 'blocked';
          evidence_source: string;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['skill_allowed_tools']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['skill_allowed_tools']['Insert']>;
      };
      intent_permission_profiles: {
        Row: {
          profile_id: string;
          shell_state: string;
          role: string;
          scope: string;
          authority_level: 'guest' | 'primary' | 'developer' | 'operator' | 'blocked';
          desktop_sub_path: string | null;
          allowed_skill_patterns: string[];
          allowed_tool_classes: string[];
          denied_tool_classes: string[];
          system_prompt_requirements: string[];
          evidence_required: string;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['intent_permission_profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['intent_permission_profiles']['Insert']>;
      };
      skill_authority_evidence: {
        Row: {
          evidence_id: string;
          profile_id: string | null;
          protocol_id: string | null;
          tap_id: string | null;
          cursor_skill_id: string | null;
          owner_auth_id: string | null;
          intent_id: string | null;
          requested_skill: string | null;
          requested_tool: string | null;
          decision: 'allowed' | 'denied' | 'blocked' | 'unverified';
          reason: string;
          command: string | null;
          exit_code: number | null;
          output_summary: string;
          recorded_at: string;
        };
        Insert: Omit<Database['public']['Tables']['skill_authority_evidence']['Row'], 'evidence_id' | 'recorded_at'> & { evidence_id?: string };
        Update: Partial<Database['public']['Tables']['skill_authority_evidence']['Insert']>;
      };
      university_course_drafts: {
        Row: {
          draft_id: string;
          program_slug: string;
          working_title: string;
          knowledge_text: string;
          guidance: Record<string, unknown>;
          blueprint: Record<string, unknown>;
          professor_user_id: string | null;
          author_user_id: string | null;
          linked_course_id: string | null;
          status: 'draft' | 'review' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['university_course_drafts']['Row'], 'draft_id' | 'created_at' | 'updated_at'> & { draft_id?: string };
        Update: Partial<Database['public']['Tables']['university_course_drafts']['Insert']>;
      };
      university_courses: {
        Row: {
          course_id: string;
          title: string;
          description: string;
          level: 'foundation' | 'intermediate' | 'advanced' | 'final_project';
          sort_order: number;
          status: 'draft' | 'review' | 'published' | 'blocked' | 'unverified';
          final_project: boolean;
          docs_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['university_courses']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['university_courses']['Insert']>;
      };
      university_lessons: {
        Row: {
          lesson_id: string;
          course_id: string;
          title: string;
          summary: string;
          docs_url: string;
          docs_urls: string[];
          learning_outcomes: string[];
          prerequisites: string[];
          install_steps: Record<string, unknown>[];
          test_steps: Record<string, unknown>[];
          example_project: Record<string, unknown>;
          aptitude_test: Record<string, unknown>;
          multimodal_assets: Record<string, unknown>;
          cursor_rule_path: string;
          cursor_skill_path: string;
          agent_prompt_path: string;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          install_verified: boolean;
          test_verified: boolean;
          triangulation_status: 'not_started' | 'round_1' | 'revision' | 'round_2' | 'passed' | 'blocked';
          no_mock_verified: boolean;
          publish_status: 'draft' | 'review' | 'published' | 'blocked' | 'unverified';
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['university_lessons']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['university_lessons']['Insert']>;
      };
      university_lesson_artifacts: {
        Row: {
          artifact_id: string;
          lesson_id: string;
          artifact_type: 'docs' | 'cursor_rule' | 'cursor_skill' | 'agent_prompt' | 'video' | 'transcript' | 'visual_aid' | 'install_log' | 'test_log' | 'triangulation_review' | 'supabase_payload';
          title: string;
          uri: string;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          evidence: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['university_lesson_artifacts']['Row'], 'artifact_id' | 'created_at'> & { artifact_id?: string };
        Update: Partial<Database['public']['Tables']['university_lesson_artifacts']['Insert']>;
      };
      vcu_behavior_artifacts: {
        Row: {
          artifact_id: string;
          artifact_scope: 'global' | 'lesson_target';
          artifact_type: 'cursor_rule' | 'cursor_skill' | 'agent_prompt' | 'docs_registry' | 'schema' | 'seed_importer';
          title: string;
          uri: string;
          description: string;
          docs_urls: string[];
          lesson_bindings: string[];
          content_hash: string | null;
          file_exists: boolean;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          no_mock_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          reviewer_notes: string;
          usage_constraints: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vcu_behavior_artifacts']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['vcu_behavior_artifacts']['Insert']>;
      };
      agent_skills: {
        Row: {
          agent_skill_id: string;
          skill_id: string | null;
          name: string;
          description: string;
          trigger_terms: string[];
          docs_urls: string[];
          cursor_rule_paths: string[];
          cursor_skill_path: string;
          agent_prompt_path: string;
          tool_ids: string[];
          resource_refs: Record<string, unknown>[];
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          no_mock_verified: boolean;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agent_skills']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agent_skills']['Insert']>;
      };
      mcp_sdk_registry: {
        Row: {
          registry_id: string;
          source_name: string;
          source_url: string;
          sdk_language: string | null;
          protocol_version: string | null;
          capability_type: 'tool' | 'resource' | 'prompt' | 'client' | 'server' | 'app' | 'schema' | 'bridge' | 'ui';
          capability_name: string;
          schema_ref: string | null;
          docs_summary: string;
          verification_status: 'verified' | 'review_pending' | 'blocked' | 'unverified';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['mcp_sdk_registry']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['mcp_sdk_registry']['Insert']>;
      };
      projects: {
        Row: {
          project_id: string;
          owner_auth_id: string | null;
          user_id: string | null;
          title: string;
          description: string | null;
          source_lesson_id: string | null;
          status: 'draft' | 'active' | 'blocked' | 'completed' | 'archived';
          acceptance_gate: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'project_id' | 'created_at' | 'updated_at'> & { project_id?: string };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      project_tasks: {
        Row: {
          task_id: string;
          project_id: string;
          assigned_agent: string;
          source_lesson_id: string | null;
          title: string;
          instructions: string;
          docs_urls: string[];
          tool_refs: Record<string, unknown>[];
          resource_refs: Record<string, unknown>[];
          status: 'queued' | 'in_progress' | 'blocked' | 'review' | 'completed' | 'rejected';
          no_mock_required: boolean;
          no_mock_verified: boolean;
          evidence: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['project_tasks']['Row'], 'task_id' | 'created_at' | 'updated_at'> & { task_id?: string };
        Update: Partial<Database['public']['Tables']['project_tasks']['Insert']>;
      };
    };
    Functions: {
      admin_access_probe: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
  };
}
