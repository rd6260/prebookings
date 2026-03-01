"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from '@supabase/ssr'

// ── Replace with your actual Supabase credentials ──────────────────────────
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
// ───────────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  ticket_count: number;
  ticket_type: "Public" | "Industry";
  is_paid: boolean;
}

interface Payment {
  payment_id: string;
  booking_id: string;
  phone_no: string;
  email: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  method: string;
  amount: string;
  currency: string;
  booking_fee: string;
  razorpay_fee: string;
  tax: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  paid:     { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  created:  { bg: "bg-sky-500/10",     text: "text-sky-400",     dot: "bg-sky-400"     },
  failed:   { bg: "bg-rose-500/10",    text: "text-rose-400",    dot: "bg-rose-400"    },
  refunded: { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400"   },
  default:  { bg: "bg-slate-500/10",   text: "text-slate-400",   dot: "bg-slate-400"   },
};

function getStatusStyle(status: string) {
  return statusColors[status?.toLowerCase()] ?? statusColors.default;
}

function StatusBadge({ status }: { status: string }) {
  const s = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status?.toUpperCase() ?? "—"}
    </span>
  );
}

function PaymentDrawer({
  booking,
  onClose,
}: {
  booking: Booking | null;
  onClose: () => void;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!booking) return;
    setLoading(true);
    supabase
      .from("payments")
      .select("*")
      .eq("booking_id", booking.id)
      .then(({ data }) => {
        setPayments(data ?? []);
        setLoading(false);
      });
  }, [booking]);

  if (!booking) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-lg flex flex-col bg-[#0e1117] border-l border-white/8 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-white/8">
          <div>
            <p className="text-xs text-slate-500 font-mono mb-1 tracking-widest uppercase">Payment Details</p>
            <h2 className="text-lg font-bold text-white">{booking.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{booking.phone} · {booking.email}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-1 p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Booking summary strip */}
        <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/8">
          {[
            { label: "City", value: booking.city },
            { label: "Tickets", value: `${booking.ticket_count} × ${booking.ticket_type}` },
            { label: "Paid", value: booking.is_paid ? "Yes" : "No" },
          ].map((item) => (
            <div key={item.label} className="bg-[#0e1117] px-4 py-3">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-0.5">{item.label}</p>
              <p className="text-sm text-white font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Payments list */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin" />
            </div>
          )}

          {!loading && payments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-700 mb-3">receipt_long</span>
              <p className="text-slate-500 text-sm">No payment records found</p>
            </div>
          )}

          {!loading && payments.map((p) => (
            <div
              key={p.payment_id}
              className="rounded-xl border border-white/8 bg-white/3 overflow-hidden"
            >
              {/* Payment header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-slate-500 font-mono">{p.razorpay_payment_id || p.razorpay_order_id || "—"}</span>
                </div>
                <span className="text-base font-bold text-white">
                  {p.currency} {p.amount ? (parseFloat(p.amount) / 100).toFixed(2) : "—"}
                </span>
              </div>

              {/* Payment fields */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
                {[
                  { label: "Method", value: p.method },
                  { label: "Currency", value: p.currency },
                  { label: "Booking Fee", value: p.booking_fee },
                  { label: "Razorpay Fee", value: p.razorpay_fee },
                  { label: "GST / Tax", value: p.tax },
                  { label: "Created", value: p.created_at ? new Date(p.created_at).toLocaleString() : "—" },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-0.5">{field.label}</p>
                    <p className="text-sm text-slate-300 font-medium truncate">{field.value || "—"}</p>
                  </div>
                ))}
              </div>

              {/* IDs */}
              {(p.razorpay_order_id || p.razorpay_signature) && (
                <div className="px-4 pb-4 space-y-2">
                  {p.razorpay_order_id && (
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-0.5">Order ID</p>
                      <p className="text-xs text-slate-400 font-mono break-all">{p.razorpay_order_id}</p>
                    </div>
                  )}
                  {p.razorpay_signature && (
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-0.5">Signature</p>
                      <p className="text-xs text-slate-400 font-mono break-all truncate">{p.razorpay_signature}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Public" | "Industry">("All");
  const [filterPaid, setFilterPaid] = useState<"All" | "Paid" | "Unpaid">("All");

  useEffect(() => {
    supabase
      .from("bookings")
      .select("*")
      .order("id", { ascending: false })
      .then(({ data }) => {
        setBookings(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.name.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.phone.includes(q) ||
      b.city.toLowerCase().includes(q);
    const matchType = filterType === "All" || b.ticket_type === filterType;
    const matchPaid =
      filterPaid === "All" ||
      (filterPaid === "Paid" && b.is_paid) ||
      (filterPaid === "Unpaid" && !b.is_paid);
    return matchSearch && matchType && matchPaid;
  });

  const totalTickets = filtered.reduce((s, b) => s + b.ticket_count, 0);
  const paidCount = filtered.filter((b) => b.is_paid).length;

  return (
    <div className="min-h-screen bg-[#080b10] text-white font-sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="mb-8">
          <p className="text-xs text-cyan-500 font-mono tracking-[0.3em] uppercase mb-2">Admin Dashboard</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Bookings</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total Bookings", value: filtered.length, icon: "confirmation_number" },
            { label: "Total Tickets", value: totalTickets, icon: "local_activity" },
            { label: "Paid", value: paidCount, icon: "payments", accent: true },
            { label: "Unpaid", value: filtered.length - paidCount, icon: "pending_actions" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border px-4 py-4 flex items-start gap-3 ${
                stat.accent
                  ? "border-cyan-500/30 bg-cyan-500/5"
                  : "border-white/8 bg-white/3"
              }`}
            >
              <span className={`material-symbols-outlined text-xl mt-0.5 ${stat.accent ? "text-cyan-400" : "text-slate-500"}`}>
                {stat.icon}
              </span>
              <div>
                <p className="text-2xl font-bold leading-none mb-1">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, city…"
              className="w-full bg-white/4 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:bg-white/6 transition-colors"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-1 bg-white/4 border border-white/8 rounded-xl p-1">
            {(["All", "Public", "Industry"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterType === t
                    ? "bg-white text-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Paid filter */}
          <div className="flex gap-1 bg-white/4 border border-white/8 rounded-xl p-1">
            {(["All", "Paid", "Unpaid"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterPaid(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterPaid === t
                    ? "bg-white text-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/8 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/8 bg-white/2">
            {["Name", "Contact", "City", "Tickets", "Type", "Status", ""].map((h) => (
              <p key={h} className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                {h}
              </p>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-800 mb-3">search_off</span>
              <p className="text-slate-600 text-sm">No bookings match your filters</p>
            </div>
          )}

          {!loading && filtered.map((b, i) => (
            <div
              key={b.id}
              className={`group flex flex-col md:grid md:grid-cols-[1fr_1fr_1fr_auto_auto_auto_auto] gap-4 items-start md:items-center px-5 py-4 border-b border-white/5 hover:bg-white/3 transition-colors cursor-default ${
                i === filtered.length - 1 ? "border-b-0" : ""
              }`}
            >
              {/* Name */}
              <div>
                <p className="font-semibold text-sm text-white">{b.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{b.id.slice(0, 8)}…</p>
              </div>

              {/* Contact */}
              <div>
                <p className="text-sm text-slate-300">{b.phone}</p>
                <p className="text-xs text-slate-500 truncate">{b.email}</p>
              </div>

              {/* City */}
              <p className="text-sm text-slate-300">{b.city}</p>

              {/* Tickets */}
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-slate-500">local_activity</span>
                <span className="text-sm font-bold">{b.ticket_count}</span>
              </div>

              {/* Type */}
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  b.ticket_type === "Industry"
                    ? "bg-violet-500/15 text-violet-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {b.ticket_type}
              </span>

              {/* Paid */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  b.is_paid
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-slate-500/10 text-slate-500"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${b.is_paid ? "bg-emerald-400" : "bg-slate-500"}`} />
                {b.is_paid ? "Paid" : "Unpaid"}
              </span>

              {/* Action */}
              <button
                onClick={() => setSelectedBooking(b)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/12 border border-white/8 text-xs text-slate-300 hover:text-white font-medium transition-all"
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                <span className="hidden sm:inline">Payments</span>
              </button>
            </div>
          ))}
        </div>

        {!loading && (
          <p className="text-xs text-slate-700 text-center mt-4">
            Showing {filtered.length} of {bookings.length} bookings
          </p>
        )}
      </div>

      {/* Payment drawer */}
      <PaymentDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
