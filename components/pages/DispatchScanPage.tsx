"use client";

import { useState } from "react";
import { RoleLink as Link } from "@/components/ui/primitives";
import {
  ArrowLeft,
  ArrowRight,
  Barcode,
  CheckCircle2,
  FileCheck2,
  Package,
  QrCode,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Truck,
  UserCheck,
} from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { formatDate, formatDateTime, formatQty } from "@/lib/domain/format";
import {
  Button,
  Card,
  EmptyState,
  Field,
  InfoStrip,
  Kicker,
  LinkButton,
  PageHeader,
  StatusBadge,
  TextInput,
} from "@/components/ui/primitives";
import type { FabricRoll } from "@/lib/domain/types";

export function DispatchScanPage() {
  const { data, user, toast } = useDemo();
  const [scannedCode, setScannedCode] = useState("");
  const [selectedRoll, setSelectedRoll] = useState<FabricRoll | null>(null);

  // Form states for final quality report
  const [checkPackaging, setCheckPackaging] = useState(true);
  const [checkLabel, setCheckLabel] = useState(true);
  const [checkContamination, setCheckContamination] = useState(true);
  const [checkShade, setCheckShade] = useState(true);
  const [qcPassed, setQcPassed] = useState(true);
  const [qcNotes, setQcNotes] = useState(
    "Moisture barrier film intact. Weight and barcode verified. Approved for carrier truck loading."
  );
  const [approvedRolls, setApprovedRolls] = useState<FabricRoll[]>([]);

  // Find rolls eligible for pre-dispatch inspection (ACCEPTED in finished goods)
  const eligibleRolls = data.rolls.filter((roll) =>
    ["ACCEPTED", "RESERVED"].includes(roll.status)
  );

  const handleLookup = (codeToFind?: string) => {
    const query = (codeToFind ?? scannedCode).trim().toUpperCase();
    if (!query) {
      toast("Enter a roll code", "Please input or select a roll ID to inspect.", "warning");
      return;
    }

    const found = data.rolls.find(
      (r) => r.code.toUpperCase() === query || r.id.toUpperCase() === query
    );

    if (found) {
      setSelectedRoll(found);
      setScannedCode(found.code);
      setQcPassed(true);
      setCheckPackaging(true);
      setCheckLabel(true);
      setCheckContamination(true);
      setCheckShade(true);
      setQcNotes(
        found.dispatchQcNotes ||
          "Moisture barrier film intact. Weight and barcode verified. Approved for carrier truck loading."
      );
    } else {
      toast("Roll not found", `No fabric roll matching "${query}" in inventory.`, "error");
    }
  };

  const handleSelectQuickRoll = (roll: FabricRoll) => {
    setSelectedRoll(roll);
    setScannedCode(roll.code);
    setQcPassed(true);
    setCheckPackaging(true);
    setCheckLabel(true);
    setCheckContamination(true);
    setCheckShade(true);
    setQcNotes(
      roll.dispatchQcNotes ||
        "Moisture barrier film intact. Weight and barcode verified. Approved for carrier truck loading."
    );
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoll) return;

    const allPhysicalChecksPassed =
      checkPackaging && checkLabel && checkContamination && checkShade;
    const finalPassed = qcPassed && allPhysicalChecksPassed;

    // Mutate roll in session/memory with pre-dispatch QC fields
    selectedRoll.dispatchQcPassed = finalPassed;
    selectedRoll.dispatchQcNotes = qcNotes;
    selectedRoll.dispatchQcBy = user?.name ?? "Sameer Khan (Dispatch Officer)";
    selectedRoll.dispatchQcAt = new Date().toISOString();

    if (finalPassed) {
      setApprovedRolls((prev) => [
        selectedRoll,
        ...prev.filter((r) => r.id !== selectedRoll.id),
      ]);
      toast(
        "Final QC Approved",
        `Roll ${selectedRoll.code} passed pre-dispatch quality verification.`,
        "success"
      );
    } else {
      toast(
        "Roll Held at QC",
        `Roll ${selectedRoll.code} flagged with pre-dispatch quality concerns.`,
        "error"
      );
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Outbound Quality Verification"
        title="Final Quality Report & Roll Scan"
        description="Inspect fabric rolls immediately prior to vehicle loading. Verify protective wrapping, check barcode legibility, and record final outward quality release."
        actions={
          <>
            <LinkButton href="/dispatch/dashboard" variant="secondary">
              <ArrowLeft size={14} /> Fulfillment Dashboard
            </LinkButton>
            <LinkButton href="/dispatch/new" variant="primary">
              <Truck size={14} /> Allocate to Load
            </LinkButton>
          </>
        }
        meta={
          <>
            <span className="tag">OFFICER: {user?.name?.toUpperCase() ?? "DISPATCH DESK"}</span>
            <span className="tag">{eligibleRolls.length} ROLLS READY IN FG</span>
          </>
        }
      />

      <div className="two-pane">
        <div className="stack">
          {/* Barcode Scanner Box */}
          <Card title="1 · Scan Barcode or Roll Code">
            <div className="stack" style={{ gap: 14 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <TextInput
                    placeholder="Scan barcode or type roll code (e.g. ROLL-2026-0135)..."
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLookup();
                      }
                    }}
                    style={{ paddingLeft: 38 }}
                  />
                  <Barcode
                    size={18}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      color: "var(--indigo)",
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleLookup()}
                >
                  <Search size={15} /> Find Roll
                </Button>
              </div>

              {/* Quick Select Barcode Pills */}
              <div>
                <span className="cell-secondary" style={{ fontSize: 11, marginBottom: 6 }}>
                  Quick Select Finished Goods (Click to Load):
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {eligibleRolls.slice(0, 8).map((roll) => (
                    <button
                      type="button"
                      key={roll.id}
                      className="filter-chip"
                      onClick={() => handleSelectQuickRoll(roll)}
                      style={{
                        backgroundColor:
                          selectedRoll?.id === roll.id
                            ? "var(--indigo)"
                            : roll.dispatchQcPassed
                            ? "var(--neem-soft)"
                            : "var(--cotton)",
                        color:
                          selectedRoll?.id === roll.id
                            ? "#fff"
                            : "var(--ink)",
                        borderColor:
                          selectedRoll?.id === roll.id
                            ? "var(--indigo)"
                            : "var(--line-dark)",
                      }}
                    >
                      <ScanLine size={12} style={{ marginRight: 4 }} />
                      {roll.code} ({roll.colour})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Final Quality Inspection Form */}
          {selectedRoll ? (
            <Card
              title={`2 · Pre-Dispatch Quality Check: ${selectedRoll.code}`}
              action={
                <StatusBadge
                  status={selectedRoll.dispatchQcPassed ? "ACCEPTED" : selectedRoll.status}
                  label={selectedRoll.dispatchQcPassed ? "Pre-Dispatch QC Passed" : "Awaiting Scan Release"}
                />
              }
            >
              <form onSubmit={handleSubmitReport} className="stack" style={{ gap: 16 }}>
                {/* Roll Specs Summary Strip */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                    padding: 12,
                    backgroundColor: "var(--cotton)",
                    border: "1.5px solid var(--line-dark)",
                  }}
                >
                  <div>
                    <span className="cell-secondary" style={{ fontSize: 10 }}>Linked Order</span>
                    <strong className="code" style={{ fontSize: 12 }}>{selectedRoll.orderCode}</strong>
                  </div>
                  <div>
                    <span className="cell-secondary" style={{ fontSize: 10 }}>Buyer</span>
                    <strong style={{ fontSize: 12 }}>{selectedRoll.buyer}</strong>
                  </div>
                  <div>
                    <span className="cell-secondary" style={{ fontSize: 10 }}>Net Quantity</span>
                    <strong className="num" style={{ fontSize: 12 }}>
                      {formatQty(selectedRoll.qty, selectedRoll.unit, 1)}
                    </strong>
                  </div>
                  <div>
                    <span className="cell-secondary" style={{ fontSize: 10 }}>Shade / Lot</span>
                    <strong style={{ fontSize: 12 }}>
                      {selectedRoll.colour} ({selectedRoll.dyeLot})
                    </strong>
                  </div>
                </div>

                {/* Pre-Dispatch Inspection Physical Checklist */}
                <div>
                  <h4 style={{ margin: "0 0 10px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Physical Quality Verification Checklist
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      backgroundColor: "var(--white)",
                      padding: 14,
                      border: "1.5px solid var(--line)",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checkPackaging}
                        onChange={(e) => setCheckPackaging(e.target.checked)}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        Moisture & Dust Barrier: Heavy gauge poly wrap sealed with no punctures.
                      </span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checkLabel}
                        onChange={(e) => setCheckLabel(e.target.checked)}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        Roll Passport Label: Heat-stamped barcode and net meter tags are clear and legible.
                      </span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checkContamination}
                        onChange={(e) => setCheckContamination(e.target.checked)}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        Surface Hygiene: Zero external dirt, grease, stains, or warehousing odor.
                      </span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checkShade}
                        onChange={(e) => setCheckShade(e.target.checked)}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        Color & Selvage: Visible selvage edges clean; shade tone conforms to buyer spec.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Outcome Toggle */}
                <div className="form-grid">
                  <Field label="Dispatch Quality Decision">
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setQcPassed(true)}
                        className={`btn ${qcPassed ? "btn--primary" : "btn--secondary"}`}
                        style={{
                          flex: 1,
                          backgroundColor: qcPassed ? "var(--neem)" : "var(--paper)",
                          color: qcPassed ? "#fff" : "var(--ink)",
                          borderColor: "var(--ink)",
                        }}
                      >
                        <ShieldCheck size={16} /> PASS (Release to Truck)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQcPassed(false)}
                        className={`btn ${!qcPassed ? "btn--danger" : "btn--secondary"}`}
                        style={{ flex: 1 }}
                      >
                        <ShieldAlert size={16} /> HOLD / REJECT
                      </button>
                    </div>
                  </Field>

                  <Field label="Inspection Inspector ID">
                    <TextInput
                      value={user?.name ?? "Sameer Khan (Dispatch Officer)"}
                      readOnly
                      style={{ backgroundColor: "var(--cotton)" }}
                    />
                  </Field>
                </div>

                {/* Dispatch QC Notes */}
                <Field label="Inspection Verification Notes" hint="Stored in dispatch_qc_notes column">
                  <textarea
                    className="input textarea"
                    rows={3}
                    value={qcNotes}
                    onChange={(e) => setQcNotes(e.target.value)}
                    placeholder="Enter pre-dispatch inspection findings..."
                    required
                  />
                </Field>

                <div className="form-actions">
                  <span className="field__hint">
                    Approval attaches pre-dispatch QC clearance stamp to the roll passport.
                  </span>
                  <Button type="submit" size="lg" variant={qcPassed ? "primary" : "danger"}>
                    <FileCheck2 size={16} /> Record Pre-Dispatch Quality Report
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <EmptyState
              title="No roll currently selected"
              detail="Scan a barcode using an input scanner gun or pick an eligible roll from the Finished Goods register above."
            />
          )}
        </div>

        {/* Right Sidebar: Approved Rolls Register & Guidelines */}
        <aside className="stack sticky-summary">
          <Card
            title="Pre-Dispatch Verified Rolls"
            action={<span className="tag">{approvedRolls.length} APPROVED</span>}
          >
            {approvedRolls.length > 0 ? (
              <div className="stack-sm">
                {approvedRolls.map((roll) => (
                  <div
                    key={roll.id}
                    style={{
                      padding: 10,
                      border: "1.5px solid var(--neem)",
                      backgroundColor: "var(--neem-soft)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={14} color="var(--neem)" />
                        <strong className="code">{roll.code}</strong>
                      </div>
                      <span className="cell-secondary" style={{ fontSize: 10 }}>
                        {roll.orderCode} · {formatQty(roll.qty, roll.unit, 0)}
                      </span>
                    </div>
                    <span className="tag" style={{ backgroundColor: "#fff" }}>
                      READY TO LOAD
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 10 }}>
                  <LinkButton href="/dispatch/dashboard" variant="primary" size="sm">
                    <Truck size={14} /> Fulfill in Load
                  </LinkButton>
                </div>
              </div>
            ) : (
              <p className="cell-secondary">
                No rolls verified in this session yet. Complete inspection on a roll to clear it for shipment loading.
              </p>
            )}
          </Card>

          <Card title="Pre-Dispatch Quality Protocol">
            <div className="stack-sm">
              <InfoStrip tone="info">
                <strong>Standard Outward Policy:</strong> All rolls must undergo visual inspection within 2 hours of container/truck loading.
              </InfoStrip>
              <InfoStrip tone="warning">
                <strong>Hold Conditions:</strong> Any tear in the moisture-protective wrap requires re-bagging before gate departure.
              </InfoStrip>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
