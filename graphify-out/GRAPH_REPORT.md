# Graph Report - c:\xampp\htdocs\lead  (2026-06-22)

## Corpus Check
- 209 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 455 nodes · 803 edges · 112 communities (110 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 15|Community 15]]

## God Nodes (most connected - your core abstractions)
1. `apiBaseUrl` - 62 edges
2. `useToast()` - 55 edges
3. `useAuth()` - 42 edges
4. `useConfirm()` - 25 edges
5. `useCRM()` - 21 edges
6. `useInventory()` - 19 edges
7. `useHRMS()` - 18 edges
8. `useAccounting()` - 15 edges
9. `basePath` - 12 edges
10. `useSettings()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/context/AuthContext.jsx
- `RootRedirect()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/context/AuthContext.jsx
- `useToast()` --calls--> `TenantReports()`  [EXTRACTED]
  frontend/src/components/NotificationContext.jsx → frontend/src/features/superadmin/pages/TenantReports.jsx
- `getTenantId()` --calls--> `getBearerToken()`  [INFERRED]
  api/core/db.php → api/core/jwt.php
- `getTenantId()` --calls--> `jwt_decode()`  [INFERRED]
  api/core/db.php → api/core/jwt.php

## Import Cycles
- None detected.

## Communities (112 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (29): ChatWidget(), customForms, SettingsContext, SettingsProvider(), useSettings(), AuthContext, useAuth(), accountingNavItems (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (18): NotificationContext, useConfirm(), AccountingContext, useAccounting(), AccountingDashboard(), Bills(), ChartOfAccounts(), FinancialStatements() (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (20): NotificationProvider(), AccountingProvider(), AuthProvider(), InventoryProvider(), ServiceDeskContext, ServiceDeskProvider(), useServiceDesk(), colors (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (21): useToast(), HRMSContext, HRMSProvider(), useHRMS(), AppPricingModal(), Apps(), appsList, appVisuals (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (13): CRMContext, CRMProvider(), useCRM(), Dashboard(), getStatusClass(), LeadsTable(), Pipeline(), RevenueChart() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (25): dependencies, lucide-react, react, react-dom, react-router-dom, xlsx, devDependencies, eslint (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (12): InventoryContext, useInventory(), CourierTracker(), InventoryBulk(), InventoryDashboard(), Products(), PurchaseOrders(), SalesOrders() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (12): getCurrentEmployeeId(), getCurrentUserContext(), getTenantId(), base64url_decode(), base64url_encode(), getBearerToken(), jwt_decode(), jwt_encode() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (15): API_KEY, executionArgs, additionalInstruction, envs, projectName, projectPath, serverMode, testIds (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (14): code_summary, features, known_limitations, routes, tech_stack, type, version, core_goals (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.28
Nodes (4): compareColumns(), compareIndexes(), getColumns(), getIndexes()

### Community 12 - "Community 12"
Cohesion: 0.40
Nodes (3): articles, categories, forums

## Knowledge Gaps
- **90 isolated node(s):** `phpmailer/phpmailer`, `name`, `private`, `version`, `type` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiBaseUrl` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `phpmailer/phpmailer`, `name`, `private` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06638714185883997 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11153846153846154 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07301587301587302 - nodes in this community are weakly interconnected._