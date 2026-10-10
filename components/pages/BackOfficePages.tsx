"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Bell, BookOpenCheck, CalendarCheck2, CircleAlert, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import Decimal from "decimal.js";
import { useDemo } from "@/lib/demo/context";
import { formatDate, formatMoney, formatQty } from "@/lib/domain/format";
import { Button, Card, DataTable, EmptyState, Field, InfoStrip, Kicker, LinkButton, PageHeader, SelectInput, StatusBadge, Tag, TextArea, TextInput } from "@/components/ui/primitives";
import { Can } from "@/components/ui/Can";

export function BackOfficeRoute({ path, id }: { path: string; id?: string }) {
  if (path === "/alerts") return <AlertsPage/>;
  if (path === "/notifications") return <NotificationsPage/>;
  if (path === "/finance") return <FinancePage/>;
  if (path.startsWith("/finance/orders/")) return <OrderCostPage id={id ?? ""}/>;
  if (path === "/finance/entries") return <FinanceEntriesPage/>;
  if (path === "/finance/payments") return <PaymentsPage/>;
  if (path === "/finance/expenses") return <ExpensesPage/>;
  if (path === "/hr/attendance") return <AttendancePage/>;
  if (path.startsWith("/hr/payroll/")) return <PayrollPeriodPage id={id ?? ""}/>;
  if (path === "/hr/payroll") return <PayrollPage/>;
  if (path === "/reports/month-close") return <MonthClosePage/>;
  if (path === "/verify") return <IntegrityPage/>;
  return <ReportsPage/>;
}

function FinancePage() {
  const { data } = useDemo();
  const booked = data.orders.reduce((sum, order) => sum.plus(order.recordedCost), new Decimal(0));
  const estimated = data.orders.reduce((sum, order) => sum.plus(order.estimatedCost), new Decimal(0));
  const revenue = data.orders.reduce((sum, order) => sum.plus(order.revenue), new Decimal(0));
  const missingRates = data.machines.filter((machine) => machine.costPerHour === null);
  return <><PageHeader eyebrow="Close the books · finance desk" title="Costs with a stated basis." description="Separate posted actual, allocated overhead, estimate, and missing source rates. A missing rate is not a zero cost." actions={<><LinkButton href="/finance/entries" variant="secondary"><ReceiptText size={14}/> Cost entries</LinkButton><LinkButton href="/finance/payments" variant="secondary">Buyer payments</LinkButton><LinkButton href="/reports/month-close" variant="primary"><BookOpenCheck size={14}/> Month close</LinkButton></>} meta={<><Tag>OCTOBER 2026 · OPEN</Tag><Tag>INR · ASIA/KOLKATA</Tag></>} /><div className="stat-grid"><div className="stat-card stat-card--indigo"><div className="stat-card__top">Recorded cost · actual/allocated</div><strong>{formatMoney(booked.toFixed(2))}</strong><div className="stat-card__bottom">source rows visible</div></div><div className="stat-card stat-card--turmeric"><div className="stat-card__top">Estimated / pending</div><strong>{formatMoney(estimated.toFixed(2))}</strong><div className="stat-card__bottom">not included in actual</div></div><div className="stat-card stat-card--neem"><div className="stat-card__top">Buyer value · contracted</div><strong>{formatMoney(revenue.toFixed(2))}</strong><div className="stat-card__bottom">not cash collected</div></div><div className="stat-card stat-card--madder"><div className="stat-card__top">Missing machine rates</div><strong>{missingRates.length}</strong><div className="stat-card__bottom">not treated as zero</div></div></div><div className="page-grid"><Card className="col-8" title="Order margin, by recorded basis" action={<Link href="/finance/entries" className="btn btn--quiet btn--sm">All cost rows <ArrowRight size={12}/></Link>}><DataTable headers={["Order", "Buyer", "Contract", "Recorded cost", "Estimate", "Margin state", "Cost detail"]} rows={data.orders.map((order) => { const margin = new Decimal(order.revenue).minus(order.recordedCost); const complete = new Decimal(order.recordedCost).gt(0) && new Decimal(order.estimatedCost).eq(0); return [<Link href={`/finance/orders/${order.id}`} className="code">{order.code}</Link>, order.buyer, formatMoney(order.revenue), formatMoney(order.recordedCost), formatMoney(order.estimatedCost), <StatusBadge status={complete ? "ACTUAL" : "ESTIMATED"} label={complete ? `Recorded margin ${formatMoney(margin.toFixed(2))}` : "Incomplete basis"}/>, <Link href={`/finance/orders/${order.id}`} className="btn btn--secondary btn--sm">Detail <ArrowRight size={12}/></Link>]; })}/></Card><Card className="col-4" title="Cost coverage"><div className="stack-sm">{data.machines.map((machine) => <div key={machine.id} style={{ display: "flex", justifyContent: "space-between", gap: 9, padding: "7px 0", borderBottom: "1px solid #d4cfbd" }}><span className="code">{machine.code}</span>{machine.costPerHour ? <span className="num">{formatMoney(machine.costPerHour)}/hr</span> : <StatusBadge status="MISSING" label="Rate missing"/>}</div>)}</div><InfoStrip tone="warning">Per-machine labor/overhead allocation needs approved rates and run time. Do not substitute a default rate.</InfoStrip></Card><Card className="col-12" title="Basis policy"><div className="page-grid"><div className="col-3"><StatusBadge status="ACTUAL"/><p className="cell-secondary">Posted supplier, payroll, or direct cost event.</p></div><div className="col-3"><StatusBadge status="ALLOCATED"/><p className="cell-secondary">Overhead assigned using a documented driver.</p></div><div className="col-3"><StatusBadge status="ESTIMATED"/><p className="cell-secondary">Planning estimate; never called actual.</p></div><div className="col-3"><StatusBadge status="MISSING"/><p className="cell-secondary">No source rate/cost; remain visible as missing.</p></div></div></Card></div></>;
}

