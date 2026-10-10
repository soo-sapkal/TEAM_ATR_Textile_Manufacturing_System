"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowRight, BadgeCheck, Boxes, ClipboardCheck, Factory, PackageCheck, ScanLine, Truck } from "lucide-react";
import { BrandMark, LinkButton, Thread } from "@/components/ui/primitives";

const scenes = [
  { number: "01", icon: Boxes, title: "Yarn arrives at the gate", text: "Receive by batch. Separate accepted, damaged, and held stock before the first plan begins." },
  { number: "02", icon: Factory, title: "The floor finds its rhythm", text: "See each operation, machine, shift, and output without another walk across the mill." },
  { number: "03", icon: ClipboardCheck, title: "Every roll is checked", text: "Keep inspections and defects attached to the roll, its order, machine, and yarn lot." },
  { number: "04", icon: ScanLine, title: "A buyer asks where it is", text: "Answer with a clear stage, accepted quantity, and what remains—not another phone call." },
  { number: "05", icon: Truck, title: "The truck gets the right rolls", text: "Only accepted rolls reach a shipment. The invoice and dispatch note follow the recorded load." },
  { number: "06", icon: PackageCheck, title: "The owner closes the books", text: "Bring costs, wages, payments, and machine output together—with missing data called out." },
];

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".hero-copy > *", { y: 18, opacity: 0, duration: 0.45, stagger: 0.06, ease: "power2.out" });
      gsap.from(".loom-plate", { y: 16, rotate: 4, opacity: 0, duration: 0.55, delay: 0.18, ease: "power3.out" });
      const path = root.current?.querySelector<SVGPathElement>(".loom-plate__thread path");
      if (path) {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        gsap.to(path, { strokeDashoffset: 0, duration: 1.25, delay: 0.3, ease: "power2.out" });
      }
      gsap.utils.toArray<HTMLElement>(".scene-card").forEach((card) => {
        gsap.from(card, { y: 18, opacity: 0.25, duration: 0.4, ease: "power2.out", scrollTrigger: { trigger: card, start: "top 88%", once: true } });
      });
    });
    return () => media.revert();
  }, { scope: root });

  return <main ref={root} className="landing">
    <nav className="public-nav" aria-label="Main navigation">
      <Link href="/" aria-label="Loom Ledger home"><BrandMark /></Link>
      <div className="public-nav__links"><a href="#scenes">Six scenes</a><a href="#traceability">Traceability</a><LinkButton href="/login" size="sm" variant="primary">Enter the mill <ArrowRight size={14}/></LinkButton></div>
    </nav>
    <section className="landing-hero" aria-labelledby="gate-title">
      <div className="hero-copy">
        <span className="kicker">Everest Textile Mills · Operations ledger</span>
        <h1 id="gate-title">Yarn in.<br/>Fabric out.<br/><span>Every step</span><br/>on record.</h1>
        <p>One shared view from yarn gate to buyer dispatch. Know what is available, what is running, what passed inspection, and what the order really cost.</p>
        <div className="hero-actions"><LinkButton href="/login" variant="primary" size="lg">Open the mill application <ArrowRight size={17}/></LinkButton><a className="btn btn--secondary btn--lg" href="#scenes">See the six scenes <ArrowDown size={15}/></a></div>
        <div className="hero-proof"><span className="hero-proof__dot"/> Every roll traced · Every movement recorded · Only accepted fabric ships</div>
      </div>
      <div className="hero-art" role="img" aria-label="Illustrative contemporary textile loom scene; not a photograph of Everest Textile Mills">
        <div className="hero-art__image" aria-hidden="true"><Image src="/manus-storage/async-images/9Th4qUL9inwqxniO7UUec0/image-1.webp" alt="" fill priority sizes="(max-width: 820px) 100vw, 48vw" unoptimized/></div>
        <div className="hero-slip hero-slip--top"><small>YN-40-IND · available</small><strong>1,060.500</strong><em>KG</em></div>
        <div className="loom-plate"><div className="loom-plate__grid"/><span className="loom-plate__label">MILL RECORD / 2026</span>
          <svg className="loom-plate__thread" viewBox="0 0 420 340" role="img" aria-label="Thread from yarn through spinning, weaving, quality and dispatch">
            <path d="M28 35 H106 V95 H170 V155 H232 V96 H298 V214 H362 V286 H400"/>
          </svg>
          <span className="loom-plate__stamp">TRACEABLE</span>
        </div>
        <div className="hero-slip hero-slip--bottom"><small>Roll status</small><strong>10 ACCEPTED</strong><em>9 WAITING</em></div>
      </div>
    </section>
    <div className="landing-ticker" aria-label="What the mill records"><span>Yarn batch →</span><span>Operation →</span><span>Fabric roll →</span><span>Quality check →</span><span>Buyer shipment →</span><span>Recorded cost</span></div>
    <section className="landing-section" id="scenes" aria-labelledby="scenes-title">
      <div className="section-intro"><div><span className="kicker">A day at the mill</span><h2 id="scenes-title">Six moments.<br/>One clear record.</h2></div><p>The screens follow the work as it happens: large controls for the floor, useful detail for the office, and a buyer view that says only what a buyer needs to know.</p></div>
      <div className="scene-grid">{scenes.map(({ number, icon: Icon, title, text }) => <article className="scene-card" key={number}><span className="scene-card__num">SCENE {number}</span><Icon className="scene-card__arrow" size={18} aria-hidden="true"/><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
    <section className="landing-section landing-section--ink" id="traceability" aria-labelledby="trace-title">
      <div className="section-intro"><div><span className="kicker" style={{ color: "var(--turmeric)" }}>The thread is the record</span><h2 id="trace-title">Follow the fibre.<br/>Explain the order.</h2></div><p>Each roll carries its production origin, inspection history, yarn genealogy, and dispatch event. A failure stays visible after rework.</p></div>
      <Thread stages={[
        { key: "yarn", label: "Yarn", state: "done", meta: "Batch YB-0012" },
        { key: "spinning", label: "Spinning", state: "done", meta: "164.000 KG" },
        { key: "weaving", label: "Weaving", state: "current", meta: "LM-01 · 82%" },
        { key: "dyeing", label: "Dyeing", state: "todo" },
        { key: "quality", label: "Quality", state: "todo" },
        { key: "dispatch", label: "Dispatch", state: "todo" },
      ]} />
      <div className="page-grid" style={{ marginTop: 26 }}>
        <div className="card card--dark col-4"><span className="kicker" style={{ color: "var(--turmeric)" }}>Stock is explicit</span><h3 style={{ font: "800 22px var(--font-display)" }}>On hand is not available.</h3><p>Reservations and held yarn stay visible beside usable quantity, always with its unit.</p></div>
        <div className="card card--dark col-4"><span className="kicker" style={{ color: "var(--turmeric)" }}>States are guarded</span><h3 style={{ font: "800 22px var(--font-display)" }}>Only the next legal step.</h3><p>Operation, machine, roll, and shipment actions reflect their documented state transitions.</p></div>
        <div className="card card--dark col-4"><span className="kicker" style={{ color: "var(--turmeric)" }}>The record is honest</span><h3 style={{ font: "800 22px var(--font-display)" }}>Estimated is not actual.</h3><p>Cost basis and missing rates stay labelled. The application ensures persistent reliability.</p></div>
      </div>
    </section>
    <section className="landing-section"><div className="landing-cta"><div><span className="kicker">Start with the day you have</span><h2>Less walking to ask.<br/>More knowing what happened.</h2></div><LinkButton href="/login" variant="primary" size="lg">Choose a role <ArrowRight size={17}/></LinkButton></div></section>
    <footer className="public-footer"><BrandMark compact/><span>LOOM LEDGER · EVEREST TEXTILE MILLS</span><span>ILLUSTRATIVE IMAGE · FACTORY DATA CONNECTED</span><BadgeCheck size={17} aria-label="Prototype interface"/></footer>
  </main>;
}
