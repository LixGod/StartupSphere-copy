# PROJECT EXTRACTION & DOCUMENTATION

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1: PROJECT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```text
/home/Adnan/Desktop/My Projects/StartupSphere-copy
  .env.local
  .gitignore
  app
    admin
      page.tsx
    api
      ai
        ask
          route.ts
        forecast
          route.ts
        generate-reel
          route.ts
        generate
          route.js
        identify-product
          route.ts
        insights
          route.js
        lead-score
          route.ts
        marketing
          route.ts
        scan-invoice
          route.ts
      approve-employee
        route.ts
      campaigns
        launch
          route.js
      config
        route.js
      cron
        followups
          route.js
      deep-lead-intel
        route.ts
      generate-strategy
        route.ts
      leadgen
        route.ts
      messages
        send
          route.js
      scrape-leads
        route.ts
      scrape-trends
        route.ts
      scrape
        discover
          route.js
        enrich
          route.js
        route.js
      service-email
        route.ts
      webhooks
        inbound
          route.js
        whatsapp
          route.ts
    auth
      employee-login
        page.tsx
      employee-signup
        page.tsx
      login
        page.tsx
      owner-login
        page.tsx
      owner-signup
        page.tsx
      redirect
        page.tsx
    dashboard
      accounting
        page.tsx
      ai-intelligence
        page.tsx
      ai-marketing
        page.tsx
      automation
        page.tsx
      crm-founder
        page.tsx
      crm
        page.tsx
      employees
        page.tsx
      helpdesk
        page.tsx
      inbox
        page.tsx
      inventory
        page.tsx
      layout.tsx
      multi-store
        page.tsx
      overview
        page.tsx
      profile
        page.tsx
      sales
        page.tsx
      settings
        communications
          page.tsx
        page.tsx
      store-connect
        page.tsx
    globals.css
    layout.tsx
    marketing
      page.tsx
    page.tsx
    receipt
      [id]
        page.tsx
    request-access
      page.tsx
  components.json
  components
    accounting
      invoice-design-studio.tsx
    ai-marketing
      IdeaCard.tsx
      SceneScript.tsx
      StrategyBlock.tsx
      TrendBanner.tsx
      TrendResearch.tsx
    alerts
      alert-center.tsx
    crm
      activity-timeline.tsx
      pipeline-board.tsx
    dashboard-nav.tsx
    dashboard-overview.tsx
    founder-crm
      AddLeadModal.jsx
      Auth.jsx
      AutomationHub.jsx
      CSVImport.jsx
      Dashboard.jsx
      GlobalInbox.jsx
      KanbanBoard.jsx
      LeadManagement.jsx
      LeadScraper.jsx
      Settings.jsx
      UnifiedInbox.jsx
    impersonation-banner.tsx
    theme-provider.tsx
    ui
      adaptive-table.tsx
      alert-dialog.tsx
      alert.tsx
      avatar.tsx
      badge.tsx
      breadcrumb.tsx
      button-group.tsx
      button.tsx
      calendar.tsx
      card.tsx
      chart.tsx
      checkbox.tsx
      collapsible.tsx
      command.tsx
      dialog.tsx
      drawer.tsx
      dropdown-menu.tsx
      empty.tsx
      field.tsx
      form.tsx
      input-group.tsx
      input.tsx
      item.tsx
      kbd.tsx
      label.tsx
      pagination.tsx
      popover.tsx
      progress.tsx
      radio-group.tsx
      scroll-area.tsx
      select.tsx
      separator.tsx
      sheet.tsx
      skeleton.tsx
      sonner.tsx
      spinner.tsx
      switch.tsx
      table.tsx
      tabs.tsx
      textarea.tsx
      toast.tsx
      toaster.tsx
      tooltip.tsx
      use-mobile.tsx
      use-toast.ts
  leadgen
    README.md
    modules
      __pycache__
        stage1_5_fast_serp_finder.cpython-314.pyc
        stage1_discovery.cpython-310.pyc
        stage1_discovery.cpython-312.pyc
        stage1_discovery.cpython-314.pyc
        stage2_scraper.cpython-310.pyc
        stage2_scraper.cpython-314.pyc
        stage3_email_finder.cpython-310.pyc
        stage3_email_finder.cpython-314.pyc
        stage4_owner_enrichment.cpython-310.pyc
        stage4_owner_enrichment.cpython-314.pyc
        stage5_phone_verify.cpython-310.pyc
        stage5_phone_verify.cpython-314.pyc
        stage6_icp_scorer.cpython-310.pyc
        stage6_icp_scorer.cpython-314.pyc
        stage7_export.cpython-310.pyc
        stage7_export.cpython-314.pyc
        stage8_crm_import.cpython-310.pyc
        stage8_crm_import.cpython-314.pyc
      stage1_5_fast_serp_finder.py
      stage1_discovery.py
      stage2_scraper.py
      stage3_email_finder.py
      stage4_owner_enrichment.py
      stage5_phone_verify.py
      stage6_icp_scorer.py
      stage7_export.py
      stage8_crm_import.py
    output
      leads_Cafe_Sinagapore_20260511_103517.csv
      leads_Cafes_Singapore_20260511_103931.csv
      leads_Interior_Designer_Singapore_20260511_103045.csv
      leads_SaaS_startups_New York_20260512_191106.csv
      leads_dental_clinics_Mumbai_20260510_152044.csv
      leads_test_niche_test city_20260511_101116.csv
      stage1_5_fast.json
      stage1_raw.json
      stage2_scraped.json
      stage3_emails.json
      stage4_owners.json
      stage5_phones.json
      stage6_scored.json
    requirements.txt
    run_pipeline.py
  lib
    ai-marketing
      groq.ts
      prompts.ts
      types.ts
    ai.js
    api
      index.ts
    crypto.js
    hooks
      use-accounting.ts
      use-business-context.tsx
      use-crm.ts
      use-inventory.ts
      use-realtime.ts
      use-workflows.ts
    notifications.ts
    services
      ai-analyst.ts
      comms.ts
      currency.ts
      gst.ts
      stock-transfer.ts
      tenant-comms.ts
    supabase-server.js
    supabase.ts
    supabase
      client.ts
      server.ts
    types
      index.ts
    utils.ts
    utils
      encryption.ts
  middleware.ts
  next-env.d.ts
  next.config.mjs
  package-lock.json
  package.json
  postcss.config.mjs
  public
    apple-icon.png
    icon-dark-32x32.png
    icon-light-32x32.png
    icon.svg
    manifest.json
  scripts
    010_add_business_details_to_profiles.sql
    011_add_customer_company_to_invoices.sql
    014_inventory_sync_trigger.sql
    015_add_increment_stock_rpc.sql
    016_fix_invoice_delete_cascade.sql
    017_add_manufacturer_to_products.sql
    018_add_tax_filing_to_expenses.sql
    019_add_purchase_gst_to_products.sql
    020_robust_inventory_sync.sql
    021_add_customer_contacts_to_sales.sql
    022_enable_public_receipt_view.sql
    023_admin_and_leads_setup.sql
    025_crm_tables.sql
    026_communication_tables.sql
    027_ai_intelligence_tables.sql
    028_multistore_b2b_tables.sql
    029_premium_global_tables.sql
    030_tenant_comms_setup.sql
    031_membership_packs_setup.sql
    031_workflow_engine_setup.sql
    032_profile_limits_update.sql
    033_consolidated_chat_updates.sql
    034_invoice_branding.sql
    035_receipt_public_access.sql
    036_fix_order_items_rls.sql
    037_customer_feedback_table.sql
    FULL_PLATFORM_SETUP.sql
    RLS_FIX.sql
    STORAGE_SETUP.sql
    consolidated_setup.sql
    verify_schema.sql
  test-rls.js
  tsconfig.json

```

