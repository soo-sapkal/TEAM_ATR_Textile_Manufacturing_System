"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { FileText, Image as ImageIcon, RefreshCw, Upload, X } from "lucide-react";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024;

export function EvidencePicker({ label = "Evidence file", onChange }: { label?: string; onChange?: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(selected: File | undefined) {
    if (!selected) return;
    if (!ACCEPTED_TYPES.has(selected.type)) {
      setError("Choose a JPEG, PNG, WebP, or PDF file.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("File exceeds 10 MB. Choose a smaller evidence file.");
      return;
    }
    setError("");
    setProgress(0);
    setReading(true);
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    reader.onerror = () => {
      setReading(false);
      setError("The local file could not be read. Try another file.");
    };
    reader.onabort = () => setReading(false);
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        setReading(false);
        setError("The local preview could not be created.");
        return;
      }
      setFile(selected);
      setPreview(result);
      setProgress(100);
      setReading(false);
      onChange?.(selected);
    };
    reader.readAsDataURL(selected);
  }

  function remove() {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    onChange?.(null);
  }

  return <section className="evidence-picker" aria-label={label}>
    <div className="evidence-picker__header"><div><strong>{label}</strong><span className="cell-secondary">JPEG, PNG, WebP, or PDF · maximum 10 MB</span></div><span className="tag">LOCAL ONLY</span></div>
    <div className="evidence-picker__actions">
      <label className="btn btn--secondary" htmlFor={`evidence-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}><Upload size={15}/>{file ? "Replace evidence" : "Choose evidence"}</label>
      <input ref={inputRef} id={`evidence-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => choose(event.target.files?.[0])} aria-describedby={`evidence-help-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}/>
      {file && <button type="button" className="btn btn--quiet" onClick={remove}><X size={15}/> Remove</button>}
    </div>
    <p className="field__hint" id={`evidence-help-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>The file is read only for a local preview. It is not uploaded, attached to an event, or retained after this page session.</p>
    {error && <p className="field__error" role="alert">{error}</p>}
    {(reading || file) && <div className="evidence-picker__status" role="status" aria-live="polite">
      <div className="evidence-picker__file">{file?.type === "application/pdf" ? <FileText size={17}/> : <ImageIcon size={17}/>}<span><strong>{file?.name ?? "Reading selected file…"}</strong><span className="cell-secondary">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · local preview` : "No upload in progress"}</span></span><span className="num">{progress}%</span></div>
      <progress max="100" value={progress} aria-label="Local preview read progress"/>
      {file?.type.startsWith("image/") && preview && <NextImage className="evidence-picker__preview" src={preview} alt={`Local preview of ${file.name}`} width={480} height={320} sizes="(max-width: 700px) 90vw, 480px" unoptimized/>}
      {file?.type === "application/pdf" && preview && <div className="evidence-picker__pdf"><FileText size={21}/><span>PDF selected for local review. The preview remains in this browser only.</span><RefreshCw size={15}/></div>}
      <span className="field__hint">{reading ? "Reading file for local preview — not uploading." : "Local preview ready — no backend upload or persistent evidence record exists."}</span>
    </div>}
  </section>;
}
