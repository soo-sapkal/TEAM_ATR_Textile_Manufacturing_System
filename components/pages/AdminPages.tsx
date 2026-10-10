"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Cog, KeyRound, Plus, ShieldCheck, UserRoundPlus } from "lucide-react";
import { DEMO_USERS, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { useDemo } from "@/lib/demo/context";
import { Button, Card, DataTable, Field, InfoStrip, LinkButton, PageHeader, SelectInput, StatusBadge, Tag, TextInput } from "@/components/ui/primitives";

export function AdminRoute({ path, id }: { path: string; id?: string }) {
  if (path === "/admin/roles") return <RolesPage/>;
  if (path.startsWith("/admin/master/")) return <MasterPage resource={id ?? ""}/>;
  if (path === "/admin/settings") return <SettingsPage/>;
  if (path === "/admin/audit") return <AuditPage/>;
  return <UsersPage/>;
}

function UsersPage() {
  const { toast } = useDemo();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("OPERATOR");
  function submit(event: FormEvent) { event.preventDefault(); if (!name.trim() || !email.includes("@")) { toast("Enter a name and valid email", undefined, "error"); return; } toast("Demo user draft staged", "No account invitation or access change was made.", "warning"); setShowNew(false); setName(""); setEmail(""); }
  return <><PageHeader eyebrow="Control room · identity and access" title="Users" description="Assign roles and permission keys; the interface is not the authorization boundary. Live access changes must be enforced by the server/RLS." actions={<><LinkButton href="/admin/roles" variant="secondary"><KeyRound size={14}/> Roles & permissions</LinkButton><Button onClick={() => setShowNew((value) => !value)}><UserRoundPlus size={14}/> Add user</Button></>} meta={<Tag>{DEMO_USERS.length} seeded personas</Tag>} /><div className="info-strip info-strip--warning"><ShieldCheck size={17}/><div><strong>Permission union applies</strong><div>Multiple roles combine their permission keys. Hidden navigation is not a security check; every API method needs server-side permission enforcement and RLS.</div></div></div>{showNew && <form className="card stack" onSubmit={submit} style={{ marginBottom: 16 }}><div className="card__head"><h2>New user draft</h2><StatusBadge status="DRAFT"/></div><div className="form-grid"><Field label="Full name"><TextInput value={name} onChange={(event) => setName(event.target.value)} required/></Field><Field label="Work email"><TextInput value={email} onChange={(event) => setEmail(event.target.value)} type="email" required/></Field><Field label="Role"><SelectInput value={role} onChange={(event) => setRole(event.target.value)}>{Object.entries(ROLE_PERMISSIONS).map(([key,value]) => <option key={key} value={key}>{value.name}</option>)}</SelectInput></Field></div><div className="form-actions"><span className="field__hint">Invitation flow not connected.</span><Button type="submit">Save draft · demo</Button></div></form>}<Card title="Demo identities" action={<Tag>Role profiles · front-end only</Tag>}><DataTable headers={["Name", "Email", "Role set", "Permissions", "Landing page", "Account state"]} rows={DEMO_USERS.map((user) => [user.name,user.email,user.roles.join(" + "),<span className="num">{user.permissions.length} keys</span>,<Link href={user.landing} className="code">{user.landing}</Link>,<StatusBadge status="APPROVED" label="Seeded demo"/>])}/></Card><InfoStrip tone="info">Role and user lists should come from Supabase/management RPCs. Password reset, invite, activation, and disable are not live in this preview.</InfoStrip></>;
}

function RolesPage() {
  const permissionKeys = [...new Set(Object.values(ROLE_PERMISSIONS).flatMap((role) => role.perms))].sort();
  return <><PageHeader eyebrow="Control room · least privilege" title="Roles & permissions" description="UI gating uses permission keys and role unions. This matrix documents the seeded demo profiles only." actions={<LinkButton href="/admin/users" variant="secondary"><ArrowLeft size={14}/> Users</LinkButton>} /><Card title="Permission matrix" action={<Tag>{permissionKeys.length} keys</Tag>}><div className="table-scroll"><table className="data-table permission-matrix"><thead><tr><th scope="col">Permission key</th>{Object.keys(ROLE_PERMISSIONS).map((key) => <th scope="col" key={key}>{key}</th>)}</tr></thead><tbody>{permissionKeys.map((permission) => <tr key={permission}><th scope="row" className="code">{permission}</th>{Object.entries(ROLE_PERMISSIONS).map(([key,role]) => <td key={key} style={{ textAlign: "center" }}>{role.perms.includes(permission as never) ? <Check size={14} color="var(--neem)" aria-label={`${key} has ${permission}`}/> : <span aria-label={`${key} lacks ${permission}`}>—</span>}</td>)}</tr>)}</tbody></table></div></Card><InfoStrip tone="warning">Backend must evaluate the user&apos;s permission union on every request and RLS must restrict tenant, buyer, and record ownership. A React condition never grants access.</InfoStrip></>;
}

const MASTER_OPTIONS: Record<string, { title: string; columns: string[]; rows: string[][]; fields: string[] }> = {
  products: { title: "Products & BOM", columns: ["Code","Description","Unit","Route / stages","Status"], rows: [["FAB-221","Indigo twill","M","SPIN → WEAVE → DYE","Active"],["FAB-118","Cotton sateen","M","SPIN → WEAVE → DYE","Active"],["FAB-307","Linen blend","M","SPIN → WEAVE → DYE","Active"]], fields: ["Product code","Description","Unit","Route / stages"] },
  suppliers: { title: "Suppliers", columns: ["Supplier code","Name","Active batches","Default terms","Status"], rows: [["SUP-001","Karnataka Spinners","2","Net 30","Active"],["SUP-004","Deccan Fibres Ltd.","2","Net 30","Active"],["SUP-008","Indigo Loom Supply","1","Net 45","Active"]], fields: ["Supplier code","Supplier name","Payment terms","Contact reference"] },
  defects: { title: "Defect taxonomy", columns: ["Code","Label","Severity","Allowed disposition","Active"], rows: [["HOLE","Hole / tear","Major","REWORK · REJECT","Yes"],["SHADE","Colour variance","Minor","REWORK · ACCEPT-WITH-APPROVAL","Yes"],["WEAVE","Uneven weave","Major","REWORK · REJECT","Yes"]], fields: ["Defect code","Label","Severity","Allowed disposition"] },
  shifts: { title: "Shifts", columns: ["Code","Label","Start","End","Timezone"], rows: [["A","Day","06:00","14:00","Asia/Kolkata"],["B","Evening","14:00","22:00","Asia/Kolkata"],["C","Night","22:00","06:00","Asia/Kolkata"]], fields: ["Shift code","Name","Start time","End time"] },
  machines: { title: "Machine types", columns: ["Code","Name","Stage","Location","Status"], rows: [["LM","Power loom","WEAVING","North floor","Active"],["SP","Ring frame","SPINNING","Spinning bay","Active"],["DY","Jet dye","DYEING","Wet processing","Active"]], fields: ["Machine code","Machine name","Stage","Default location"] },
  buyers: { title: "Buyers", columns: ["Code","Buyer name","Portal user","Currency","Status"], rows: [["BUY-01","Mysore House Textiles","buyer@everest.demo","INR","Active"],["BUY-02","Kaveri Apparel Co.","—","INR","Active"],["BUY-03","Saffron Living","—","INR","Active"]], fields: ["Buyer code","Buyer name","Contact reference","Currency"] },
  "cost-rates": { title: "Cost rates", columns: ["Code","Resource","Rate","Unit","Effective date"], rows: [["RATE-LM1","Loom 1","1,450.00","INR / hour","2026-10-01"],["RATE-LM3","Loom 3","MISSING","INR / hour","—"],["RATE-DY1","Jet dye 1","1,725.00","INR / hour","2026-10-01"]], fields: ["Rate code","Resource","Rate amount","Currency / unit","Effective date"] },
};
function MasterPage({ resource }: { resource: string }) {
  const { toast } = useDemo();
  const config = MASTER_OPTIONS[resource] ?? MASTER_OPTIONS.products;
  const [showForm, setShowForm] = useState(false);
  return <><PageHeader eyebrow="Control room · reference data" title={config.title} description="Master records are referenced by human-readable codes. Updates should be versioned with effective dates; historical documents retain their original values." actions={<><LinkButton href="/admin/settings" variant="secondary"><Cog size={14}/> Settings</LinkButton><Button onClick={() => setShowForm((value) => !value)}><Plus size={14}/> Add draft</Button></>} /><div className="filter-row">{Object.entries(MASTER_OPTIONS).map(([key,value]) => <Link key={key} href={`/admin/master/${key}`} className={`filter-chip${resource===key?" filter-chip--active":""}`}>{value.title}</Link>)}</div>{showForm && <div className="card stack" style={{ marginBottom: 14 }}><h2 style={{ margin: 0, font: "800 17px var(--font-display)" }}>New {config.title.toLowerCase()} draft</h2><div className="form-grid">{config.fields.map((field) => <Field key={field} label={field}><TextInput/></Field>)}</div><div className="form-actions"><span className="field__hint">Changes are drafts until approved and effective-dated.</span><Button onClick={() => { setShowForm(false); toast("Master-data draft staged", "Demo only; no reference records were updated.", "warning"); }}>Save draft</Button></div></div>}<Card title={config.title} action={<Tag>Seeded sample</Tag>}><DataTable headers={config.columns} rows={config.rows.map((row) => [...row.slice(0,-1),<StatusBadge status={row.at(-1) === "Active" || row.at(-1) === "Yes" ? "APPROVED" : "MISSING"} label={row.at(-1) ?? "—"}/>])}/></Card><InfoStrip tone="info">Seeded from the analysis summary only; the authoritative part2 master data list was not attached.</InfoStrip></>;
}

function SettingsPage() {
  const { toast } = useDemo();
  const [siteName, setSiteName] = useState("Everest Textile Mills");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [tolerance, setTolerance] = useState("0.000");
  function submit(event: FormEvent) { event.preventDefault(); toast("Settings staged", "No shared configuration was changed.", "warning"); }
  return <><PageHeader eyebrow="Control room · operating defaults" title="Mill settings" description="Display timezone, currency, unit precision, and domain defaults. Sensitive authentication and backend configuration are not managed here." actions={<LinkButton href="/admin/users" variant="secondary"><ArrowLeft size={14}/> Users</LinkButton>} /><div className="two-pane"><form className="card stack" onSubmit={submit}><div className="form-grid"><Field label="Mill name"><TextInput value={siteName} onChange={(event) => setSiteName(event.target.value)}/></Field><Field label="Timezone"><SelectInput value={timezone} onChange={(event) => setTimezone(event.target.value)}><option>Asia/Kolkata</option><option>UTC</option></SelectInput></Field><Field label="Currency"><SelectInput value={currency} onChange={(event) => setCurrency(event.target.value)}><option>INR</option></SelectInput></Field><Field label="Order tolerance · unit precision"><TextInput value={tolerance} onChange={(event) => setTolerance(event.target.value)} inputMode="decimal"/></Field><Field label="Date / time format"><SelectInput defaultValue="en-IN · 24h"><option>en-IN · 24h</option><option>en-IN · 12h</option></SelectInput></Field><Field label="Quantity decimal places"><SelectInput defaultValue="3"><option>3</option><option>2</option></SelectInput></Field></div><InfoStrip tone="warning">Domain settings must match the authoritative settings rows; allowed values and workflow effects have not been verified because part2.md was not attached.</InfoStrip><Button type="submit">Save settings · demo</Button></form><Card title="Protected environment boundary"><div className="stack-sm"><div className="permission-note"><strong>Never stored in UI</strong><span className="cell-secondary">Supabase service-role key, database URL, signing secret, auth provider secret.</span></div><div className="permission-note"><strong>Display configuration only</strong><span className="cell-secondary">Time zone, currency, unit precision, code prefix, and floor display defaults.</span></div><div className="permission-note"><strong>Live environment variables</strong><span className="cell-secondary">Configured separately at deployment; public browser values must not contain secrets.</span></div></div></Card></div></>;
}

function AuditPage() {
  const events = [
    ["AUD-2026-0812","YARN_RECEIPT_RECORDED","Leela Das","YB-2026-0022","2026-10-09 08:05","Accepted 320 KG"],
    ["AUD-2026-0811","OPERATION_OUTPUT_RECORDED","Ravi Kumar","OP-2026-0024","2026-10-09 07:55","Good 96 M · waste 4 M"],
    ["AUD-2026-0810","ROLL_INSPECTION_RECORDED","Priya Iyer","ROLL-2026-0131","2026-10-09 07:38","REWORK_REQUIRED · Hole ×2"],
    ["AUD-2026-0809","DISPATCH_CONFIRMED","Sameer Khan","SHP-2026-0002","2026-10-09 07:15","112 M · invoice linked"],
    ["AUD-2026-0808","COST_RATE_UPDATED","Nisha Menon","RATE-LM1","2026-10-08 16:00","Effective 2026-10-01"],
  ];
  return <><PageHeader eyebrow="Control room · audit trail" title="Nothing disappears from the book." description="A record of who, what, when, reason, and linked object. Corrections append; the original event is not edited or deleted." actions={<LinkButton href="/verify" variant="secondary"><ShieldCheck size={14}/> Integrity checks</LinkButton>} meta={<Tag>APPEND-ONLY · SAMPLE EVENTS</Tag>} /><Card title="Audit events"><DataTable headers={["Event code", "Action", "Actor", "Entity", "Timestamp", "Summary"]} rows={events.map(([code,action,actor,entity,when,summary]) => [<span className="code">{code}</span>,<span className="code">{action}</span>,actor,<span className="code">{entity}</span>,when,summary])}/></Card><InfoStrip tone="warning">The source database&apos;s audit table and RPC event shapes were not attached. These rows are illustrative, not authoritative events.</InfoStrip></>;
}