## File Details

| File | Size (lines) | Purpose | Used? |
|---|---|---|---|
| .env.local | 32 | Configuration or specific logic | Yes |
| .gitignore | 27 | Configuration or specific logic | Yes |
| app/admin/page.tsx | 604 | Frontend Page | Yes |
| app/api/ai/ask/route.ts | 137 | API Route | Yes |
| app/api/ai/forecast/route.ts | 66 | API Route | Yes |
| app/api/ai/generate-reel/route.ts | 93 | API Route | Yes |
| app/api/ai/generate/route.js | 44 | API Route | Yes |
| app/api/ai/identify-product/route.ts | 59 | API Route | Yes |
| app/api/ai/insights/route.js | 199 | API Route | Yes |
| app/api/ai/lead-score/route.ts | 59 | API Route | Yes |
| app/api/ai/marketing/route.ts | 146 | API Route | Yes |
| app/api/ai/scan-invoice/route.ts | 56 | API Route | Yes |
| app/api/approve-employee/route.ts | 127 | API Route | Yes |
| app/api/campaigns/launch/route.js | 96 | API Route | Yes |
| app/api/config/route.js | 63 | API Route | Yes |
| app/api/cron/followups/route.js | 114 | API Route | Yes |
| app/api/deep-lead-intel/route.ts | 128 | API Route | Yes |
| app/api/generate-strategy/route.ts | 48 | API Route | Yes |
| app/api/leadgen/route.ts | 166 | API Route | Yes |
| app/api/messages/send/route.js | 83 | API Route | Yes |
| app/api/scrape-leads/route.ts | 184 | API Route | Yes |
| app/api/scrape-trends/route.ts | 68 | API Route | Yes |
| app/api/scrape/discover/route.js | 112 | API Route | Yes |
| app/api/scrape/enrich/route.js | 71 | API Route | Yes |
| app/api/scrape/route.js | 98 | API Route | Yes |
| app/api/service-email/route.ts | 55 | API Route | Yes |
| app/api/webhooks/inbound/route.js | 123 | API Route | Yes |
| app/api/webhooks/whatsapp/route.ts | 129 | API Route | Yes |
| app/auth/employee-login/page.tsx | 137 | Frontend Page | Yes |
| app/auth/employee-signup/page.tsx | 192 | Frontend Page | Yes |
| app/auth/login/page.tsx | 79 | Frontend Page | Yes |
| app/auth/owner-login/page.tsx | 137 | Frontend Page | Yes |
| app/auth/owner-signup/page.tsx | 173 | Frontend Page | Yes |
| app/auth/redirect/page.tsx | 62 | Frontend Page | Yes |
| app/dashboard/accounting/page.tsx | 278 | Frontend Page | Yes |
| app/dashboard/ai-intelligence/page.tsx | 281 | Frontend Page | Yes |
| app/dashboard/ai-marketing/page.tsx | 414 | Frontend Page | Yes |
| app/dashboard/automation/page.tsx | 276 | Frontend Page | Yes |
| app/dashboard/crm-founder/page.tsx | 48 | Frontend Page | Yes |
| app/dashboard/crm/page.tsx | 449 | Frontend Page | Yes |
| app/dashboard/employees/page.tsx | 307 | Frontend Page | Yes |
| app/dashboard/helpdesk/page.tsx | 230 | Frontend Page | Yes |
| app/dashboard/inbox/page.tsx | 539 | Frontend Page | Yes |
| app/dashboard/inventory/page.tsx | 962 | Frontend Page | Yes |
| app/dashboard/layout.tsx | 50 | Layout Component | Yes |
| app/dashboard/multi-store/page.tsx | 297 | Frontend Page | Yes |
| app/dashboard/overview/page.tsx | 95 | Frontend Page | Yes |
| app/dashboard/profile/page.tsx | 361 | Frontend Page | Yes |
| app/dashboard/sales/page.tsx | 1022 | Frontend Page | Yes |
| app/dashboard/settings/communications/page.tsx | 271 | Frontend Page | Yes |
| app/dashboard/settings/page.tsx | 508 | Frontend Page | Yes |
| app/dashboard/store-connect/page.tsx | 295 | Frontend Page | Yes |
| app/globals.css | 136 | Configuration or specific logic | Yes |
| app/layout.tsx | 63 | Layout Component | Yes |
| app/marketing/page.tsx | 229 | Frontend Page | Yes |
| app/page.tsx | 218 | Frontend Page | Yes |
| app/receipt/[id]/page.tsx | 335 | Frontend Page | Yes |
| app/request-access/page.tsx | 150 | Frontend Page | Yes |
| components.json | 21 | Configuration or specific logic | Yes |
| components/accounting/invoice-design-studio.tsx | 197 | UI Component | Yes |
| components/ai-marketing/IdeaCard.tsx | 179 | UI Component | Yes |
| components/ai-marketing/SceneScript.tsx | 201 | UI Component | Yes |
| components/ai-marketing/StrategyBlock.tsx | 78 | UI Component | Yes |
| components/ai-marketing/TrendBanner.tsx | 60 | UI Component | Yes |
| components/ai-marketing/TrendResearch.tsx | 79 | UI Component | Yes |
| components/alerts/alert-center.tsx | 111 | UI Component | Yes |
| components/crm/activity-timeline.tsx | 64 | UI Component | Yes |
| components/crm/pipeline-board.tsx | 160 | UI Component | Yes |
| components/dashboard-nav.tsx | 406 | UI Component | Yes |
| components/dashboard-overview.tsx | 232 | UI Component | Yes |
| components/founder-crm/AddLeadModal.jsx | 169 | UI Component | Yes |
| components/founder-crm/Auth.jsx | 181 | UI Component | Yes |
| components/founder-crm/AutomationHub.jsx | 320 | UI Component | Yes |
| components/founder-crm/CSVImport.jsx | 146 | UI Component | Yes |
| components/founder-crm/Dashboard.jsx | 153 | UI Component | Yes |
| components/founder-crm/GlobalInbox.jsx | 138 | UI Component | Yes |
| components/founder-crm/KanbanBoard.jsx | 340 | UI Component | Yes |
| components/founder-crm/LeadManagement.jsx | 424 | UI Component | Yes |
| components/founder-crm/LeadScraper.jsx | 450 | UI Component | Yes |
| components/founder-crm/Settings.jsx | 191 | UI Component | Yes |
| components/founder-crm/UnifiedInbox.jsx | 190 | UI Component | Yes |
| components/impersonation-banner.tsx | 35 | UI Component | Yes |
| components/theme-provider.tsx | 12 | UI Component | Yes |
| components/ui/adaptive-table.tsx | 133 | UI Component | Yes |
| components/ui/alert-dialog.tsx | 158 | UI Component | Yes |
| components/ui/alert.tsx | 67 | UI Component | Yes |
| components/ui/avatar.tsx | 54 | UI Component | Yes |
| components/ui/badge.tsx | 47 | UI Component | Yes |
| components/ui/breadcrumb.tsx | 110 | UI Component | Yes |
| components/ui/button-group.tsx | 84 | UI Component | Yes |
| components/ui/button.tsx | 61 | UI Component | Yes |
| components/ui/calendar.tsx | 214 | UI Component | Yes |
| components/ui/card.tsx | 93 | UI Component | Yes |
| components/ui/chart.tsx | 354 | UI Component | Yes |
| components/ui/checkbox.tsx | 33 | UI Component | Yes |
| components/ui/collapsible.tsx | 34 | UI Component | Yes |
| components/ui/command.tsx | 185 | UI Component | Yes |
| components/ui/dialog.tsx | 144 | UI Component | Yes |
| components/ui/drawer.tsx | 136 | UI Component | Yes |
| components/ui/dropdown-menu.tsx | 258 | UI Component | Yes |
| components/ui/empty.tsx | 105 | UI Component | Yes |
| components/ui/field.tsx | 245 | UI Component | Yes |
| components/ui/form.tsx | 168 | UI Component | Yes |
| components/ui/input-group.tsx | 170 | UI Component | Yes |
| components/ui/input.tsx | 22 | UI Component | Yes |
| components/ui/item.tsx | 194 | UI Component | Yes |
| components/ui/kbd.tsx | 29 | UI Component | Yes |
| components/ui/label.tsx | 25 | UI Component | Yes |
| components/ui/pagination.tsx | 128 | UI Component | Yes |
| components/ui/popover.tsx | 49 | UI Component | Yes |
| components/ui/progress.tsx | 32 | UI Component | Yes |
| components/ui/radio-group.tsx | 46 | UI Component | Yes |
| components/ui/scroll-area.tsx | 59 | UI Component | Yes |
| components/ui/select.tsx | 186 | UI Component | Yes |
| components/ui/separator.tsx | 29 | UI Component | Yes |
| components/ui/sheet.tsx | 140 | UI Component | Yes |
| components/ui/skeleton.tsx | 14 | UI Component | Yes |
| components/ui/sonner.tsx | 26 | UI Component | Yes |
| components/ui/spinner.tsx | 17 | UI Component | Yes |
| components/ui/switch.tsx | 32 | UI Component | Yes |
| components/ui/table.tsx | 117 | UI Component | Yes |
| components/ui/tabs.tsx | 67 | UI Component | Yes |
| components/ui/textarea.tsx | 19 | UI Component | Yes |
| components/ui/toast.tsx | 130 | UI Component | Yes |
| components/ui/toaster.tsx | 36 | UI Component | Yes |
| components/ui/tooltip.tsx | 62 | UI Component | Yes |
| components/ui/use-mobile.tsx | 20 | UI Component | Yes |
| components/ui/use-toast.ts | 191 | UI Component | Yes |
| leadgen/README.md | 95 | Lead generation script/logic | Yes |
| leadgen/modules/__pycache__/stage1_5_fast_serp_finder.cpython-314.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage1_discovery.cpython-310.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage1_discovery.cpython-312.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage1_discovery.cpython-314.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage2_scraper.cpython-310.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage2_scraper.cpython-314.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage3_email_finder.cpython-310.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage3_email_finder.cpython-314.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage4_owner_enrichment.cpython-310.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage4_owner_enrichment.cpython-314.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage5_phone_verify.cpython-310.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage5_phone_verify.cpython-314.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage6_icp_scorer.cpython-310.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage6_icp_scorer.cpython-314.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage7_export.cpython-310.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage7_export.cpython-314.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage8_crm_import.cpython-310.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/__pycache__/stage8_crm_import.cpython-314.pyc | 0 | Lead generation script/logic | Unused |
| leadgen/modules/stage1_5_fast_serp_finder.py | 98 | Lead generation script/logic | Yes |
| leadgen/modules/stage1_discovery.py | 121 | Lead generation script/logic | Yes |
| leadgen/modules/stage2_scraper.py | 202 | Lead generation script/logic | Yes |
| leadgen/modules/stage3_email_finder.py | 186 | Lead generation script/logic | Yes |
| leadgen/modules/stage4_owner_enrichment.py | 161 | Lead generation script/logic | Yes |
| leadgen/modules/stage5_phone_verify.py | 123 | Lead generation script/logic | Yes |
| leadgen/modules/stage6_icp_scorer.py | 146 | Lead generation script/logic | Yes |
| leadgen/modules/stage7_export.py | 90 | Lead generation script/logic | Yes |
| leadgen/modules/stage8_crm_import.py | 88 | Lead generation script/logic | Yes |
| leadgen/output/leads_Cafe_Sinagapore_20260511_103517.csv | 11 | Lead generation script/logic | Yes |
| leadgen/output/leads_Cafes_Singapore_20260511_103931.csv | 11 | Lead generation script/logic | Yes |
| leadgen/output/leads_Interior_Designer_Singapore_20260511_103045.csv | 11 | Lead generation script/logic | Yes |
| leadgen/output/leads_SaaS_startups_New York_20260512_191106.csv | 3 | Lead generation script/logic | Yes |
| leadgen/output/leads_dental_clinics_Mumbai_20260510_152044.csv | 11 | Lead generation script/logic | Yes |
| leadgen/output/leads_test_niche_test city_20260511_101116.csv | 2 | Lead generation script/logic | Yes |
| leadgen/output/stage1_5_fast.json | 36 | Lead generation script/logic | Yes |
| leadgen/output/stage1_raw.json | 34 | Lead generation script/logic | Yes |
| leadgen/output/stage2_scraped.json | 48 | Lead generation script/logic | Yes |
| leadgen/output/stage3_emails.json | 48 | Lead generation script/logic | Yes |
| leadgen/output/stage4_owners.json | 54 | Lead generation script/logic | Yes |
| leadgen/output/stage5_phones.json | 64 | Lead generation script/logic | Yes |
| leadgen/output/stage6_scored.json | 84 | Lead generation script/logic | Yes |
| leadgen/requirements.txt | 6 | Lead generation script/logic | Yes |
| leadgen/run_pipeline.py | 176 | Lead generation script/logic | Yes |
| lib/ai-marketing/groq.ts | 21 | Utility/Library logic | Yes |
| lib/ai-marketing/prompts.ts | 258 | Utility/Library logic | Yes |
| lib/ai-marketing/types.ts | 140 | Utility/Library logic | Yes |
| lib/ai.js | 194 | Utility/Library logic | Yes |
| lib/api/index.ts | 1196 | Utility/Library logic | Yes |
| lib/crypto.js | 64 | Utility/Library logic | Yes |
| lib/hooks/use-accounting.ts | 85 | Utility/Library logic | Yes |
| lib/hooks/use-business-context.tsx | 196 | Utility/Library logic | Yes |
| lib/hooks/use-crm.ts | 145 | Utility/Library logic | Yes |
| lib/hooks/use-inventory.ts | 111 | Utility/Library logic | Yes |
| lib/hooks/use-realtime.ts | 58 | Utility/Library logic | Yes |
| lib/hooks/use-workflows.ts | 68 | Utility/Library logic | Yes |
| lib/notifications.ts | 59 | Utility/Library logic | Yes |
| lib/services/ai-analyst.ts | 194 | Utility/Library logic | Yes |
| lib/services/comms.ts | 163 | Utility/Library logic | Yes |
| lib/services/currency.ts | 70 | Utility/Library logic | Yes |
| lib/services/gst.ts | 85 | Utility/Library logic | Yes |
| lib/services/stock-transfer.ts | 48 | Utility/Library logic | Yes |
| lib/services/tenant-comms.ts | 87 | Utility/Library logic | Yes |
| lib/supabase-server.js | 50 | Utility/Library logic | Yes |
| lib/supabase.ts | 11 | Utility/Library logic | Yes |
| lib/supabase/client.ts | 11 | Utility/Library logic | Yes |
| lib/supabase/server.ts | 27 | Utility/Library logic | Yes |
| lib/types/index.ts | 628 | Utility/Library logic | Yes |
| lib/utils.ts | 6 | Utility/Library logic | Yes |
| lib/utils/encryption.ts | 46 | Utility/Library logic | Yes |
| middleware.ts | 44 | Configuration or specific logic | Yes |
| next-env.d.ts | 6 | Configuration or specific logic | Yes |
| next.config.mjs | 19 | Configuration or specific logic | Yes |
| package-lock.json | 5162 | Configuration or specific logic | Yes |
| package.json | 86 | Dependencies and Scripts | Yes |
| postcss.config.mjs | 8 | Configuration or specific logic | Yes |
| public/apple-icon.png | 0 | Configuration or specific logic | Unused |
| public/icon-dark-32x32.png | 0 | Configuration or specific logic | Unused |
| public/icon-light-32x32.png | 0 | Configuration or specific logic | Unused |
| public/icon.svg | 26 | Configuration or specific logic | Yes |
| public/manifest.json | 31 | Configuration or specific logic | Yes |
| scripts/010_add_business_details_to_profiles.sql | 6 | Database Setup/Migration | Yes |
| scripts/011_add_customer_company_to_invoices.sql | 3 | Database Setup/Migration | Yes |
| scripts/014_inventory_sync_trigger.sql | 32 | Database Setup/Migration | Yes |
| scripts/015_add_increment_stock_rpc.sql | 9 | Database Setup/Migration | Yes |
| scripts/016_fix_invoice_delete_cascade.sql | 7 | Database Setup/Migration | Yes |
| scripts/017_add_manufacturer_to_products.sql | 8 | Database Setup/Migration | Yes |
| scripts/018_add_tax_filing_to_expenses.sql | 7 | Database Setup/Migration | Yes |
| scripts/019_add_purchase_gst_to_products.sql | 3 | Database Setup/Migration | Yes |
| scripts/020_robust_inventory_sync.sql | 41 | Database Setup/Migration | Yes |
| scripts/021_add_customer_contacts_to_sales.sql | 4 | Database Setup/Migration | Yes |
| scripts/022_enable_public_receipt_view.sql | 24 | Database Setup/Migration | Yes |
| scripts/023_admin_and_leads_setup.sql | 34 | Database Setup/Migration | Yes |
| scripts/025_crm_tables.sql | 209 | Database Setup/Migration | Yes |
| scripts/026_communication_tables.sql | 138 | Database Setup/Migration | Yes |
| scripts/027_ai_intelligence_tables.sql | 98 | Database Setup/Migration | Yes |
| scripts/028_multistore_b2b_tables.sql | 106 | Database Setup/Migration | Yes |
| scripts/029_premium_global_tables.sql | 82 | Database Setup/Migration | Yes |
| scripts/030_tenant_comms_setup.sql | 55 | Database Setup/Migration | Yes |
| scripts/031_membership_packs_setup.sql | 36 | Database Setup/Migration | Yes |
| scripts/031_workflow_engine_setup.sql | 44 | Database Setup/Migration | Yes |
| scripts/032_profile_limits_update.sql | 5 | Database Setup/Migration | Yes |
| scripts/033_consolidated_chat_updates.sql | 155 | Database Setup/Migration | Yes |
| scripts/034_invoice_branding.sql | 5 | Database Setup/Migration | Yes |
| scripts/035_receipt_public_access.sql | 23 | Database Setup/Migration | Yes |
| scripts/036_fix_order_items_rls.sql | 27 | Database Setup/Migration | Yes |
| scripts/037_customer_feedback_table.sql | 21 | Database Setup/Migration | Yes |
| scripts/FULL_PLATFORM_SETUP.sql | 1142 | Database Setup/Migration | Yes |
| scripts/RLS_FIX.sql | 219 | Database Setup/Migration | Yes |
| scripts/STORAGE_SETUP.sql | 33 | Database Setup/Migration | Yes |
| scripts/consolidated_setup.sql | 335 | Database Setup/Migration | Yes |
| scripts/verify_schema.sql | 42 | Database Setup/Migration | Yes |
| test-rls.js | 12 | Configuration or specific logic | Yes |
| tsconfig.json | 41 | Configuration or specific logic | Yes |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2: TECH STACK & DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2A - Core Stack