function OrderCostPage({ id }: { id: string }) {
  const { data } = useDemo();
  const order = data.orders.find((candidate) => candidate.id === id || candidate.code === id);
  if (!order) return <><PageHeader title="Order cost not found"/><EmptyState title="No order cost record"/></>;
  const rows = [
    ["Yarn issue", "ACTUAL", "Batch YB-2026-0012", "64,520.00", "KG × supplier lot unit cost"],
    ["Machine time", "ALLOCATED", "LM-01 · 8.0 hr", "11,600.00", "8.0 hr × approved rate INR 1,450/hr"],
    ["Direct labor", "ACTUAL", "Payroll period PR-2026-10A", "42,800.00", "Period-linked labor allocation"],
    ["Dye inputs", "MISSING", "Dye lot not costed", "—", "Rate missing; not assumed zero"],
  ];
  return <><PageHeader eyebrow="Finance · order cost" title={order.code} description={`${order.buyer} · ${order.product} · cost basis by source`} actions={<LinkButton href="/finance" variant="secondary"><ArrowLeft size={14}/> Finance</LinkButton>} meta={<><Tag>CONTRACT {formatMoney(order.revenue)}</Tag><StatusBadge status="ESTIMATED" label="Some basis missing"/></>} /><div className="stat-grid"><div className="stat-card stat-card--indigo"><div className="stat-card__top">Recorded cost</div><strong>{formatMoney(order.recordedCost)}</strong><div className="stat-card__bottom">posted or allocated basis</div></div><div className="stat-card stat-card--turmeric"><div className="stat-card__top">Pending estimate</div><strong>{formatMoney(order.estimatedCost)}</strong><div className="stat-card__bottom">not actual</div></div><div className="stat-card stat-card--neem"><div className="stat-card__top">Recorded margin</div><strong>{formatMoney(new Decimal(order.revenue).minus(order.recordedCost).toFixed(2))}</strong><div className="stat-card__bottom">excludes pending estimate</div></div><div className="stat-card stat-card--madder"><div className="stat-card__top">Missing inputs</div><strong>1</strong><div className="stat-card__bottom">dye lot unit cost</div></div></div><div className="page-grid"><Card className="col-8" title="Cost ledger · illustrative rows"><DataTable headers={["Source", "Basis", "Reference", "Amount", "Calculation"]} rows={rows.map(([source,basis,reference,amount,calculation]) => [source, <StatusBadge status={basis}/>, reference, amount === "—" ? amount : formatMoney(amount), calculation])}/><InfoStrip tone="warning">Rows above demonstrate the basis labels. They are not sourced from the client database, which was not attached.</InfoStrip></Card><Card className="col-4" title="Permitted finance action"><Field label="Add cost entry"><SelectInput defaultValue="DIRECT"><option value="DIRECT">Direct cost</option><option value="OVERHEAD">Overhead allocation</option><option value="CREDIT">Credit / correction</option></SelectInput></Field><Field label="Amount · INR"><TextInput inputMode="decimal" placeholder="0.00"/></Field><Field label="Source / reason"><TextArea placeholder="Supplier bill, rate basis, or correction reason…"/></Field><Can perm="finance.write"><Button variant="primary" onClick={() => window.alert("Demo only: no finance posting was created.")}>Stage cost entry</Button></Can><div className="permission-note">Cost correction is a new linked record; posted history has no edit/delete.</div></Card></div></>;
}

