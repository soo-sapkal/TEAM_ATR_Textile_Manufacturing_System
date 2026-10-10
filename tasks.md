# Task 1 - GJ: Inventory Receive & Movement Ledger Updates

**Context & Requirements:**

1. **Fix Inventory Receive Persistence:** 
   When a supervisor attempts to receive inventory on the `/inventory/receive` page, the data is currently not saved to the backend. Instead, a toast notification appears stating: "Demo state only; not persisted. Session-only demo state; refresh to reset."
   - **Action:** Update the submission logic to persist the entered data to the actual database (e.g., Supabase API) so that records are permanently saved.

2. **Form Fields & Prefilling:** 
   The inventory receive form currently prefills several fields automatically.
   - **Action:** Remove all default values and prefilled data from the form. The **only exceptions** that should remain prefilled are the **Date**, **Time**, and **one checkbox**. All other fields must start empty.

3. **Update Movement Ledger:** 
   The movement ledger currently lacks visibility into movements specifically directed to the spinning machine.
   - **Action:** Update the movement ledger view/component to explicitly track and display the quantities of materials moved *to* the spinning machine.

---

# Task 2 - GJ: Production Order Details Modal

**Context & Requirements:**

1. **Order Details Modal in Production View:**
   Currently, when a supervisor is logged in and navigates to `/production`, clicking on any order redirects them to a new dedicated order details page.
   - **Action:** Intercept this click and instead open a **Modal** on the same `/production` page.
   - The modal should display all the necessary order information.
   - **UI Requirement:** Use a tabbed interface (multiple tabs) within the modal to organize the order information cleanly.
   - **Important Constraint:** Do **NOT** delete the existing order-specific page. The separate page should remain intact and functional; just change the behavior of the order link on the `/production` page to trigger the modal instead.

---

# Task 3 - GJ: Final Goods Inventory (Rolls Page Redesign)

**Context & Requirements:**
Redesign the `/rolls` page from scratch into a **Final Goods Inventory** dashboard. Shift the focus to high-level available inventory while still providing roll-level details.

1. **Page Title & KPIs:**
   - Update the title to "Checked Final Goods" or "Final Goods Inventory".
   - Add KPI summary cards at the top (e.g., Total Available Quantity, Total Rolls in Stock, Pending Dispatch).

2. **Product-Wise Aggregation (Core Feature):**
   - Group the inventory by Product/SKU so users can see aggregate availability per fabric type.
   - For each product, show the total quantity available, total roll count, and a quality breakdown (e.g., Grade A vs. Grade B).
   - Implement an interactive UI (like an accordion) where clicking a product expands to reveal the specific rolls of that type.

3. **Detailed Rolls List:**
   - Provide a granular table of individual physical rolls for warehouse operations.
   - Required columns: Roll ID / Barcode, Product Name, Quantity, Quality Grade, Location, Status (Available/Allocated/Dispatched), and Date Produced.

4. **Features & Actions:**
   - Add robust Search (by Roll ID or Product Name) and Filters (by Quality Grade and Status).
   - Add action buttons per roll (e.g., "Allocate to Order", "Print Label", "Change Status").

5. **Design System:**
   - Follow the **Neobrutalist** aesthetic used across this branch (e.g., thick black borders, stark contrasting colors, sharp drop shadows).