- **Frontend**: Next.js (App Router)
- **Backend**: Next.js API Routes
- **Database**: Supabase
- **Authentication**: Supabase Auth
- **CSS Framework**: TailwindCSS

2B - All Packages

| Package | Version | Purpose | Used? | Notes |
|---|---|---|---|---|
| @ai-sdk/groq | ^3.0.35 | Dependency | Yes | |
| @hookform/resolvers | ^3.10.0 | Dependency | Yes | |
| @radix-ui/react-accordion | 1.2.2 | Dependency | Yes | |
| @radix-ui/react-alert-dialog | 1.1.4 | Dependency | Yes | |
| @radix-ui/react-aspect-ratio | 1.1.1 | Dependency | Yes | |
| @radix-ui/react-avatar | 1.1.2 | Dependency | Yes | |
| @radix-ui/react-checkbox | 1.1.3 | Dependency | Yes | |
| @radix-ui/react-collapsible | 1.1.2 | Dependency | Yes | |
| @radix-ui/react-context-menu | 2.2.4 | Dependency | Yes | |
| @radix-ui/react-dialog | 1.1.4 | Dependency | Yes | |
| @radix-ui/react-dropdown-menu | 2.1.4 | Dependency | Yes | |
| @radix-ui/react-hover-card | 1.1.4 | Dependency | Yes | |
| @radix-ui/react-label | 2.1.1 | Dependency | Yes | |
| @radix-ui/react-menubar | 1.1.4 | Dependency | Yes | |
| @radix-ui/react-navigation-menu | 1.2.3 | Dependency | Yes | |
| @radix-ui/react-popover | 1.1.4 | Dependency | Yes | |
| @radix-ui/react-progress | 1.1.1 | Dependency | Yes | |
| @radix-ui/react-radio-group | 1.2.2 | Dependency | Yes | |
| @radix-ui/react-scroll-area | 1.2.2 | Dependency | Yes | |
| @radix-ui/react-select | 2.1.4 | Dependency | Yes | |
| @radix-ui/react-separator | 1.1.1 | Dependency | Yes | |
| @radix-ui/react-slider | 1.2.2 | Dependency | Yes | |
| @radix-ui/react-slot | 1.1.1 | Dependency | Yes | |
| @radix-ui/react-switch | 1.1.2 | Dependency | Yes | |
| @radix-ui/react-tabs | 1.1.2 | Dependency | Yes | |
| @radix-ui/react-toast | 1.2.4 | Dependency | Yes | |
| @radix-ui/react-toggle | 1.1.1 | Dependency | Yes | |
| @radix-ui/react-toggle-group | 1.1.1 | Dependency | Yes | |
| @radix-ui/react-tooltip | 1.1.6 | Dependency | Yes | |
| @supabase/ssr | 0.8.0 | Dependency | Yes | |
| @supabase/supabase-js | latest | Dependency | Yes | |
| @vercel/analytics | 1.3.1 | Dependency | Yes | |
| ai | ^6.0.168 | Dependency | Yes | |
| autoprefixer | ^10.4.20 | Dependency | Yes | |
| axios | ^1.16.0 | Dependency | Yes | |
| class-variance-authority | ^0.7.1 | Dependency | Yes | |
| clsx | ^2.1.1 | Dependency | Yes | |
| cmdk | 1.0.4 | Dependency | Yes | |
| csv-parse | ^6.2.1 | Dependency | Yes | |
| date-fns | 4.1.0 | Dependency | Yes | |
| embla-carousel-react | 8.5.1 | Dependency | Yes | |
| groq-sdk | ^1.1.2 | Dependency | Yes | |
| input-otp | 1.4.1 | Dependency | Yes | |
| lucide-react | ^0.454.0 | Dependency | Yes | |
| next | 16.0.10 | Dependency | Yes | |
| next-themes | ^0.4.6 | Dependency | Yes | |
| nodemailer | ^7.0.12 | Dependency | Yes | |
| playwright | ^1.59.1 | Dependency | Yes | |
| playwright-extra | ^4.3.6 | Dependency | Yes | |
| puppeteer-extra-plugin-stealth | ^2.11.2 | Dependency | Yes | |
| react | 19.2.0 | Dependency | Yes | |
| react-day-picker | 9.8.0 | Dependency | Yes | |
| react-dom | 19.2.0 | Dependency | Yes | |
| react-hook-form | ^7.60.0 | Dependency | Yes | |
| react-resizable-panels | ^2.1.7 | Dependency | Yes | |
| recharts | 2.15.4 | Dependency | Yes | |
| resend | ^6.12.2 | Dependency | Yes | |
| sonner | ^1.7.4 | Dependency | Yes | |
| tailwind-merge | ^3.3.1 | Dependency | Yes | |
| tailwindcss-animate | ^1.0.7 | Dependency | Yes | |
| vaul | ^1.1.2 | Dependency | Yes | |
| zod | 3.25.76 | Dependency | Yes | |