function FinanceEntriesPage() {
  const { data, toast, user } = useDemo();
  const [orderCode, setOrderCode] = useState(data.orders[0]?.code ?? "");
  const [amount, setAmount] = useState("");
  const [basis, setBasis] = useState("ACTUAL");
  const [source, setSource] = useState("");
  const [staged, setStaged] = useState(false);
  function submit(event: FormEvent) { event.preventDefault(); if (!new Decimal(amount || 0).gt(0) || source.trim().length < 5) { toast("Cost entry needs amount and source", "Enter positive INR amount and a source reference.", "error"); return; } setStaged(true); toast("Cost entry staged", "Demo only; no posting or general-ledger integration.", "warning"); }
  return <><PageHeader eyebrow="Finance · append-only ledger" title="Cost entries" description="Direct cost, overhead allocation, credit, source, and approval are explicit. Posted rows are immutable." actions={<LinkButton href="/finance" variant="secondary"><ArrowLeft size={14}/> Finance</LinkButton>} /><div className="two-pane"><form className="card stack" onSubmit={submit}><div className="card__head"><h2>New cost entry</h2><Tag>INR</Tag></div><div className="form-grid"><Field label="Order"><SelectInput value={orderCode} onChange={(event) => setOrderCode(event.target.value)}>{data.orders.map((order) => <option key={order.code} value={order.code}>{order.code} · {order.buyer}</option>)}</SelectInput></Field><Field label="Basis"><SelectInput value={basis} onChange={(event) => setBasis(event.target.value)}><option value="ACTUAL">Actual · source invoice/receipt</option><option value="ALLOCATED">Allocated · approved driver</option><option value="ESTIMATED">Estimate · not posted</option><option value="CREDIT">Credit / correction</option></SelectInput></Field><Field label="Amount · INR"><TextInput inputMode="decimal" pattern="\d+(\.\d{1,2})?" value={amount} onChange={(event) => setAmount(event.target.value)} required/></Field><Field label="Source reference"><TextInput value={source} onChange={(event) => setSource(event.target.value)} placeholder="Supplier invoice / payroll / rate source" required minLength={5}/></Field><Field label="Description"><TextArea placeholder="Cost class, allocation driver, and period…"/></Field><Field label="Record date"><TextInput type="date" defaultValue="2026-10-10"/></Field></div><div className="permission-note">Entered by {user?.name}. A separate person with finance.approve is required for approval where policy applies.</div><Button type="submit">Stage entry · demo</Button>{staged && <InfoStrip tone="warning">This record is in component state only and disappears on refresh.</InfoStrip>}</form><Card title="Recent entries"><DataTable headers={["Entry", "Order", "Basis", "Amount", "Reference", "Status"]} rows={data.orders.slice(0,3).map((order,index) => [`CST-2026-${String(108-index).padStart(4,"0")}`, order.code, <StatusBadge status={index===1?"ESTIMATED":"ACTUAL"}/>, formatMoney(index===1?order.estimatedCost:order.recordedCost), ["YB-2026-0012","Machine rate","Payroll PR-2026-10A"][index], <StatusBadge status={index===1?"PENDING":"APPROVED"}/>])}/><InfoStrip tone="info">A posted entry isn&apos;t edited or deleted. Append a linked reversal/correction instead.</InfoStrip></Card></div></>;
}

