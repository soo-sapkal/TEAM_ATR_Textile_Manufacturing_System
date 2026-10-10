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

---

# Task 6 - Uday: Buyer Dashboard Redesign

**Context & Requirements:**
The current `DashboardPage.tsx` acts as a catch-all dashboard that conditionally hides internal data from the Buyer. Now that roles have separated dashboards (`app/(roles)/buyer/dashboard/page.tsx`), the Buyer needs a dedicated B2B Customer Portal interface, completely free of internal factory metrics.

**What to Remove (Currently visible but inappropriate for Buyers):**
1. **Global Order Data:** Remove "Orders to keep in view" and "Orders at risk" cards that show all factory orders. Buyers must strictly see only their own data.
2. **Shift & Factory Meta-data:** Remove headers showing "SHIFT B", "Asia/Kolkata", and "The mill, at a glance".
3. **Internal Terminology:** Remove any references to "Operations", "Cost basis", "Alerts", or "Needs a person".
4. **Global Production States:** Remove yarn availability and machine status (to protect capacity secrets).

**What to Add (New features for the Buyer Dashboard):**
1. **Personalized Welcome & Account Summary:**
   - A welcoming header (e.g., *"Welcome back, Anita Textiles."*) and account manager contact info.
2. **Customer-Specific KPIs (Stat Cards):**
   - **Active Orders:** Count of orders currently in progress.
   - **Ready for Dispatch:** Orders completed and waiting for logistics.
   - **Outstanding Balance:** Current financial ledger balance or pending invoices.
3. **"Track My Orders" Widget:**
   - A visual progress list of *only their* orders with customer-friendly progress bars (e.g., "In Production -> 60% Complete").
   - Display clear Estimated Delivery Dates (EDD).
4. **Quick Actions Panel:**
   - Prominent **"Place New Order"** button.
   - Links to "View Product/Yarn Catalog" and "Download Account Statement".
5. **Recent Shipments & Logistics:**
   - A section showing recently dispatched trucks containing their goods, along with links to download Dispatch Manifests or Invoices.

---

# Task 7 - Uday: Remove Sidebar UI Toggles

**Context & Requirements:**
The current `StaffShell.tsx` and related layout components have toggles at the bottom of the sidebar for "Floor mode" and "Motion".

1. **Remove UI Toggles:** 
   - Remove the "Floor mode" toggle button from all sidebars.
   - Remove the "Motion" toggle button from all sidebars.
2. **Clean Up State/Logic:**
   - Remove any associated React state (`floorMode`, `motionMode`) and DOM dataset manipulation from `StaffShell.tsx` since they will no longer be used.


---

# Task 8 - Uday: Dispatch Officer Enhancements & Fulfillment Workflow

**Context & Requirements:**
The Dispatch Officer needs a streamlined experience without duplicate pages, plus a complete fulfillment workflow from scanning final QC to printing the vehicle invoice.

1. **Delete Redundant Page:**
   - Delete the `app/(roles)/dispatch/shipments` page as it duplicates the dashboard.

2. **Final Quality Report Scan Page:**
   - Add a new page where the Dispatch Officer can scan barcode/roll IDs and fill out a final pre-dispatch quality report.
   - *DB Analysis Note:* The current `FabricRoll` table only has a basic `defect` field. We will likely need to add `dispatchQcPassed` (boolean), `dispatchQcNotes` (text), and `dispatchQcBy` (uuid) to Supabase to support this step fully.

3. **Fulfillment Dashboard & Workflow:**
   - Create a page showing "Pending Orders" (needing fulfillment) and "Completed Orders".
   - On pending orders, add a **"Fulfill"** button that triggers a multi-step workflow:
     - **Step 1 (Loading Manifest):** Displays a downloadable/printable list of the exact rolls/items needed to be loaded into the transport vehicle.
     - **Step 2 (Vehicle Details):** A form asking for transport details.
       - *DB Analysis Note:* The current `Shipment` table only has a generic `vehicle` string. We need to add `driverName`, `licensePlate`, `transportAgency`, and `ewayBillNumber` to the Supabase schema.
     - **Step 3 (Invoice Generation):** Generates a final printable invoice / gate pass for the vehicle containing all order, item, and transport details.

# Task 9 - Uday: Dispatch Deadline Tracking

**Context & Requirements:**
In addition to the fulfillment workflow, the Dispatch Officer needs to proactively manage upcoming deadlines to avoid late deliveries.

1. **Urgent Deadlines Widget:**
   - Add a widget/KPI card on the Dispatch Dashboard highlighting orders with approaching delivery deadlines (e.g., "Due in next 48 hours").
2. **Prioritization Flags:**
   - On the Pending Orders list, prominently flag and sort orders that have nearby deadlines so the logistics team can prioritize loading them first.

---

# Task 10 - GJ: Quality Control Dashboard Redesign

**Context & Requirements:**
The Quality team needs a dedicated dashboard under `quality/` to manage pending inspections efficiently and align their work with production deadlines.

1. **Pending Inspection Queue:**
   - Create a dedicated section/page to clearly display how much material (rolls, batches, etc.) is currently pending quality checks.
   - Show aggregate metrics (e.g., "Total Meters Pending", "Batches Awaiting Inspection").

2. **Active Orders Overview:**
   - Display the volume of active, pending orders that are waiting on quality-approved stock to proceed to dispatch.

3. **Smart Prioritization & Stock Suggestions:**
   - Add a separate "Action Required" or "Suggestions" section that explicitly tells the QC team which stock to check *first*.
   - This prioritization must be driven by the delivery deadlines of the pending orders (i.e., inspect goods needed for tomorrow's dispatch before goods needed next week).

4. **Industry-Standard QC Features (Extra Additions):**
   - **Defect Logging & Pareto Analysis:** Allow inspectors to categorize defects (e.g., stains, tears, shade variation) and display a quick chart of top defect types for the day/shift.
   - **First Time Yield (FTY) KPI:** Add a metric card showing the percentage of rolls passing QC on the first try versus needing rework.
   - **Rework Routing:** Direct integration to send failed rolls immediately to a rework queue with attached notes/reasons.
   - **Shift Performance:** Show how many inspections the current shift has completed versus their daily target.

---

# Task 11 - GJ: Cloudinary Image Storage Implementation

**Context & Requirements:**
Several areas of the application require robust image storage (e.g., quality inspection evidence, defect photos, user avatars, etc.). 

1. **Cloudinary Integration:**
   - Set up and integrate Cloudinary as the primary remote image storage solution across the entire project.
   - Ensure secure uploads from the client or server (depending on architecture constraints).

2. **Replace Local/Demo Storage:**
   - Identify all locations in the codebase where images are currently handled via local state, temporary demo storage, or mock URLs.
   - Replace these implementations with real Cloudinary upload and fetch logic.
   
3. **Optimized Delivery:**
   - Use Cloudinary's transformation APIs to ensure images are served in optimal formats and sizes (e.g., thumbnails for lists, full resolution for detailed modal views).