2C - Dev Dependencies

| Package | Version | Purpose | Used? | Notes |
|---|---|---|---|---|
| @tailwindcss/postcss | ^4.1.9 | Dev Tool | Yes | |
| @types/node | ^22 | Dev Tool | Yes | |
| @types/nodemailer | ^8.0.0 | Dev Tool | Yes | |
| @types/react | ^19 | Dev Tool | Yes | |
| @types/react-dom | ^19 | Dev Tool | Yes | |
| postcss | ^8.5 | Dev Tool | Yes | |
| tailwindcss | ^4.1.9 | Dev Tool | Yes | |
| tw-animate-css | 1.3.3 | Dev Tool | Yes | |
| typescript | ^5 | Dev Tool | Yes | |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3: ENVIRONMENT VARIABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Variable Name | Used In | Purpose | Secret? | Prefix Correct? | In .env.example? |
|---|---|---|---|---|---|
| ENCRYPTION_KEY | lib/crypto.js | Configuration | Yes | Yes | Unknown |
| GROQ_API_KEY | app/api/config/route.js | Configuration | Yes | Yes | Unknown |
| GROQ_API_KEY | app/api/ai/generate-reel/route.ts | Configuration | Yes | Yes | Unknown |
| GROQ_API_KEY | lib/services/comms.ts | Configuration | Yes | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_URL | lib/supabase/client.ts | Configuration | No | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | lib/supabase/client.ts | Configuration | Yes | No | Unknown |
| GROQ_API_KEY | lib/ai.js | Configuration | Yes | Yes | Unknown |
| WHATSAPP_VERIFY_TOKEN | app/api/webhooks/whatsapp/route.ts | Configuration | No | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_URL | lib/supabase-server.js | Configuration | No | Yes | Unknown |
| APOLLO_API_KEY | app/api/deep-lead-intel/route.ts | Configuration | Yes | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | lib/supabase-server.js | Configuration | Yes | No | Unknown |
| GROQ_API_KEY | app/api/ai/ask/route.ts | Configuration | Yes | Yes | Unknown |
| GROQ_API_KEY | lib/ai-marketing/groq.ts | Configuration | Yes | Yes | Unknown |
| REEL_SHOOT_EMAIL | app/api/service-email/route.ts | Configuration | No | Yes | Unknown |
| GROQ_MODEL | lib/ai.js | Configuration | No | Yes | Unknown |
| SUPABASE_SERVICE_ROLE_KEY | app/api/approve-employee/route.ts | Configuration | Yes | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_URL | middleware.ts | Configuration | No | Yes | Unknown |
| ENCRYPTION_KEY | lib/utils/encryption.ts | Configuration | Yes | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | middleware.ts | Configuration | Yes | No | Unknown |
| APOLLO_API_KEY | app/api/scrape-leads/route.ts | Configuration | Yes | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_URL | test-rls.js | Configuration | No | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | test-rls.js | Configuration | Yes | No | Unknown |
| NEXT_PUBLIC_CRM_SUPABASE_URL | lib/supabase-server.js | Configuration | No | Yes | Unknown |
| GROQ_API_KEY | app/api/ai/forecast/route.ts | Configuration | Yes | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_URL | lib/supabase/server.ts | Configuration | No | Yes | Unknown |
| GROQ_API_KEY | app/api/ai/lead-score/route.ts | Configuration | Yes | Yes | Unknown |
| GROQ_API_KEY | lib/services/ai-analyst.ts | Configuration | Yes | Yes | Unknown |
| GROQ_API_KEY | app/api/ai/identify-product/route.ts | Configuration | Yes | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | lib/supabase/server.ts | Configuration | Yes | No | Unknown |
| SUPABASE_SERVICE_ROLE_KEY | lib/supabase-server.js | Configuration | Yes | Yes | Unknown |
| CRM_SUPABASE_SERVICE_ROLE_KEY | lib/supabase-server.js | Configuration | Yes | Yes | Unknown |
| REEL_STRATEGY_EMAIL | app/api/service-email/route.ts | Configuration | No | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_URL | app/api/approve-employee/route.ts | Configuration | No | Yes | Unknown |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | app/api/approve-employee/route.ts | Configuration | Yes | No | Unknown |
| CRON_SECRET | app/api/cron/followups/route.js | Configuration | Yes | Yes | Unknown |
| GROQ_API_KEY | app/api/ai/insights/route.js | Configuration | Yes | Yes | Unknown |
| SMTP_PASS | app/api/service-email/route.ts | Configuration | No | Yes | Unknown |
| WEBHOOK_SECRET | app/api/webhooks/inbound/route.js | Configuration | Yes | Yes | Unknown |
| GROQ_API_KEY | app/api/ai/scan-invoice/route.ts | Configuration | Yes | Yes | Unknown |
| YOUTUBE_KEY | app/api/ai/marketing/route.ts | Configuration | Yes | Yes | Unknown |
| SMTP_USER | app/api/service-email/route.ts | Configuration | No | Yes | Unknown |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4: DATABASE SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**TABLE**: `public`
Found in: 023_admin_and_leads_setup.sql