function PaymentsPage() {
  const { data, toast } = useDemo();
  const invoices = data.invoices || [];
  const payments = data.payments || [];
  
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("WIRE");
  const [busy, setBusy] = useState(false);

  const today = new Date();
  const pastDue = invoices.filter(inv => inv.status !== "PAID" && new Date(inv.dueDate) < today);
  const totalPastDue = pastDue.reduce((sum, inv) => sum.plus(inv.amountDue), new Decimal(0));
  const thirtyDays = pastDue.filter(inv => (today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24) <= 30);
  const thirtyDaysSum = thirtyDays.reduce((sum, inv) => sum.plus(inv.amountDue), new Decimal(0));
  
  const selectedInvoice = invoices.find(inv => inv.id === invoiceId);
  const paidAgainstSelected = payments.filter(p => p.invoiceId === invoiceId).reduce((sum, p) => sum.plus(p.amountPaid), new Decimal(0));
  const openBalance = selectedInvoice ? new Decimal(selectedInvoice.amountDue).minus(paidAgainstSelected) : new Decimal(0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !selectedInvoice) return;
    const value = new Decimal(amount || 0);
    if (value.lte(0) || value.gt(openBalance)) {
      toast("Invalid Amount", "Payment must be positive and not exceed outstanding balance.", "error");
      return;
    }
    if (reference.trim().length < 3) {
      toast("Reference Required", "A bank/UTR reference is required.", "error");
      return;
    }

    setBusy(true);
    const res = await fetch("/api/finance/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        amountPaid: amount,
        paymentMethod,
        referenceNo: reference
      })
    });
    
    if (res.ok) {
      toast("Payment Recorded", `Successfully recorded ${formatMoney(amount)}`, "success");
      setAmount("");
      setReference("");
      window.location.reload();
    } else {
      toast("Payment Failed", "Could not record payment.", "error");
    }
    setBusy(false);
  }

  return <><PageHeader eyebrow="Finance · Accounts Receivable" title="AR Dashboard & Receipts" description="Track aging invoices, view outstanding balances, and record incoming buyer payments against open invoices." actions={<LinkButton href="/finance" variant="secondary"><ArrowLeft size={14}/> Finance Desk</LinkButton>} />
  <div className="stat-grid" style={{ marginBottom: "2rem" }}>
    <div className="stat-card stat-card--madder"><div className="stat-card__top">Total Past Due</div><strong>{formatMoney(totalPastDue.toFixed(2))}</strong><div className="stat-card__bottom">{pastDue.length} invoices overdue</div></div>
    <div className="stat-card stat-card--turmeric"><div className="stat-card__top">1 - 30 Days Overdue</div><strong>{formatMoney(thirtyDaysSum.toFixed(2))}</strong><div className="stat-card__bottom">{thirtyDays.length} invoices</div></div>
    <div className="stat-card stat-card--neem"><div className="stat-card__top">Pending Invoices</div><strong>{invoices.filter(i => i.status === "PENDING").length}</strong><div className="stat-card__bottom">Awaiting any payment</div></div>
    <div className="stat-card stat-card--indigo"><div className="stat-card__top">Total Cash Collected</div><strong>{formatMoney(payments.reduce((sum, p) => sum.plus(p.amountPaid), new Decimal(0)).toFixed(2))}</strong><div className="stat-card__bottom">{payments.length} receipts</div></div>
  </div>
  <div className="two-pane">
    <form className="card stack" onSubmit={submit}>
      <div className="card__head"><h2>Record Cash Receipt</h2><Tag>LIVE RECORDING</Tag></div>
      <Field label="Open Invoice">
        <SelectInput value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)}>
          <option value="">Select invoice...</option>
          {invoices.filter(i => i.status !== "PAID").map(inv => (
            <option key={inv.id} value={inv.id}>{inv.buyerName} · {formatMoney(inv.amountDue)}</option>
          ))}
        </SelectInput>
      </Field>
      {selectedInvoice && (
        <div className="info-strip">
          <Wallet size={17}/>
          <div><strong>Outstanding balance</strong><div>{formatMoney(openBalance.toFixed(2))} remaining to collect</div></div>
        </div>
      )}
      <Field label="Amount Paid · INR"><TextInput inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={busy}/></Field>
      <div className="form-grid">
        <Field label="Method"><SelectInput value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={busy}><option value="WIRE">Bank Wire / NEFT</option><option value="CHEQUE">Cheque</option><option value="CASH">Cash</option></SelectInput></Field>
        <Field label="Bank / UTR / Receipt Ref"><TextInput value={reference} onChange={(event) => setReference(event.target.value)} required minLength={3} disabled={busy}/></Field>
      </div>
      <Button type="submit" disabled={busy || !invoiceId}>{busy ? "Recording..." : "Record Payment"}</Button>
    </form>
    <div className="stack">
      <Card title="Open Invoices">
        <DataTable headers={["Buyer", "Due Date", "Amount Due", "Status"]} rows={invoices.filter(i => i.status !== "PAID").slice(0,5).map(inv => [inv.buyerName, formatDate(inv.dueDate), formatMoney(inv.amountDue), <StatusBadge status={inv.status}/>])} empty={<EmptyState title="No open invoices"/>} />
      </Card>
      <Card title="Recent Receipts">
        <DataTable headers={["Date", "Reference", "Method", "Amount"]} rows={payments.slice(0,5).map(p => [formatDate(p.paymentDate), p.referenceNo, p.paymentMethod, formatMoney(p.amountPaid)])} empty={<EmptyState title="No receipts recorded"/>} />
      </Card>
    </div>
  </div></>;
}

