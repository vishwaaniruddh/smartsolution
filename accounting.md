# Double-Entry Accounting Module Documentation

Welcome to the **Accounting & Financial Management** module! This guide explains the core features, database schema, easy-to-understand terminology, and dynamic order linkages built into the system.

---

## 1. Overview & Simple Vocabulary

This module implements a standard **double-entry bookkeeping** ledger. Rather than using complex accounting jargon, the app translates terms into plain, everyday language:

| Traditional Term | Simplified App Term | What It Means |
|:---|:---|:---|
| **Journal Entry** | **Manual Adjustment** | A manual entry made to correct or record a transaction directly. |
| **Debit** | **Increase (+ Debit)** | Adds value to Assets (like Bank) or Expenses, and decreases Liabilities. |
| **Credit** | **Decrease (- Credit)** | Decreases Assets and increases Liabilities (like Accounts Payable) or Revenues. |
| **Vendor Bill** | **Supplier Bill** | A bill from a vendor or business you purchased goods/services from. |
| **Invoice** | **Customer Invoice** | A bill you send to a client/customer for sales you made. |
| **Double-entry Balance** | **Balanced Lines** | Every transaction must have matching increases and decreases. Total Debits must equal Credits. |

---

## 2. Dynamic Integrations & Order Linkage

This module is directly linked with the **Inventory and CRM (Leads)** apps, making invoicing and billing automatic:

### A. Customers & Suppliers Directory
* When creating a **Customer Invoice**, the system fetches the current leads and contacts list from the CRM database. You can pick an existing contact from the dropdown to automatically assign them to the invoice.
* When recording a **Supplier Bill**, the system pulls live supplier profiles from your registry, letting you select the correct business in one click.

### B. Link Sales Orders & Purchase Orders (1-Click Fill)
To save time and prevent manual data entry errors, you can copy order details directly into your invoices and bills:
* **Sales Orders to Invoices:** When generating an invoice, you can select any active Sales Order. The system automatically fetches the customer's name, applies the tax rate, and imports all item lines (Description, Quantity, and Price) into the invoice.
* **Purchase Orders to Bills:** When recording a supplier bill, you can select any active Purchase Order. The system copies the supplier's name and imports all line items (Description, Quantity, and Cost) directly.

---

## 3. GST (Goods & Services Tax) Options

The system supports transactions **With or Without GST**:
1. **GST Toggle Dropdown:** Available when creating Invoices and Supplier Bills. You can select rates: **Without GST (0%)**, **5%**, **12%**, **18%**, or **28%**.
2. **Dynamic Totals Calculation:** Subtotal, GST Tax Amount, and Gross Total are updated live in the editor.
3. **Automated 3-Way Journal Postings:**
   * When an **Invoice** is approved (Draft $\rightarrow$ Open), the general ledger automatically:
     * **Debits** Accounts Receivable for the *Gross Total*.
     * **Credits** Sales Revenue for the *Subtotal*.
     * **Credits** Sales Tax Payable (Account code `2200`) for the *GST Amount*.
   * When a **Supplier Bill** is approved (Draft $\rightarrow$ Open), the ledger automatically:
     * **Credits** Accounts Payable for the *Gross Total*.
     * **Debits** Inventory Purchases (or Expense) for the *Subtotal*.
     * **Debits** Sales Tax Payable (Account code `2200` - Input Tax Credit) for the *GST Amount*.

---

## 4. Cashbook, Reconciliations & Reports

* **Cashbook Transactions:** Log bank and cash receipts (inflow) or payments (outflow) under **Bank Transactions**.
* **AR/AP Payment Reconciliations:** When you pay a supplier bill or receive a payment for an invoice, the system automatically:
  * Records the cash log.
  * Decrements the due balance on the invoice or bill.
  * Marks the status as **Paid** when the balance reaches zero.
  * Auto-posts the corresponding journal lines to clear Accounts Receivable/Payable and offset Cash/Bank ledger balances.
* **Financial Reports:** Renders real-time reports:
  * **Income Statement (Profit & Loss):** Tracks operating revenues and expenses to show Net Profit.
  * **Balance Sheet:** Assets = Liabilities + Equity formula verification.
  * **Trial Balance:** Lists debit/credit balances across all ledger accounts.

---

## 5. Developer & Integration Testing

To run the automated test suite and verify double-entry logic, tax calculations, and pagination/filtering:

1. **Double-Entry & Payment Flow Verification:**
   ```cmd
   php scratch/test_accounting_flows.php
   ```
2. **GST Calculations & 3-Way Split Verification:**
   ```cmd
   php scratch/test_gst_accounting_flows.php
   ```
3. **Database-Driven Pagination & Filters Verification:**
   ```cmd
   php scratch/test_pagination_flows.php
   ```

*Note: Direct queries and requests use the primary test tenant context (`tenant_id = 3` or `tenant_id = 4`) to isolate test runs from live production data.*
