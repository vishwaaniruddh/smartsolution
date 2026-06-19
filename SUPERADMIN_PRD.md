# Superadmin Role — Product Requirements Document (PRD)

## 1. Overview
The Superadmin is the highest-level administrative role in the SAR Workforce multi-tenant enterprise platform. The Superadmin is responsible for platform-wide management, including provisioning new tenants (organizations), configuring tenant access to various application modules (apps), and monitoring overall platform analytics. 

**Access Level:** Platform-wide
**Key Responsibilities:** Tenant creation, app provisioning, tenant impersonation, and global analytics.

## 2. Authentication & Navigation
- **Login Route:** `/login` (Shared login page. Post-login routing redirects Superadmins to `/superadmin/tenants`).
- **Logout:** Clears all session data (`localStorage` keys) and returns to the login page.
- **Sidebar Navigation:**
  - Tenants Management (`/superadmin/tenants`)
  - Tenant Reports/Analytics (`/superadmin/analytics`)
  - Apps Catalog (`/superadmin/apps`)
  - Settings (`/settings`)

## 3. Core Features & Capabilities

### 3.1 Tenants Management (`/superadmin/tenants`)
The central command center for the Superadmin to oversee all organizations using the platform.

**Summary Widgets:**
- Total Organizations count
- Active Tenants count
- Suspended count
- Tenants with Admins count

**Tenant Directory Table:**
- Displays Organization Name & ID, Status, Primary Administrator, Provisioned Applications, Currency, and Registration Date.
- **Actions:**
  - **Settings (⚙):** Open the tenant configuration modal to edit Organization Details and SMTP settings.
  - **Suspend/Activate:** Toggle the active status of a tenant (with confirmation dialog). Suspended tenants cannot log in.
  - **Impersonate:** Temporarily log in as the tenant's primary admin to troubleshoot or configure the tenant.

**Create Tenant Modal:**
- Allows the Superadmin to create a new organization.
- **Inputs:** Organization Name, App Selection (CRM, HRMS, Accounting, Inventory, Service Desk).
- **Admin Details:** First Name, Last Name, Email Address, Initial Password.
- **Flow:** Creates the tenant, provisions the selected apps, creates the initial Admin user, and sends an onboarding email with login credentials.

**Tenant Configuration Modal (Settings ⚙):**
- **Organization Tab:** Edit Company Name, Currency Setting, and toggle App Provisioning.
- **SMTP Tab:** Configure the tenant's custom SMTP server for outgoing emails. Includes functionality to test the connection and send a test email.

### 3.2 Tenant Impersonation Flow
Allows the Superadmin to provide hands-on support to tenants.
1. Superadmin clicks "Impersonate" on an active tenant.
2. The current superadmin session is securely stored.
3. The session is temporarily overwritten with the tenant admin's session data.
4. An amber warning banner appears across the top of the UI: "⚠️ You are currently impersonating **{TenantName}**".
5. The Superadmin can interact with the tenant's data as the Admin.
6. A "Return to Superadmin" button is available in the banner to quickly restore the original superadmin session.

### 3.3 Tenant Reports & Analytics (`/superadmin/analytics`)
Aggregated platform-wide analytics.
- Visualizes data across all tenants using charts and KPIs.
- Metrics include tenant growth, app adoption rates, and overall platform usage.

### 3.4 Apps Catalog (`/superadmin/apps`)
A directory of all available modules in the SAR Workforce ecosystem.
- Displays summary widgets for Total Cataloged Modules and Active Enterprise Licenses.
- Filterable grid of app cards showing the App Icon, Name, Category, Description, and Status.

### 3.5 Superadmin Settings (`/settings`)
Personal settings for the Superadmin user.
- **Profile Tab:** Edit First Name, Last Name, Email, Contact, Gender, and Address.
- **Security Tab:** Change account password.
- *Note:* Company and SMTP tabs are hidden from the Superadmin's personal settings, as those are tenant-scoped.

## 4. Test Scenarios Matrix

| # | Test Scenario | Steps | Expected Result |
|:---|:---|:---|:---|
| SA-01 | Superadmin Login | Enter superadmin credentials → Submit | Redirect to `/superadmin/tenants` |
| SA-02 | View Tenant Directory | Login as Superadmin | See tenant table with metrics widgets |
| SA-03 | Create New Tenant | Click "Add Tenant" → Fill org name, admin details, select apps → Submit | New tenant + admin created, onboarding email sent |
| SA-04 | Create Tenant - Validation | Submit empty form | Error messages for required fields |
| SA-05 | Create Tenant - Duplicate Email | Use existing email | Error: "Email address already registered" |
| SA-06 | Edit Tenant Settings | Click ⚙ → Change company name, currency, apps → Save | Tenant updated successfully |
| SA-07 | Suspend Tenant | Click "Suspend" on active tenant → Confirm | Tenant marked suspended, row shows at 65% opacity |
| SA-08 | Activate Tenant | Click "Activate" on suspended tenant → Confirm | Tenant reactivated |
| SA-09 | Impersonate Tenant Admin | Click "Impersonate" on active tenant with admin | Session switches to tenant admin, amber banner visible |
| SA-10 | Return from Impersonation | Click "Return to Superadmin" | Session restored, back to `/superadmin/tenants` |
| SA-11 | Configure Tenant SMTP | Open config modal → SMTP tab → Fill fields → Test Connection | "SMTP Connection successful!" toast |
| SA-12 | Send Test Email | SMTP tab → Send Test Email → Enter recipient → Send | "Test email sent successfully!" |
| SA-13 | Search Tenants | Type in search box | Filters by tenant name, admin name, or email |
| SA-14 | View Tenant Reports | Navigate to `/superadmin/analytics` | Analytics page loads with tenant-level data |
| SA-15 | View Apps Catalog | Navigate to `/superadmin/apps` | Shows all 5 module cards with status |
| SA-16 | Filter Apps | Click "Active" / "Available" tabs | Cards filter correctly |
| SA-17 | Superadmin Settings | Navigate to Settings | Only Profile + Security tabs visible |
