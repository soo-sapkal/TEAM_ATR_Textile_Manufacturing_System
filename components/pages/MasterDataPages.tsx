"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Save, Plus, Trash2, Box, Beaker, FilePlus2 } from "lucide-react";
import { PageHeader, Card, DataTable, Button, TextInput, TextArea, SelectInput, Field, StatusBadge, EmptyState, InfoStrip, LinkButton } from "@/components/ui/primitives";
import { useDemo } from "@/lib/demo/context";
import { formatQty } from "@/lib/domain/format";

export function MasterDataRoute({ path, id }: { path: string; id?: string }) {
  if (path === "/products/new") return <ProductFormPage/>;
  if (path.startsWith("/products/") && id) return <ProductDetailPage id={id}/>;
  return <ProductsListPage/>;
}

export function ProductsListPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProducts(data.data);
        setLoading(false);
      });
  }, []);

  return <>
    <PageHeader 
      eyebrow="Master Data" 
      title="Product Catalog" 
      description="Manage factory products, SKUs, and their manufacturing Bill of Materials." 
      actions={<LinkButton href="/products/new" variant="primary"><Plus size={15}/> Add product</LinkButton>} 
    />
    <Card className="card--table" title="Factory Products">
      <DataTable 
        headers={["Code / SKU", "Product Name", "Category", "Last Updated", "Actions"]} 
        rows={products.map((p) => [
          <span className="code cell-primary">{p.code}</span>, 
          <div><span className="cell-primary">{p.name}</span><span className="cell-secondary">{p.description}</span></div>, 
          <StatusBadge status={p.category || "UNSPECIFIED"}/>, 
          <span className="cell-secondary">{new Date(p.updated_at).toLocaleDateString()}</span>, 
          <Link href={`/products/${p.id}`} className="btn btn--secondary btn--sm">Configure <ArrowRight size={12}/></Link>
        ])} 
        empty={loading ? <div style={{ padding: 40, textAlign: "center" }}>Loading catalog...</div> : <EmptyState title="No products found" detail="Create your first product to define its BOM." action={<LinkButton href="/products/new">Add Product</LinkButton>}/>}
      />
    </Card>
  </>;
}

export function ProductFormPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("FABRIC");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useDemo();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, category, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast("Product created", "You can now define its Bill of Materials.", "success");
      window.location.href = `/products/${data.data.id}`;
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return <>
    <PageHeader eyebrow="Master Data" title="New Product" description="Define a new product SKU and base properties." actions={<LinkButton href="/products" variant="secondary"><ArrowLeft size={14}/> Catalog</LinkButton>} />
    <form onSubmit={submit} className="card stack">
      <div className="card__head"><h2>Product Details</h2></div>
      <div className="form-grid">
        <Field label="SKU / Code"><TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="FAB-100" required/></Field>
        <Field label="Product Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Cotton Sateen" required/></Field>
        <Field label="Category"><SelectInput value={category} onChange={(e) => setCategory(e.target.value)}><option value="FABRIC">Fabric</option><option value="YARN_BLEND">Yarn Blend</option><option value="ACCESSORY">Accessory</option></SelectInput></Field>
        <Field label="Description" className="col-12"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Construction, finish, usage notes..."/></Field>
      </div>
      {error && <p className="field__error">{error}</p>}
      <div className="form-actions"><Button type="submit" disabled={busy} size="lg"><Save size={15}/> {busy ? "Saving..." : "Create Product"}</Button></div>
    </form>
  </>;
}

export function ProductDetailPage({ id }: { id: string }) {
  const { data: demoData, toast } = useDemo();
  const [product, setProduct] = useState<any>(null);
  const [bom, setBom] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // BOM Form State
  const [yarnId, setYarnId] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${id}`).then(r => r.json()),
      fetch(`/api/products/${id}/bom`).then(r => r.json())
    ]).then(([prodRes, bomRes]) => {
      if (prodRes.success) setProduct(prodRes.data);
      if (bomRes.success) setBom(bomRes.data);
      setLoading(false);
    });
  }, [id]);

  async function addYarn(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch(`/api/products/${id}/bom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yarn_item_id: yarnId, quantity_required: parseFloat(qty), unit: "KG", notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const fullYarn = demoData.yarnItems.find(y => y.id === yarnId);
      setBom([...bom, { ...data.data, yarn_code: fullYarn?.code, yarn_name: fullYarn?.description }]);
      setYarnId(""); setQty(""); setNotes("");
      toast("BOM updated", "Material requirement added successfully.", "success");
    } catch (err: any) {
      toast("Error", err.message, "error");
    }
    setAdding(false);
  }

  async function removeYarn(yarnItemId: string) {
    try {
      const res = await fetch(`/api/products/${id}/bom?yarn_item_id=${yarnItemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setBom(bom.filter(b => b.yarn_item_id !== yarnItemId));
      toast("Material removed", "BOM updated successfully.", "success");
    } catch (err: any) {
      toast("Error", err.message, "error");
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!product) return <EmptyState title="Not found" detail="This product does not exist."/>;

  return <>
    <PageHeader eyebrow="Master Data" title={product.name} description={product.description} meta={<><span className="code">{product.code}</span><StatusBadge status={product.category}/></>} actions={<LinkButton href="/products" variant="secondary"><ArrowLeft size={14}/> Catalog</LinkButton>} />
    
    <div className="two-pane">
      <div className="stack">
        <Card title="Bill of Materials (BOM)" action={<span className="tag">{bom.length} items</span>} className="card--table">
          <DataTable 
            headers={["Raw Material", "Requirement per Unit", "Notes", ""]}
            rows={bom.map(b => [
              <div><span className="code cell-primary">{b.yarn_code}</span><span className="cell-secondary">{b.yarn_name}</span></div>,
              <strong>{formatQty(b.quantity_required, b.unit, 3)}</strong>,
              <span className="cell-secondary">{b.notes || "—"}</span>,
              <Button variant="danger" size="sm" onClick={() => removeYarn(b.yarn_item_id)}><Trash2 size={12}/></Button>
            ])}
            empty={<EmptyState title="No materials defined" detail="This product has no recipe yet."/>}
          />
        </Card>
      </div>

      <aside className="stack sticky-summary">
        <form onSubmit={addYarn} className="card stack">
          <div className="card__head"><h2><Beaker size={15}/> Add to BOM</h2></div>
          <div className="form-grid">
            <Field label="Yarn Material" className="col-12">
              <SelectInput value={yarnId} onChange={(e) => setYarnId(e.target.value)} required>
                <option value="">Select a yarn...</option>
                {demoData.yarnItems.map(y => <option key={y.id} value={y.id}>{y.code} — {y.description}</option>)}
              </SelectInput>
            </Field>
            <Field label="Required Qty (KG)"><TextInput type="number" step="0.001" min="0.001" value={qty} onChange={(e) => setQty(e.target.value)} required placeholder="0.450"/></Field>
            <Field label="Notes" className="col-12"><TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Losses, twists, tension..."/></Field>
          </div>
          <div className="form-actions"><Button type="submit" disabled={adding || !yarnId}><Plus size={14}/> Add Material</Button></div>
        </form>
        <InfoStrip tone="info" title="Yield scaling">The quantity required is per 1 unit (e.g., 1 Meter) of the final product. Production plans will automatically multiply this by the order quantity.</InfoStrip>
      </aside>
    </div>
  </>;
}
