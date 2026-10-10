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

---

# Task 4 - GJ: Dispatch Page Enhancements (Supervisor View)

**Context & Requirements:**
The supervisor needs better analytical and operational oversight of daily dispatches. Ensure the page provides immediate value upon opening, with tools to dig deeper.

1. **Navbar Visibility:**
   - Ensure the "Dispatch" page link is correctly displayed and easily accessible in the Supervisor's navigation bar.

2. **Timeframe Analysis (Default to Today):**
   - The page must default to showing **Today's Data** (shipments scheduled, pending, or completed today).
   - Add a prominent timeframe selector (e.g., tabs or a dropdown) to analyze other periods: "Yesterday", "This Week", "This Month", and "Custom Range".

3. **Supervisor-Specific Enhancements & KPIs:**
   - **KPI Cards:** Add top-level metrics showing:
     - *Fulfillment Rate:* Pending vs. Completed dispatches for the selected timeframe.
     - *Volume:* Total quantity (meters/yards) and total rolls dispatched.
     - *Urgent/Delayed:* Count of shipments that have missed their scheduled slot.
   - **Visual Flags (Neobrutalism):** Use stark, aggressive styling (e.g., thick red borders or loud caution backgrounds) to highlight delayed shipments so they cannot be missed.
   - **Gate Pass / Manifest Generation:** Add an action button allowing the supervisor to generate or print a consolidated "Daily Dispatch Manifest" for the logistics/gate team.

---

# Task 5 - GJ: Role-Specific Enhancements

**Context & Requirements:**
Implement the following specific features for each role to support the factory's physical workflow:

1. **Machine Operator additions:**
   - **Skill-Gating:** In the operator dashboard, add logic so the operator *only* sees tasks that match their assigned skill (e.g., a weaver never sees dyeing tasks).
   - **Machine Handover / Breakdown:** Add a feature where an operator can report a machine breakdown directly from their task screen, instantly alerting the Supervisor.

2. **Supervisor additions:**
   - **WIP (Work In Progress) Tracking:** Add a section in inventory to see how much material is currently sitting in the buffer zones (e.g., waiting for weaving, waiting for dyeing).
   - **Task Dependencies:** When assigning tasks, add a warning if they try to assign a downstream task when there isn't enough upstream material ready (e.g., weaving without enough spun yarn).

3. **Dispatch Officer additions:**
   - **Partial Dispatching:** Update the dispatch orders page to handle partial deliveries (e.g., if a customer ordered 1000m, but only 500m passed quality today, allow the officer to dispatch the available half).

4. **Quality Inspector additions:**
   - **Rework Workflow:** Update the quality inspection page so that if a dyed roll fails quality, there is an explicit "Send to Rework" option that routes the material back to the dyeing or weaving queue, rather than just Pass/Fail.
