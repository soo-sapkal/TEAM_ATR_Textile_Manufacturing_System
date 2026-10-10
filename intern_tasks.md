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
