"use client";

import { useEffect, useState } from "react";
import { RoleLink as Link } from "@/components/ui/primitives";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, EmptyState, PageHeader, Tag, InfoStrip, LinkButton } from "@/components/ui/primitives";

export function BuyerCatalogPage() {
  const [dbCatalog, setDbCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setDbCatalog(resData.data);
        }
        setLoading(false);
      });
  }, []);

  return (
    <>
      <PageHeader 
        eyebrow="Everest Textile Mills · Production Standards" 
        title="Commercial Fabric & Weave Catalog" 
        description="Explore certified fabric specifications produced on our air-jet looms and high-temperature dyeing vessels. Request a quote or place an order directly from the catalog."
        actions={
          <LinkButton href="/buyer/orders/new" variant="primary">
            Request Quote
          </LinkButton>
        }
      />

      <Card title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} style={{ color: "var(--indigo)" }} /> 
          Available Fabrics & Blends
        </div>
      }>
        <div style={{ padding: 20 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)", fontWeight: 600 }}>
              Loading live catalog from database...
            </div>
          ) : dbCatalog.length === 0 ? (
            <EmptyState title="No fabrics found" detail="The catalog is currently empty." />
          ) : (
            <div className="stack" style={{ gap: 16 }}>
              {dbCatalog.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1.5px solid var(--line-dark)",
                    padding: "18px 22px",
                    backgroundColor: "var(--white)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <span className="code" style={{ color: "var(--indigo)", fontWeight: 900, fontSize: 13 }}>
                        {item.code}
                      </span>
                      <h3 style={{ margin: "4px 0 8px", fontSize: 18, fontWeight: 800 }}>
                        {item.name}
                      </h3>
                      <div style={{ fontSize: 13, color: "var(--ink-soft)", maxWidth: "600px", lineHeight: 1.5 }}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginRight: 4 }}>Available Shading:</span>
                    {(item.available_colors || []).map((color: string) => (
                      <span
                        key={color}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: "var(--cotton)",
                          padding: "4px 10px",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {color}
                      </span>
                    ))}
                    {(!item.available_colors || item.available_colors.length === 0) && (
                      <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Standard finish only</span>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: "1px solid var(--cotton-2)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "var(--neem)", fontWeight: 700, fontSize: 12 }}>
                      Standard Mill Lead Time: {item.lead_time || "10-14 business days"}
                    </span>
                    <Link
                      href={`/buyer/orders/new`}
                      className="btn btn--quiet btn--sm"
                      style={{ padding: "6px 12px" }}
                    >
                      Configure Order <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      
      <InfoStrip tone="success" title="Quality Guarantee">
        All fabrics undergo rigorous 4-point visual inspection and tensile testing before dispatch. We guarantee less than 2% shrinkage on all pre-shrunk cotton blends.
      </InfoStrip>
    </>
  );
}
