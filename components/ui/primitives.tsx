import Link from "next/link";
import type { ReactNode } from "react";
import Decimal from "decimal.js";
import { ArrowDownRight, ArrowUpRight, Check, CircleAlert, CircleCheck, CircleDot, CircleX, Minus, type LucideIcon } from "lucide-react";
import { cx } from "@/lib/domain/ui";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span className={cx("brand-lockup", compact && "brand-lockup--compact")} aria-label="Loom Ledger">
    <svg className="brand-mark" viewBox="0 0 44 44" role="img" aria-label="Loom thread mark">
      <path d="M7 8v9h10v10h10v9h10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="miter" />
      <path d="M7 8h7M17 17h7M27 27h7M37 36v-8" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="4" width="8" height="8" fill="currentColor" />
      <rect x="13" y="13" width="8" height="8" fill="currentColor" />
      <rect x="23" y="23" width="8" height="8" fill="currentColor" />
      <rect x="33" y="33" width="8" height="8" fill="currentColor" />
    </svg>
    {!compact && <span className="brand-word">LOOM <b>LEDGER</b><small>EVEREST TEXTILE MILLS</small></span>}
  </span>;
}

export function Button({ children, variant = "primary", size = "md", className, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger" | "light"; size?: "sm" | "md" | "lg" }) {
  return <button className={cx("btn", `btn--${variant}`, `btn--${size}`, className)} disabled={disabled} {...props}>{children}</button>;
}

export function LinkButton({ href, children, variant = "secondary", size = "md", className }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "quiet" | "danger" | "light"; size?: "sm" | "md" | "lg"; className?: string }) {
  return <Link className={cx("btn", `btn--${variant}`, `btn--${size}`, className)} href={href}>{children}</Link>;
}

const badgeMap: Record<string, string> = {
  ACCEPTED: "good", PASS: "good", COMPLETED: "good", APPROVED: "good", DISPATCHED: "good", AVAILABLE: "good", IDLE: "good", CLOSED: "good",
  IN_PROGRESS: "blue", RUNNING: "blue", CONFIRMED: "blue", PLANNED: "blue", RELEASED: "blue", RESERVED: "blue", CALCULATED: "blue",
  DRAFT: "neutral", PENDING: "warning", AWAITING_INSPECTION: "warning", REINSPECTION_REQUIRED: "warning", SETUP: "warning", PARTIALLY_DISPATCHED: "warning", READY_FOR_DISPATCH: "good",
  BREAKDOWN: "danger", QUARANTINED: "danger", REJECTED: "danger", REWORK_REQUIRED: "danger", REWORK_IN_PROGRESS: "warning", CANCELLED: "neutral", REVERSED: "danger", OFFLINE: "neutral", MAINTENANCE: "warning",
  ACTUAL: "good", ALLOCATED: "blue", ESTIMATED: "warning", MISSING: "danger", HIGH: "warning", URGENT: "danger", NORMAL: "neutral", LOW: "neutral",
};
const stateIcon: Record<string, LucideIcon> = { good: Check, blue: CircleDot, warning: CircleAlert, danger: CircleX, neutral: Minus };
export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const tone = badgeMap[status] ?? "neutral";
  const Icon = stateIcon[tone];
  return <span className={cx("status-badge", `status-badge--${tone}`, className)}><Icon size={13} strokeWidth={2.5} aria-hidden="true" />{label ?? status.replaceAll("_", " ")}</span>;
}

export function BasisBadge({ basis }: { basis: "ACTUAL" | "ALLOCATED" | "ESTIMATED" | "MISSING" | string }) {
  return <StatusBadge status={basis} label={basis.charAt(0) + basis.slice(1).toLowerCase()} />;
}

export function Kicker({ children }: { children: ReactNode }) { return <span className="kicker">{children}</span>; }

export function PageHeader({ eyebrow, title, description, actions, meta }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode; meta?: ReactNode }) {
  return <header className="page-header">
    <div className="page-header__copy">
      {eyebrow && <Kicker>{eyebrow}</Kicker>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {meta && <div className="page-header__meta">{meta}</div>}
    </div>
    {actions && <div className="page-header__actions">{actions}</div>}
  </header>;
}

export function Card({ children, className = "", title, action, id }: { children: ReactNode; className?: string; title?: string; action?: ReactNode; id?: string }) {
  return <section id={id} className={cx("card", className)}>
    {(title || action) && <div className="card__head">{title && <h2>{title}</h2>}{action}</div>}
    {children}
  </section>;
}

export function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}

