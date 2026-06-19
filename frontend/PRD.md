# SAR Workforce — Superadmin PRD
## For Targeted TestSprite Automated Testing

**Application Name:** SAR Workforce  
**Version:** Production (June 2026)  
**Application Type:** Multi-Tenant SaaS Enterprise Resource Planning  
**Frontend:** React SPA (Vite + React Router)  
**Backend:** PHP REST API (MySQL)  

---

## 1. Scope of this Document

This PRD specifically outlines the functionalities accessible to the **Superadmin** role. 
Because the Superadmin user is not tied to any specific tenant organization, their capabilities are strictly limited to platform-wide administration. They cannot directly access tenant-scoped workspaces (CRM, HRMS, Inventory, etc.) without first initiating an "Impersonation" session.

---

## 2. Authentication & Session Management

### 2.1 Login Page
**Route:** `/login`  
**API Endpoint:** `POST /api/auth`

**Page Elements:**
- Email input field
- Password input field
- "Log In" submit button with loading state
- Error message banner on failure

**Login Flow:**
1. Superadmin enters their global credentials.
2. System calls `POST /api/auth`.
3. On success, session stored in `localStorage` (`crm_user`, `crm_active_role`).
4. Superadmin is routed directly to `/superadmin/tenants`.

### 2.2 Logout
**Action:** Clears all localStorage keys and redirects to `/login`.

---

## 3. Superadmin Console

> [!IMPORTANT]
> **Access:** These pages are strictly limited to the `Superadmin` role. 

### 3.1 Tenants Management
**Route:** `/superadmin/tenants`  
**API:** `GET/POST/PUT/DELETE /api/tenants`

**Page Elements:**
- **Summary Widgets:** Total Organizations, Active Tenants, Suspended, Tenants with Admins.
- **Toolbar:** Search input, "Add Tenant" button.
- **Tenant Directory Table:** Shows Organization Name, Status, Primary Administrator, Provisioned Applications, Currency, and Actions.

**Actions per row:**
- **Settings (⚙):** Opens the Tenant Config modal.
- **Suspend/Activate:** Toggles `is_deleted` flag.
- **Impersonate:** Starts an impersonation session for that tenant.

#### 3.1.1 Create Tenant Modal
**Trigger:** "Add Tenant" button  
**Form Fields:**
- Organization Name (text, required)
- Apps Selection (checkboxes: CRM, HRMS, Accounting, Inventory, Service Desk)
- Admin Details: First Name, Last Name, Email Address, Initial Password (all required)

**Submit Action:**
1. Validates all required fields.
2. `POST /api/tenants` creates the tenant and the initial admin user.
3. Provisions the selected apps.

#### 3.1.2 Tenant Config Modal
**Trigger:** Settings button  
**Tabs:** Organization | SMTP
- **Organization Tab:** Allows updating Company Name, Currency, and adding/removing App provisioning.
- **SMTP Tab:** Allows configuring custom SMTP settings for the tenant (Host, Port, Credentials) and sending a test email.

#### 3.1.3 Impersonation Flow
1. Superadmin clicks "Impersonate" on an active tenant.
2. Current superadmin session is saved to `crm_superadmin_user`.
3. Session is temporarily overwritten with the tenant admin's data.
4. User is redirected into the tenant's workspace.
5. An amber banner appears at the top: "⚠️ You are currently impersonating {TenantName}".
6. "Return to Superadmin" button restores original session and returns to the Superadmin Console.

### 3.2 Tenant Reports & Analytics
**Route:** `/superadmin/analytics`  
**API:** `GET /api/superadmin_analytics`

Displays aggregated analytics across all tenants using charts and KPIs to monitor platform-wide health.

### 3.3 Apps Catalog
**Route:** `/superadmin/apps`

**Page Elements:**
- Summary widgets for Total Cataloged Modules and Active Licenses.
- Filter tabs: All Modules | Active | Available.
- Grid of app cards showing app details and status badges.

---

## 4. Test Scenarios for Superadmin

| ID | Title | Description | Category | Priority |
|:---|:---|:---|:---|:---|
| SA-001 | Superadmin Login | Superadmin can log in and is routed to the tenants directory. | Authentication | High |
| SA-002 | View Tenants Directory | Superadmin sees a list of all tenants and summary KPIs. | Tenant Management | High |
| SA-003 | Create New Tenant | Superadmin successfully creates a new tenant and its primary admin user. | Tenant Management | High |
| SA-004 | Update Tenant Apps | Superadmin modifies a tenant's provisioned apps via the Settings modal. | Tenant Management | High |
| SA-005 | Configure Tenant SMTP | Superadmin can view and update SMTP configurations for a specific tenant. | Tenant Management | Medium |
| SA-006 | Toggle Tenant Status | Superadmin can suspend and reactivate a tenant. | Tenant Management | High |
| SA-007 | View Platform Analytics | Superadmin can navigate to the analytics dashboard and view aggregated charts. | Analytics | Medium |
| SA-008 | View Apps Catalog | Superadmin can view the catalog of available apps and their statuses. | Apps Catalog | Low |
| SA-009 | Impersonation Entry | Superadmin can initiate an impersonation session and see the impersonation warning banner. | Impersonation | High |
| SA-010 | Impersonation Exit | Superadmin can end an impersonation session and return to the superadmin console. | Impersonation | High |