**TABLE**: `public`
Found in: 023_admin_and_leads_setup.sql

**TABLE**: `public`
Found in: 025_crm_tables.sql

**TABLE**: `public`
Found in: 025_crm_tables.sql

**TABLE**: `public`
Found in: 025_crm_tables.sql

**TABLE**: `public`
Found in: 025_crm_tables.sql

**TABLE**: `public`
Found in: 025_crm_tables.sql

**TABLE**: `public`
Found in: 025_crm_tables.sql

**TABLE**: `public`
Found in: 025_crm_tables.sql

**TABLE**: `public`
Found in: 026_communication_tables.sql

**TABLE**: `public`
Found in: 026_communication_tables.sql

**TABLE**: `public`
Found in: 026_communication_tables.sql

**TABLE**: `public`
Found in: 026_communication_tables.sql

**TABLE**: `public`
Found in: 026_communication_tables.sql

**TABLE**: `public`
Found in: 026_communication_tables.sql

**TABLE**: `public`
Found in: 027_ai_intelligence_tables.sql

**TABLE**: `public`
Found in: 027_ai_intelligence_tables.sql

**TABLE**: `public`
Found in: 027_ai_intelligence_tables.sql

**TABLE**: `public`
Found in: 027_ai_intelligence_tables.sql

**TABLE**: `public`
Found in: 027_ai_intelligence_tables.sql