export function StatCard({ label, value, detail, icon: Icon, tone = "cotton", href, trend }: { label: string; value: ReactNode; detail?: string; icon?: LucideIcon; tone?: "cotton" | "turmeric" | "madder" | "neem" | "indigo"; href?: string; trend?: "up" | "down" }) {
  const body = <><div className="stat-card__top"><span>{label}</span>{Icon && <Icon size={18} aria-hidden="true" />}</div><strong>{value}</strong><div className="stat-card__bottom">{trend === "up" && <ArrowUpRight size={14} />}{trend === "down" && <ArrowDownRight size={14} />}{detail && <span>{detail}</span>}</div></>;
  return href ? <Link href={href} className={cx("stat-card", `stat-card--${tone}`)}>{body}</Link> : <div className={cx("stat-card", `stat-card--${tone}`)}>{body}</div>;
}

export function Meter({ value, total, unit, label, tone = "indigo", showNumbers = true }: { value: string | number; total: string | number; unit?: string; label?: string; tone?: "indigo" | "neem" | "turmeric" | "madder"; showNumbers?: boolean }) {
  const numericValue = new Decimal(value);
  const numericTotal = new Decimal(total);
  const percent = numericTotal.lte(0) ? 0 : Decimal.min(100, Decimal.max(0, numericValue.div(numericTotal).mul(100))).toNumber();
  return <div className="meter-wrap">
    {(label || showNumbers) && <div className="meter-label"><span>{label}</span>{showNumbers && <b>{value}{unit ? ` ${unit}` : ""} <i>/</i> {total}{unit ? ` ${unit}` : ""}</b>}</div>}
    <div className="meter" role="meter" aria-label={label ?? "Progress"} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><span className={`meter__fill meter__fill--${tone}`} style={{ transform: `scaleX(${percent / 100})` }} /></div>
  </div>;
}

export type ThreadStage = { key: string; label: string; state: "done" | "current" | "todo" | "blocked"; meta?: string };
export function Thread({ stages, orientation = "horizontal", className }: { stages: ThreadStage[]; orientation?: "horizontal" | "vertical"; className?: string }) {
  return <ol className={cx("thread", orientation === "vertical" && "thread--vertical", className)} aria-label="Traceability progress">
    {stages.map((stage, index) => <li key={stage.key} className={`thread__item thread__item--${stage.state}`}>
      <span className="thread__node" aria-hidden="true">{stage.state === "done" ? <Check size={14} strokeWidth={3} /> : stage.state === "blocked" ? <CircleX size={14} /> : index + 1}</span>
      <span className="thread__label">{stage.label}</span>
      {stage.meta && <span className="thread__meta">{stage.meta}</span>}
      {index < stages.length - 1 && <span className="thread__wire" aria-hidden="true" />}
    </li>)}
  </ol>;
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="empty-state"><CircleCheck size={26} aria-hidden="true" /><h3>{title}</h3>{detail && <p>{detail}</p>}{action}</div>;
}

export function InfoStrip({ children, tone = "info", title }: { children: ReactNode; tone?: "info" | "warning" | "danger" | "success"; title?: string }) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return <div className={`info-strip info-strip--${tone}`}><Icon size={18} aria-hidden="true"/><div>{title && <strong>{title}</strong>}<div>{children}</div></div></div>;
}

export function Field({ label, hint, children, error, className }: { label: string; hint?: string; children: ReactNode; error?: string; className?: string }) {
  return <label className={cx("field", className)}><span className="field__label">{label}</span>{children}{hint && <span className="field__hint">{hint}</span>}{error && <span className="field__error" role="alert">{error}</span>}</label>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { className, invalid, ...rest } = props;
  return <input className={cx("input", invalid && "input--invalid", className)} {...rest} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return <select className={cx("input", "select", className)} {...rest}>{children}</select>;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea className={cx("input", "textarea", className)} {...rest} />;
}

export function DataTable({ headers, rows, empty }: { headers: ReactNode[]; rows: ReactNode[][]; empty?: ReactNode }) {
  if (!rows.length && empty) return <div className="table-empty">{empty}</div>;
  return <div className="table-scroll"><table className="data-table"><thead><tr>{headers.map((header, index) => <th key={index} scope="col">{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) { return <span className={cx("tag", className)}>{children}</span>; }
