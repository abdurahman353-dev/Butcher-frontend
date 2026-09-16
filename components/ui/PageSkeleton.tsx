/**
 * PageSkeleton — reusable shimmer skeleton loader.
 * Used by every dashboard page while data is being fetched from the API.
 * Variant maps to the page layout type so the skeleton mirrors the real UI.
 */

import React from "react";

type Variant =
  | "dashboard"
  | "table"
  | "pos"
  | "settings"
  | "reports"
  | "customers"
  | "shifts";

interface PageSkeletonProps {
  variant?: Variant;
  title?: string;
}

function Shimmer({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div style={style} className={`animate-pulse bg-zinc-200 rounded-xl ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-7 w-7 rounded-xl" />
      </div>
      <Shimmer className="h-7 w-28" />
      <Shimmer className="h-2.5 w-16" />
    </div>
  );
}

function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  const widths = [28, 120, 80, 70, 60];
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-zinc-50">
      {Array.from({ length: cols }).map((_, i) => (
        <Shimmer
          key={i}
          className={`h-3 ${i === 0 ? "w-7 h-7 rounded-xl shrink-0" : ""}`}
          style={{ width: i > 0 ? `${widths[i] ?? 70}px` : undefined }}
        />
      ))}
      <Shimmer className="h-5 w-14 rounded-full ml-auto" />
    </div>
  );
}

function PageHeader({ title }: { title?: string }) {
  return (
    <div className="space-y-2 mb-6">
      {title ? (
        <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
      ) : (
        <Shimmer className="h-6 w-44" />
      )}
      <Shimmer className="h-3.5 w-64" />
    </div>
  );
}

// ── Variant: Dashboard ───────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[1,2,3,4].map((i) => <CardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 p-5 space-y-3">
          <Shimmer className="h-4 w-32 mb-2" />
          {[80,60,90,50,70].map((h, i) => (
            <div key={i} className="flex items-end gap-2 h-8">
              <Shimmer className="h-full flex-1 rounded-lg" style={{ height: `${h}%` }} />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-3">
          <Shimmer className="h-4 w-28 mb-2" />
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="w-8 h-8 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-3 w-full" />
                <Shimmer className="h-2.5 w-20" />
              </div>
              <Shimmer className="h-3 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Variant: Table (Sales, Products, Users, Customers, Inventory) ────────────
function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
        <Shimmer className="h-9 flex-1 max-w-xs rounded-xl" />
        <Shimmer className="h-9 w-24 rounded-xl" />
        <Shimmer className="h-9 w-24 rounded-xl ml-auto" />
      </div>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-zinc-100 bg-zinc-50">
        {[40,100,70,80,60].map((w, i) => (
          <Shimmer key={i} className="h-3" style={{ width: `${w}px` }} />
        ))}
      </div>
      {/* Rows */}
      {[1,2,3,4,5,6,7,8].map((i) => <TableRowSkeleton key={i} />)}
      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100">
        <Shimmer className="h-3 w-32" />
        <div className="flex gap-2">
          {[1,2,3].map((i) => <Shimmer key={i} className="h-8 w-8" />)}
        </div>
      </div>
    </div>
  );
}

// ── Variant: POS Terminal ────────────────────────────────────────────────────
function PosSkeleton() {
  return (
    <div className="flex gap-4 h-full">
      {/* Product grid */}
      <div className="flex-1 space-y-4">
        <div className="flex gap-2">
          {[1,2,3,4,5].map((i) => <Shimmer key={i} className="h-9 flex-1 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-4 space-y-3">
              <Shimmer className="h-20 w-full rounded-xl" />
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-1/2" />
              <Shimmer className="h-8 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      {/* Cart sidebar */}
      <div className="w-72 shrink-0 bg-white rounded-2xl border border-zinc-100 p-4 space-y-3">
        <Shimmer className="h-5 w-24" />
        {[1,2,3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-50">
            <Shimmer className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-2.5 w-16" />
            </div>
            <Shimmer className="h-3 w-12 shrink-0" />
          </div>
        ))}
        <div className="pt-3 space-y-2 border-t border-zinc-100">
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-10 w-full rounded-xl mt-4" />
        </div>
      </div>
    </div>
  );
}

// ── Variant: Settings ────────────────────────────────────────────────────────
function SettingsSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      {[1,2].map((section) => (
        <div key={section} className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-5">
          <Shimmer className="h-5 w-40" />
          {[1,2,3,4].map((i) => (
            <div key={i} className="space-y-1.5">
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ))}
      <Shimmer className="h-11 w-full rounded-xl" />
    </div>
  );
}

// ── Variant: Reports ─────────────────────────────────────────────────────────
function ReportsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        {[1,2,3].map((i) => <Shimmer key={i} className="h-9 w-32 rounded-xl" />)}
        <Shimmer className="h-9 w-44 rounded-xl ml-auto" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map((i) => <CardSkeleton key={i} />)}
      </div>
      <div className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-3">
        <Shimmer className="h-4 w-40 mb-3" />
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="flex items-center gap-4 py-2.5 border-b border-zinc-50">
            <Shimmer className="h-3 w-28" />
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-3 w-20 ml-auto" />
            <Shimmer className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Variant: Shifts ──────────────────────────────────────────────────────────
function ShiftsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Active shift banner */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-5 flex items-center gap-4">
        <Shimmer className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-3 w-56" />
        </div>
        <Shimmer className="h-9 w-32 rounded-xl shrink-0" />
      </div>
      {/* History table */}
      <TableSkeleton />
    </div>
  );
}

// ── Variant: Customers ───────────────────────────────────────────────────────
function CustomersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1,2,3].map((i) => <CardSkeleton key={i} />)}
      </div>
      <TableSkeleton />
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export function PageSkeleton({ variant = "table", title }: PageSkeletonProps) {
  return (
    <div className="p-4 sm:p-6 h-full">
      <PageHeader title={title} />
      {variant === "dashboard"  && <DashboardSkeleton />}
      {variant === "table"      && <TableSkeleton />}
      {variant === "pos"        && <PosSkeleton />}
      {variant === "settings"   && <SettingsSkeleton />}
      {variant === "reports"    && <ReportsSkeleton />}
      {variant === "shifts"     && <ShiftsSkeleton />}
      {variant === "customers"  && <CustomersSkeleton />}
    </div>
  );
}