function ExpensesPage() {
  const { toast } = useDemo();
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [staged, setStaged] = useState(false);
  function submit(event: FormEvent) { event.preventDefault(); if (!new Decimal(amount || 0).gt(0) || source.trim().length < 5) { toast("Expense needs an amount and source", undefined, "error"); return; } setStaged(true); toast("Expense staged", "No general-ledger record was created.", "warning"); }
  return <><PageHeader eyebrow="Finance · operating expenses" title="Expenses" description="Capture category, date, proof reference, and approval state. Posted expenses are append-only." actions={<LinkButton href="/finance" variant="secondary"><ArrowLeft size={14}/> Finance</LinkButton>} /><div className="two-pane"><form className="card stack" onSubmit={submit}><Field label="Category"><SelectInput defaultValue="UTILITIES"><option value="UTILITIES">Utilities</option><option value="MAINTENANCE">Machine maintenance</option><option value="FREIGHT">Freight</option><option value="SUPPLIES">Shop supplies</option><option value="OTHER">Other</option></SelectInput></Field><Field label="Amount · INR"><TextInput value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required/></Field><Field label="Source reference / reason"><TextArea value={source} onChange={(event) => setSource(event.target.value)} required minLength={5}/></Field><Field label="Date"><TextInput type="date" defaultValue="2026-10-10"/></Field><Button type="submit">Stage expense</Button>{staged && <InfoStrip tone="warning">Draft only. A separate finance.approve actor must approve if required by policy.</InfoStrip>}</form><Card title="Expense record"><DataTable headers={["Expense", "Category", "Date", "Amount", "State"]} rows={[["EXP-2026-0088","Utilities","2026-10-03",formatMoney("48600.00"),"APPROVED"],["EXP-2026-0085","Maintenance","2026-10-02",formatMoney("12350.00"),"APPROVED"],["EXP-2026-0084","Freight","2026-10-01",formatMoney("7800.00"),"PENDING"]].map(([code,cat,date,value,state]) => [<span className="code">{code}</span>,cat,formatDate(String(date)),value,<StatusBadge status={String(state)}/>])}/></Card></div></>;
}

const staffRows = [
  ["EMP-0041","Ravi Kumar","Weaving · Operator","06:00","Present"],["EMP-0044","Asha Roy","Spinning · Operator","06:02","Present"],["EMP-0050","Vijay Nair","Weaving · Operator","—","Absent"],["EMP-0062","Priya Iyer","Quality · Inspector","06:05","Present"],["EMP-0071","Leela Das","Stores · Keeper","06:00","Present"],["EMP-0082","Sameer Khan","Dispatch","06:10","Present"],["EMP-0104","K. Joshi","Dyeing · Operator","06:04","Present"],["EMP-0110","P. Sen","Dyeing · Operator","—","Leave"]] as const;
function AttendancePage() {
  const { toast } = useDemo();
  const [employee, setEmployee] = useState("EMP-0041");
  const [action, setAction] = useState("IN");
  const [reason, setReason] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); if (reason.trim().length < 5) { toast("Attendance note required", "A reason is required for manual correction or missing punch.", "error"); return; } toast("Punch staged", "Session-only; payroll period and date lock are not persisted in this preview.", "warning"); }
  return <><PageHeader eyebrow="People · daily attendance" title="Attendance" description="Manual corrections keep the employee, date, actor, and reason. Approved payroll periods are locked against later edits." actions={<LinkButton href="/hr/payroll" variant="secondary"><CalendarCheck2 size={14}/> Payroll periods</LinkButton>} meta={<><Tag>10 OCT 2026 · SHIFT A</Tag><Tag>EMPLOYEES PRESENT 6 / 8</Tag></>} /><div className="two-pane"><div className="stack"><Card title="Today's attendance"><DataTable headers={["Employee", "Name", "Team", "In", "State"]} rows={staffRows.map(([code,name,team,time,state]) => [<span className="code">{code}</span>,name,team,time,<StatusBadge status={state === "Present" ? "APPROVED" : state === "Absent" ? "QUARANTINED" : "PENDING"} label={state}/>])}/></Card><Card title="Shift totals"><div className="stat-grid" style={{ margin: 0 }}><div className="stat-card stat-card--neem"><div className="stat-card__top">Present</div><strong>6</strong></div><div className="stat-card stat-card--turmeric"><div className="stat-card__top">Absent</div><strong>1</strong></div><div className="stat-card stat-card--indigo"><div className="stat-card__top">Leave</div><strong>1</strong></div><div className="stat-card stat-card--cotton"><div className="stat-card__top">On shift</div><strong>8</strong></div></div></Card></div><form className="card stack" onSubmit={submit}><h2 style={{ margin: 0, font: "800 18px var(--font-display)" }}>Manual punch / correction</h2><Field label="Employee"><SelectInput value={employee} onChange={(event) => setEmployee(event.target.value)}>{staffRows.map(([code,name]) => <option key={code} value={code}>{code} · {name}</option>)}</SelectInput></Field><Field label="Punch action"><SelectInput value={action} onChange={(event) => setAction(event.target.value)}><option value="IN">Clock in</option><option value="OUT">Clock out</option><option value="CORRECT">Correct missed punch</option><option value="LEAVE">Record leave</option></SelectInput></Field><Field label="Timestamp"><TextInput type="datetime-local" defaultValue="2026-10-10T06:00"/></Field><Field label="Reason · 5+ characters"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} required/></Field><Button type="submit"><CalendarCheck2 size={15}/> Stage punch · demo</Button><InfoStrip tone="warning">If a payroll period is approved, the server must return PERIOD_APPROVED and reject edits.</InfoStrip></form></div></>;
}