**TABLE**: `public`
Found in: 028_multistore_b2b_tables.sql

**TABLE**: `public`
Found in: 028_multistore_b2b_tables.sql

**TABLE**: `public`
Found in: 028_multistore_b2b_tables.sql

**TABLE**: `public`
Found in: 028_multistore_b2b_tables.sql

**TABLE**: `public`
Found in: 028_multistore_b2b_tables.sql

**TABLE**: `public`
Found in: 028_multistore_b2b_tables.sql

**TABLE**: `public`
Found in: 029_premium_global_tables.sql

**TABLE**: `public`
Found in: 029_premium_global_tables.sql

**TABLE**: `public`
Found in: 029_premium_global_tables.sql

**TABLE**: `public`
Found in: 029_premium_global_tables.sql

**TABLE**: `public`
Found in: 029_premium_global_tables.sql

**TABLE**: `public`
Found in: 030_tenant_comms_setup.sql

**TABLE**: `public`
Found in: 030_tenant_comms_setup.sql

**TABLE**: `membership_requests`
Found in: 031_membership_packs_setup.sql

**TABLE**: `workflows`
Found in: 031_workflow_engine_setup.sql

**TABLE**: `workflow_logs`
Found in: 031_workflow_engine_setup.sql

**TABLE**: `public`
Found in: 033_consolidated_chat_updates.sql

