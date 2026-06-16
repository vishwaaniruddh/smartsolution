# Graph Report - .  (2026-06-16)

## Corpus Check
- 83 files · ~185,973 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 178 nodes · 283 edges · 34 communities (31 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend Feature Pages|Frontend Feature Pages]]
- [[_COMMUNITY_Core Frontend & Authentication|Core Frontend & Authentication]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Leads & Users Frontend Management|Leads & Users Frontend Management]]
- [[_COMMUNITY_Workplace Dashboards & Contacts|Workplace Dashboards & Contacts]]
- [[_COMMUNITY_Dynamic Lead Form Controls|Dynamic Lead Form Controls]]
- [[_COMMUNITY_App Layout Shell|App Layout Shell]]
- [[_COMMUNITY_Core Backend Database & Mailing|Core Backend Database & Mailing]]
- [[_COMMUNITY_Frontend Help Center|Frontend Help Center]]
- [[_COMMUNITY_Backend Composer Config|Backend Composer Config]]

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 39 edges
2. `apiBaseUrl` - 28 edges
3. `useConfirm()` - 9 edges
4. `basePath` - 9 edges
5. `scripts` - 5 edges
6. `LeadsTable()` - 4 edges
7. `LeadSources()` - 3 edges
8. `Sales()` - 3 edges
9. `SAMyLeads()` - 3 edges
10. `Users()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `SelectApp()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/pages/SelectApp.jsx → frontend/src/components/NotificationContext.jsx
- `TenantReports()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/features/superadmin/pages/TenantReports.jsx → frontend/src/components/NotificationContext.jsx
- `Tenants()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/features/superadmin/pages/Tenants.jsx → frontend/src/components/NotificationContext.jsx
- `getMailer()` --calls--> `getTenantId()`  [INFERRED]
  api/core/mailer.php → api/core/db.php
- `Apps()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/features/superadmin/pages/Apps.jsx → frontend/src/components/NotificationContext.jsx

## Import Cycles
- None detected.

## Communities (34 total, 3 thin omitted)

### Community 0 - "Frontend Feature Pages"
Cohesion: 0.11
Nodes (19): NotificationContext, NotificationProvider(), useToast(), Apps(), appsList, Attendance(), statusConfig, statusOptions (+11 more)

### Community 1 - "Core Frontend & Authentication"
Cohesion: 0.12
Nodes (7): appsData, SelectApp(), currenciesList, TenantReports(), currenciesList, Tenants(), basePath

### Community 2 - "Frontend Dependencies"
Cohesion: 0.08
Nodes (24): dependencies, lucide-react, react, react-dom, react-router-dom, devDependencies, eslint, @eslint/js (+16 more)

### Community 3 - "Leads & Users Frontend Management"
Cohesion: 0.15
Nodes (7): useConfirm(), LeadSources(), getStatusClass(), LeadsTable(), Sales(), defaultUsers, Users()

### Community 5 - "Dynamic Lead Form Controls"
Cohesion: 0.20
Nodes (3): customForms, getStatusClass(), SAMyLeads()

### Community 7 - "App Layout Shell"
Cohesion: 0.33
Nodes (4): adminNavItems, hrmsNavItems, saNavItems, superadminNavItems

### Community 9 - "Frontend Help Center"
Cohesion: 0.40
Nodes (3): articles, categories, forums

## Knowledge Gaps
- **41 isolated node(s):** `phpmailer/phpmailer`, `name`, `private`, `version`, `type` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiBaseUrl` connect `Workplace Dashboards & Contacts` to `Frontend Feature Pages`, `Core Frontend & Authentication`, `Leads & Users Frontend Management`, `Dynamic Lead Form Controls`, `CRM Report Analytics`, `App Layout Shell`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Frontend Feature Pages` to `Core Frontend & Authentication`, `Leads & Users Frontend Management`, `Dynamic Lead Form Controls`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `phpmailer/phpmailer`, `name`, `private` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Feature Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.11182795698924732 - nodes in this community are weakly interconnected._
- **Should `Core Frontend & Authentication` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Workplace Dashboards & Contacts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._