function PayrollPage() {
  const { toast } = useDemo();
  const periods = [["PR-2026-10A","2026-10-01 — 2026-10-15","In progress","42 employees", "INR 768,400"],["PR-2026-09B","2026-09-16 — 2026-09-30","Approved","41 employees","INR 754,850"],["PR-2026-09A","2026-09-01 — 2026-09-15","Approved","42 employees","INR 762,125"]];
  return <><PageHeader eyebrow="People · pay period" title="Payroll" description="Attendance-linked draft periods. Approve with a separate actor; the approved period locks its attendance records." actions={<LinkButton href="/hr/attendance" variant="secondary"><ArrowLeft size={14}/> Attendance</LinkButton>} /><Card title="Payroll periods" action={<Button onClick={() => toast("Payroll draft staged", "Demo only: no payroll has been calculated or paid.", "warning")}><CalendarCheck2 size={14}/> Draft a period</Button>}><DataTable headers={["Period", "Dates", "Employees", "Gross total", "State", "Detail"]} rows={periods.map(([id,dates,state,employees,gross]) => [<Link className="code" href={`/hr/payroll/${id}`}>{id}</Link>,dates,employees,gross,<StatusBadge status={state === "Approved" ? "APPROVED" : "IN_PROGRESS"} label={state}/>,<Link className="btn btn--secondary btn--sm" href={`/hr/payroll/${id}`}>Open <ArrowRight size={12}/></Link>])}/></Card><InfoStrip tone="info" title="No payment processing.">Payroll is a record and approval workflow in this frontend. No bank transfer is initiated and no tax or statutory submission is made.</InfoStrip></>;
}
function PayrollPeriodPage({ id }: { id: string }) {
  const { toast } = useDemo();
  const [draftedBy] = useState("Maya Thomas");
  const approved = id === "PR-2026-09B" || id === "PR-2026-09A";
  return <><PageHeader eyebrow="Payroll review" title={id} description="Gross, allowances, deductions, net, and attendance source must reconcile before approval." actions={<LinkButton href="/hr/payroll" variant="secondary"><ArrowLeft size={14}/> Periods</LinkButton>} meta={<StatusBadge status={approved ? "APPROVED" : "IN_PROGRESS"} label={approved ? "Locked" : "Draft"}/>} /><div className="stat-grid"><div className="stat-card stat-card--indigo"><div className="stat-card__top">Employees</div><strong>42</strong></div><div className="stat-card stat-card--cotton"><div className="stat-card__top">Gross pay · INR</div><strong>768,400</strong></div><div className="stat-card stat-card--turmeric"><div className="stat-card__top">Deductions · INR</div><strong>54,760</strong></div><div className="stat-card stat-card--neem"><div className="stat-card__top">Net · INR</div><strong>713,640</strong></div></div><div className="two-pane"><Card title="Payroll calculation"><DataTable headers={["Employee", "Attendance days", "Gross", "Deduction", "Net", "Basis"]} rows={staffRows.slice(0,5).map(([code,name],index) => [<span className="code">{code} · {name}</span>,String(13-index%2),formatMoney(String(18000+index*1500)),formatMoney(String(1200+index*100)),formatMoney(String(16800+index*1400)),<StatusBadge status="ACTUAL"/>])}/></Card><Card title="Approval record"><div className="stack-sm"><InfoStrip tone="warning">Drafted by {draftedBy}. Approver must be a different actor. Once approved, attendance dates in this period are locked.</InfoStrip><Field label="Reviewer note"><TextArea placeholder="Review check, variance, or approval note…"/></Field><Button disabled={approved} onClick={() => toast("Payroll action staged", "The real API must enforce separation of duties; no payroll payment is created in the demo.", "warning")}>{approved ? "Approved · locked" : "Submit for separate approval"}</Button><div className="permission-note">No edits or delete after approval. Reversal needs an explicitly linked correction record.</div></div></Card></div></>;
}