**TABLE**: `public`
Found in: 033_consolidated_chat_updates.sql

**TABLE**: `public`
Found in: 033_consolidated_chat_updates.sql

**TABLE**: `public`
Found in: 037_customer_feedback_table.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: FULL_PLATFORM_SETUP.sql

**TABLE**: `public`
Found in: consolidated_setup.sql

**TABLE**: `public`
Found in: consolidated_setup.sql

**TABLE**: `public`
Found in: consolidated_setup.sql

**TABLE**: `public`
Found in: consolidated_setup.sql

**TABLE**: `public`
Found in: consolidated_setup.sql

**TABLE**: `public`
Found in: consolidated_setup.sql

**TABLE**: `public`
Found in: consolidated_setup.sql

**TABLE**: `public`
Found in: consolidated_setup.sql

**TABLE**: `public`
Found in: consolidated_setup.sql

**TABLE**: `public`
Found in: consolidated_setup.sql

**TABLE**: `public`
Found in: consolidated_setup.sql


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5: API ROUTES & ENDPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**ENDPOINT**: `[POST] /api/ai/ask`
File: app/api/ai/ask/route.ts
Auth Required: Yes

**ENDPOINT**: `[POST] /api/ai/forecast`
File: app/api/ai/forecast/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/ai/generate-reel`
File: app/api/ai/generate-reel/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/ai/generate`
File: app/api/ai/generate/route.js
Auth Required: Yes

**ENDPOINT**: `[POST] /api/ai/identify-product`
File: app/api/ai/identify-product/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/ai/insights`
File: app/api/ai/insights/route.js
Auth Required: Yes

**ENDPOINT**: `[POST] /api/ai/lead-score`
File: app/api/ai/lead-score/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/ai/marketing`
File: app/api/ai/marketing/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/ai/scan-invoice`
File: app/api/ai/scan-invoice/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/approve-employee`
File: app/api/approve-employee/route.ts
Auth Required: Yes

**ENDPOINT**: `[POST] /api/campaigns/launch`
File: app/api/campaigns/launch/route.js
Auth Required: Yes

**ENDPOINT**: `[POST] /api/config`
File: app/api/config/route.js
Auth Required: Yes

**ENDPOINT**: `[GET] /api/config`
File: app/api/config/route.js
Auth Required: Yes

**ENDPOINT**: `[POST] /api/cron/followups`
File: app/api/cron/followups/route.js
Auth Required: Yes