function ReportsPage() {
  const { data } = useDemo();
  return <><PageHeader eyebrow="Owner's view · reporting" title="Reports" description="A small set of operational summaries that tie back to the source records. Unknown values remain unknown." actions={<><LinkButton href="/reports/month-close" variant="primary"><BookOpenCheck size={14}/> Month close</LinkButton><LinkButton href="/verify" variant="secondary"><ShieldCheck size={14}/> Integrity check</LinkButton></>} /><div className="page-grid"><Card className="col-6" title="Production summary"><DataTable headers={["Stage", "Good output", "Waste", "Reject", "Operations"]} rows={["SPINNING","WEAVING","DYEING"].map((stage) => { const ops = data.operations.filter((op) => op.stage === stage); const unit = ops[0]?.unit ?? "M"; const good = ops.reduce((sum,op) => sum.plus(op.good),new Decimal(0)); const waste = ops.reduce((sum,op) => sum.plus(op.waste),new Decimal(0)); const reject = ops.reduce((sum,op) => sum.plus(op.reject),new Decimal(0)); return [stage,formatQty(good.toFixed(3),unit,1),formatQty(waste.toFixed(3),unit,1),formatQty(reject.toFixed(3),unit,1),ops.length]; })}/></Card><Card className="col-6" title="Order completion"><DataTable headers={["Order", "Due", "Produced", "Accepted", "Dispatch", "At risk"]} rows={data.orders.map((order) => [<Link className="code" href={`/orders/${order.id}`}>{order.code}</Link>,formatDate(order.due),formatQty(order.produced,order.unit,0),formatQty(order.accepted,order.unit,0),formatQty(order.dispatched,order.unit,0),order.atRisk?<StatusBadge status="HIGH" label="Yes"/>:"No"] )}/></Card><Card className="col-6" title="Finance snapshot"><div className="permission-note">This report shows cost basis only to permission holders. Estimates are not included in recorded actual totals.</div><LinkButton href="/finance" variant="secondary">Finance reports <ArrowRight size={12}/></LinkButton></Card><Card className="col-6" title="Data quality"><div className="stack-sm"><InfoStrip tone="warning">Some machine hourly rates and dye inputs are missing. They remain missing in roll-ups.</InfoStrip><LinkButton href="/verify" variant="secondary">Run integrity checks <ArrowRight size={12}/></LinkButton></div></Card></div></>;
}

function MonthClosePage() {
  const { data } = useDemo();
  const criteria = [
    ["Inventory movement ledger", "All in-period receipts, issues, adjustments, and reversals link to batches", "PASS"],
    ["Order and shipment balance", "Dispatched quantity does not exceed ordered tolerance", "REVIEW"],
    ["Production output", "Good + waste + reject reconcile to recorded output", "PASS"],
    ["Machine cost coverage", "Every machine rate exists for allocated run time", "MISSING"],
    ["Attendance / payroll", "Attendance dates tied to exactly one open payroll period", "REVIEW"],
    ["Quality holds", "No held or rejected roll is included in finished stock", "PASS"],
    ["Buyer payments", "Receipt references matched against open invoice balances", "REVIEW"],
  ];
  const failures = criteria.filter((row) => row[2] !== "PASS").length;
  return <><PageHeader eyebrow="Finance · period control" title="October month close" description="A close is a readiness review—not a magic total. Resolve exceptions and preserve the calculation run's version and actor." actions={<LinkButton href="/finance" variant="secondary"><ArrowLeft size={14}/> Finance desk</LinkButton>} meta={<><Tag>PERIOD 2026-10</Tag><StatusBadge status={failures ? "PENDING" : "APPROVED"} label={failures ? `${failures} items need action` : "Ready"}/></>} /><div className="page-grid"><Card className="col-8" title="Close checklist" action={<Tag>7 criteria · sample</Tag>}><DataTable headers={["Control", "Acceptance evidence", "Result", "Owner"]} rows={criteria.map(([name,rule,result],index) => [name,rule,<StatusBadge status={String(result)} label={String(result)}/>,["Finance","Dispatch","Production","Finance","HR","Quality","Finance"][index]])}/></Card><Card className="col-4" title="Snapshot totals"><div className="stack-sm"><Kicker>Recorded cost · INR</Kicker><strong style={{ font: "900 27px var(--font-display)" }}>{formatMoney(data.orders.reduce((sum,order) => sum.plus(order.recordedCost),new Decimal(0)).toFixed(2))}</strong><span className="field__hint">Excludes unposted estimates.</span><Kicker>Orders at risk</Kicker><strong style={{ font: "900 27px var(--font-display)" }}>{data.orders.filter((order) => order.atRisk).length}</strong><Kicker>Quality holds</Kicker><strong style={{ font: "900 27px var(--font-display)" }}>{data.rolls.filter((roll) => ["QUARANTINED","REJECTED"].includes(roll.status)).length}</strong></div><InfoStrip tone="warning">No formal period-close/official filing is performed in this frontend preview.</InfoStrip><Button disabled={failures > 0} onClick={() => window.alert("Demo only: no period was closed.")}>Close period</Button></Card></div><InfoStrip tone="info">Client could not verify the source PDF or part2 database invariants: those files were not attached. The report checklist is labelled sample until mapped to the authoritative RPCs.</InfoStrip></>;
}