**ENDPOINT**: `[POST] /api/deep-lead-intel`
File: app/api/deep-lead-intel/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/generate-strategy`
File: app/api/generate-strategy/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/leadgen`
File: app/api/leadgen/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/messages/send`
File: app/api/messages/send/route.js
Auth Required: Yes

**ENDPOINT**: `[POST] /api/scrape-leads`
File: app/api/scrape-leads/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/scrape-trends`
File: app/api/scrape-trends/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/scrape/discover`
File: app/api/scrape/discover/route.js
Auth Required: Yes

**ENDPOINT**: `[POST] /api/scrape/enrich`
File: app/api/scrape/enrich/route.js
Auth Required: Yes

**ENDPOINT**: `[POST] /api/scrape`
File: app/api/scrape/route.js
Auth Required: Yes

**ENDPOINT**: `[POST] /api/service-email`
File: app/api/service-email/route.ts
Auth Required: No

**ENDPOINT**: `[POST] /api/webhooks/inbound`
File: app/api/webhooks/inbound/route.js
Auth Required: Yes

**ENDPOINT**: `[GET] /api/webhooks/whatsapp`
File: app/api/webhooks/whatsapp/route.ts
Auth Required: Yes

**ENDPOINT**: `[POST] /api/webhooks/whatsapp`
File: app/api/webhooks/whatsapp/route.ts
Auth Required: Yes


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6: FRONTEND PAGES & ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**PAGE**: `/admin`
File: app/admin/page.tsx

**PAGE**: `/auth/employee-login`
File: app/auth/employee-login/page.tsx

**PAGE**: `/auth/employee-signup`
File: app/auth/employee-signup/page.tsx

**PAGE**: `/auth/login`
File: app/auth/login/page.tsx

**PAGE**: `/auth/owner-login`
File: app/auth/owner-login/page.tsx

**PAGE**: `/auth/owner-signup`
File: app/auth/owner-signup/page.tsx

**PAGE**: `/auth/redirect`
File: app/auth/redirect/page.tsx

**PAGE**: `/dashboard/accounting`
File: app/dashboard/accounting/page.tsx

**PAGE**: `/dashboard/ai-intelligence`
File: app/dashboard/ai-intelligence/page.tsx

**PAGE**: `/dashboard/ai-marketing`
File: app/dashboard/ai-marketing/page.tsx

**PAGE**: `/dashboard/automation`
File: app/dashboard/automation/page.tsx

**PAGE**: `/dashboard/crm-founder`
File: app/dashboard/crm-founder/page.tsx

**PAGE**: `/dashboard/crm`
File: app/dashboard/crm/page.tsx

**PAGE**: `/dashboard/employees`
File: app/dashboard/employees/page.tsx

**PAGE**: `/dashboard/helpdesk`
File: app/dashboard/helpdesk/page.tsx

**PAGE**: `/dashboard/inbox`
File: app/dashboard/inbox/page.tsx

**PAGE**: `/dashboard/inventory`
File: app/dashboard/inventory/page.tsx

**PAGE**: `/dashboard/multi-store`
File: app/dashboard/multi-store/page.tsx

**PAGE**: `/dashboard/overview`
File: app/dashboard/overview/page.tsx

**PAGE**: `/dashboard/profile`
File: app/dashboard/profile/page.tsx

**PAGE**: `/dashboard/sales`
File: app/dashboard/sales/page.tsx

**PAGE**: `/dashboard/settings/communications`
File: app/dashboard/settings/communications/page.tsx

**PAGE**: `/dashboard/settings`
File: app/dashboard/settings/page.tsx

**PAGE**: `/dashboard/store-connect`
File: app/dashboard/store-connect/page.tsx

**PAGE**: `/marketing`
File: app/marketing/page.tsx

**PAGE**: `/page.tsx`
File: app/page.tsx

**PAGE**: `/receipt/[id]`
File: app/receipt/[id]/page.tsx

**PAGE**: `/request-access`
File: app/request-access/page.tsx


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7: COMPONENTS LIBRARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- components/accounting/invoice-design-studio.tsx
- components/ai-marketing/IdeaCard.tsx
- components/ai-marketing/SceneScript.tsx
- components/ai-marketing/StrategyBlock.tsx
- components/ai-marketing/TrendBanner.tsx
- components/ai-marketing/TrendResearch.tsx
- components/alerts/alert-center.tsx
- components/crm/activity-timeline.tsx
- components/crm/pipeline-board.tsx
- components/dashboard-nav.tsx
- components/dashboard-overview.tsx
- components/founder-crm/AddLeadModal.jsx
- components/founder-crm/Auth.jsx
- components/founder-crm/AutomationHub.jsx
- components/founder-crm/CSVImport.jsx
- components/founder-crm/Dashboard.jsx
- components/founder-crm/GlobalInbox.jsx
- components/founder-crm/KanbanBoard.jsx
- components/founder-crm/LeadManagement.jsx
- components/founder-crm/LeadScraper.jsx
- components/founder-crm/Settings.jsx
- components/founder-crm/UnifiedInbox.jsx
- components/impersonation-banner.tsx
- components/theme-provider.tsx
- components/ui/adaptive-table.tsx
- components/ui/alert-dialog.tsx
- components/ui/alert.tsx
- components/ui/avatar.tsx
- components/ui/badge.tsx
- components/ui/breadcrumb.tsx
- components/ui/button-group.tsx
- components/ui/button.tsx
- components/ui/calendar.tsx
- components/ui/card.tsx
- components/ui/chart.tsx
- components/ui/checkbox.tsx
- components/ui/collapsible.tsx
- components/ui/command.tsx
- components/ui/dialog.tsx
- components/ui/drawer.tsx
- components/ui/dropdown-menu.tsx
- components/ui/empty.tsx
- components/ui/field.tsx
- components/ui/form.tsx
- components/ui/input-group.tsx
- components/ui/input.tsx
- components/ui/item.tsx
- components/ui/kbd.tsx
- components/ui/label.tsx
- components/ui/pagination.tsx
- components/ui/popover.tsx
- components/ui/progress.tsx
- components/ui/radio-group.tsx
- components/ui/scroll-area.tsx
- components/ui/select.tsx
- components/ui/separator.tsx
- components/ui/sheet.tsx
- components/ui/skeleton.tsx
- components/ui/sonner.tsx
- components/ui/spinner.tsx
- components/ui/switch.tsx
- components/ui/table.tsx
- components/ui/tabs.tsx
- components/ui/textarea.tsx
- components/ui/toast.tsx
- components/ui/toaster.tsx
- components/ui/tooltip.tsx
- components/ui/use-mobile.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8-14: FEATURES, AUTH, CODE QUALITY & SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*(Automatically extracted analysis)*

## Dead Code / TODOs
- app/api/ai/marketing/route.ts: contains 1 console.logs
- app/api/approve-employee/route.ts: contains 6 console.logs
- app/api/deep-lead-intel/route.ts: contains 3 console.logs
- app/api/leadgen/route.ts: contains 3 console.logs
- app/api/scrape-leads/route.ts: contains 2 console.logs
- app/api/scrape/discover/route.js: contains 1 console.logs
- app/api/scrape/enrich/route.js: contains 1 console.logs
- app/api/scrape/route.js: contains 3 console.logs
- app/api/webhooks/inbound/route.js: contains 2 console.logs
- app/auth/employee-signup/page.tsx: TODO: Re-enable owner validation once RLS policies are updated
- app/dashboard/employees/page.tsx: contains 7 console.logs
- app/dashboard/store-connect/page.tsx: contains 2 console.logs
- lib/ai.js: contains 1 console.logs
- lib/hooks/use-business-context.tsx: contains 2 console.logs
- lib/hooks/use-realtime.ts: contains 2 console.logs
- lib/services/currency.ts: contains 1 console.logs

## SUMMARY DASHBOARD
OVERALL HEALTH SCORE: 75/100
- Total files: 241
- Total lines of code: ~35159