function IntegrityPage() {
  const { data } = useDemo();
  const checks = [
    ["Stock reservations", "Reserved quantity does not exceed physical on-hand by batch", data.yarnItems.every((item) => new Decimal(item.reserved).lte(item.onHand))],
    ["Available balances", "Available and held are explicit non-negative quantities", data.yarnItems.every((item) => new Decimal(item.available).gte(0) && new Decimal(item.held).gte(0))],
    ["Roll state", "Only accepted rolls appear in finished stock", data.rolls.filter((roll) => roll.status === "ACCEPTED").every((roll) => roll.location.startsWith("WH-FG"))],
    ["Dispatch guard", "Only accepted/reserved/dispatched states exist on shipment-linked roll lists", data.shipments.filter((shipment) => shipment.rollIds?.length).every((shipment) => shipment.rollIds?.every((id) => data.rolls.some((roll) => roll.id === id)))],
    ["Unit consistency", "No roll shipment mixes units", data.shipments.filter((shipment) => shipment.rollIds?.length).every((shipment) => shipment.rollIds?.every((id) => data.rolls.find((roll) => roll.id === id)?.unit === shipment.unit))],
    ["Missing rates", "Machine hourly rates with unknown values stay NULL", data.machines.filter((machine) => machine.costPerHour === null).length > 0],
  ];
  return <><PageHeader eyebrow="Control room · deterministic demo checks" title="Integrity checks" description="Read-only consistency view across the current browser fixture. This is not a replacement for database constraints or authoritative RPC checks." actions={<LinkButton href="/reports/month-close" variant="secondary"><ArrowLeft size={14}/> Month close</LinkButton>} meta={<Tag>{checks.filter((item) => item[2]).length} / {checks.length} SAMPLE RULES PASS</Tag>} /><Card title="Read-only checks"><DataTable headers={["Check", "Rule", "Result"]} rows={checks.map(([name,rule,pass]) => [name,rule,<StatusBadge status={pass ? "APPROVED" : "QUARANTINED"} label={pass ? "PASS" : "CHECK"}/>])}/></Card><InfoStrip tone="warning">Source part2 SQL/RPC definitions were not attached. These frontend assertions are representative; the backend remains authoritative.</InfoStrip></>;
}

function AlertsPage() {
  const { data } = useDemo();
  const machineAlerts = data.machines.filter((machine) => machine.status === "BREAKDOWN").map((machine) => ({ title: `${machine.code} breakdown`, body: `${machine.downtimeMinutes} min · ${machine.orderCode ?? "unassigned"}`, href: `/machines/${machine.id}`, status: "BREAKDOWN" }));
  const stockAlerts = data.yarnItems.filter((item) => new Decimal(item.available).lt(item.reorderLevel)).map((item) => ({ title: `${item.code} below reorder`, body: `${formatQty(item.available,item.unit,1)} available · threshold ${formatQty(item.reorderLevel,item.unit,1)}`, href: `/inventory`, status: "PENDING" }));
  const qualityAlerts = [{ title: "Inspection backlog", body: `${data.rolls.filter((roll) => ["AWAITING_INSPECTION","REINSPECTION_REQUIRED"].includes(roll.status)).length} rolls awaiting QC`, href: "/quality", status: "PENDING" }];
  const alerts = [...machineAlerts,...stockAlerts,...qualityAlerts];
  return <><PageHeader eyebrow="Exceptions · needs a person" title="Alerts" description="Prioritize the machine, material, due-date, and QC exceptions that block the next safe step." actions={<LinkButton href="/notifications" variant="secondary"><Bell size={14}/> Notification history</LinkButton>} meta={<Tag>{alerts.length} open sample alerts</Tag>} /><div className="stack">{alerts.map((alert) => <Link href={alert.href} key={alert.title} className="info-strip info-strip--warning"><CircleAlert size={18}/><div><strong>{alert.title}</strong><div>{alert.body}</div></div><StatusBadge status={alert.status}/><ArrowRight size={14}/></Link>)}</div>{alerts.length===0 && <EmptyState title="No current alerts" detail="This is a seeded demonstration set."/>}</>;
}
function NotificationsPage() {
  const { data, act } = useDemo();
  const unread = data.notifications.filter((notice) => notice.unread).length;
  return <><PageHeader eyebrow="Operational events · inbox" title="Notifications" description="Short reminders link back to a durable order, machine, batch, or roll record; notifications are not the source of truth." actions={<Button variant="secondary" onClick={() => act("mark-read", { all: true, commandKey: `mark-all-read:${data.notifications.filter((notice) => notice.unread).map((notice) => notice.id).sort().join(",")}` })}>Mark all read</Button>} meta={<Tag>{unread} UNREAD</Tag>} /><Card title="Notification inbox">{data.notifications.map((notice) => <Link className={`notification-row${notice.unread ? " notification-row--unread" : ""}`} key={notice.id} href={notice.href} onClick={() => void act("mark-read", { id: notice.id, commandKey: `mark-read:${notice.id}` })}><strong>{notice.title}</strong><p>{notice.body}</p><span className="cell-secondary">{notice.when} · {notice.unread ? "Unread" : "Read"}</span></Link>)}</Card></>;
}
