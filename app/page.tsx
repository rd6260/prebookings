"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EXCLUDE_NAMES = ["TEST", "Rohan Das"];
const EXCLUDE_PHONES = ["9876543210", "1234567890", "9864357677"];


// ── Types ──────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  ticket_count: number;
  ticket_type: "Public" | "Industry";
  is_paid: boolean;
  created_at: string;
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

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  paid: { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  created: { pill: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  failed: { pill: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  refunded: { pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  default: { pill: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

function getStatusStyle(s: string) {
  return STATUS_STYLES[s?.toLowerCase()] ?? STATUS_STYLES.default;
}

function formatIST(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const s = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border tracking-wide ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {status?.toUpperCase() ?? "—"}
    </span>
  );
}

// ── Payment Drawer ─────────────────────────────────────────────────────────

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
    setPayments([]);
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
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer — full screen on mobile, panel on desktop */}
      <div className="fixed inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:h-full z-50 w-full sm:max-w-lg flex flex-col bg-white shadow-2xl overflow-hidden border-l border-[hsl(181_100%_9%/0.08)]">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[hsl(181_100%_9%/0.08)]">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(181_100%_9%/0.4)] mb-1">
              Payment Details
            </p>
            <h2 className="text-lg font-black text-[hsl(181_100%_9%)] leading-tight">{booking.name}</h2>
            <p className="text-xs text-[hsl(181_100%_9%/0.5)] mt-0.5 truncate">{booking.phone} · {booking.email}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 mt-0.5 flex-shrink-0 p-2 rounded-xl text-[hsl(181_100%_9%/0.4)] hover:text-[hsl(181_100%_9%)] hover:bg-[hsl(181_100%_9%/0.06)] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Booking summary strip */}
        <div className="grid grid-cols-3 gap-px bg-[hsl(181_100%_9%/0.07)] border-b border-[hsl(181_100%_9%/0.08)]">
          {[
            { label: "City", value: booking.city },
            { label: "Tickets", value: `${booking.ticket_count} × ${booking.ticket_type}` },
            { label: "Booking", value: "Paid ✓" },
          ].map((item) => (
            <div key={item.label} className="bg-white px-4 py-3">
              <p className="text-[10px] text-[hsl(181_100%_9%/0.4)] uppercase tracking-widest font-black mb-0.5">
                {item.label}
              </p>
              <p className="text-sm text-[hsl(181_100%_9%)] font-bold truncate">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Payments list */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-[hsl(181_100%_9%/0.02)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-[hsl(181_100%_9%/0.1)] border-t-[hsl(181_100%_9%)] animate-spin" />
            </div>
          )}

          {!loading && payments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-[hsl(181_100%_9%/0.15)] mb-3">receipt_long</span>
              <p className="text-sm text-[hsl(181_100%_9%/0.4)]">No payment records found</p>
            </div>
          )}

          {!loading && payments.map((p) => (
            <div
              key={p.payment_id}
              className="rounded-2xl border border-[hsl(181_100%_9%/0.08)] bg-white shadow-sm overflow-hidden"
            >
              {/* Payment header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(181_100%_9%/0.07)]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-[hsl(181_100%_9%/0.35)] font-mono truncate hidden sm:block">
                    {p.razorpay_payment_id || p.razorpay_order_id || "—"}
                  </span>
                </div>
                <span className="text-base font-black text-[hsl(181_100%_9%)] ml-2 flex-shrink-0">
                  {p.currency} {p.amount ? (parseFloat(p.amount) ).toFixed(2) : "—"}
                </span>
              </div>

              {/* Payment fields */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
                {[
                  { label: "Method", value: p.method },
                  { label: "Currency", value: p.currency },
                  { label: "Booking Fee", value: p.booking_fee },
                  { label: "Created", value: p.created_at ? new Date(p.created_at).toLocaleString() : "—" },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-[10px] text-[hsl(181_100%_9%/0.4)] uppercase tracking-widest font-black mb-0.5">
                      {field.label}
                    </p>
                    <p className="text-sm text-[hsl(181_100%_9%)] font-semibold truncate">
                      {field.value || "—"}
                    </p>
                  </div>
                ))}
              </div>

              {/* IDs */}
              {(p.razorpay_order_id || p.razorpay_signature) && (
                <div className="px-4 pb-4 space-y-2 border-t border-[hsl(181_100%_9%/0.07)] pt-3">
                  {p.razorpay_order_id && (
                    <div>
                      <p className="text-[10px] text-[hsl(181_100%_9%/0.4)] uppercase tracking-widest font-black mb-0.5">Order ID</p>
                      <p className="text-xs text-[hsl(181_100%_9%/0.6)] font-mono break-all">{p.razorpay_order_id}</p>
                    </div>
                  )}
                  {p.razorpay_signature && (
                    <div>
                      <p className="text-[10px] text-[hsl(181_100%_9%/0.4)] uppercase tracking-widest font-black mb-0.5">Signature</p>
                      <p className="text-xs text-[hsl(181_100%_9%/0.5)] font-mono break-all">{p.razorpay_signature}</p>
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

// ── Main Page ──────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    supabase
      .from("bookings")
      .select("*")
      .eq("is_paid", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const filtered = (data ?? []).filter(
          (b) =>
            !EXCLUDE_NAMES.includes(b.name.toUpperCase()) &&
            !EXCLUDE_PHONES.includes(b.phone)
        );
        setBookings(filtered);
        setLoading(false);
      });
  }, []);

  const totalTickets = bookings.reduce((s, b) => s + b.ticket_count, 0);

  return (
    <div
      className="min-h-screen bg-white text-[hsl(181_100%_9%)]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,900&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        rel="stylesheet"
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Page header */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(181_100%_9%/0.4)] mb-2">
            Admin Dashboard
          </p>
          <h1 className="text-3xl font-black tracking-tight leading-none">
            Bookings
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Total Bookings", value: loading ? "—" : bookings.length, icon: "confirmation_number" },
            { label: "Total Tickets", value: loading ? "—" : totalTickets, icon: "local_activity" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-[hsl(181_100%_9%/0.08)] shadow-sm px-5 py-4 flex items-start gap-3"
            >
              <span className="material-symbols-outlined text-xl text-[hsl(181_100%_9%/0.35)] mt-0.5 flex-shrink-0">
                {stat.icon}
              </span>
              <div>
                <p className="text-2xl font-black leading-none mb-1">{stat.value}</p>
                <p className="text-xs text-[hsl(181_100%_9%/0.45)] font-semibold">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 rounded-full border-2 border-[hsl(181_100%_9%/0.1)] border-t-[hsl(181_100%_9%)] animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && bookings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-5xl text-[hsl(181_100%_9%/0.15)] mb-3">
              confirmation_number
            </span>
            <p className="text-sm text-[hsl(181_100%_9%/0.4)]">No paid bookings yet</p>
          </div>
        )}

        {/* Booking cards */}
        {!loading && (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-[hsl(181_100%_9%/0.08)] shadow-sm overflow-hidden"
              >
                <div className="px-5 pt-4 pb-5">

                  {/* Top row: name + type pill */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <h3 className="font-black text-[hsl(181_100%_9%)] text-base leading-tight">
                        {b.name}
                      </h3>
                      <p className="text-xs text-[hsl(181_100%_9%/0.4)] font-mono mt-0.5 truncate">
                        {b.id.slice(0, 12)}…
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[hsl(181_100%_9%/0.35)]" style={{ fontSize: "12px" }}>schedule</span>
                        <p className="text-[11px] text-[hsl(181_100%_9%/0.45)] font-semibold">
                          {formatIST(b.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${b.ticket_type === "Industry"
                          ? "bg-violet-50 text-violet-700 border-violet-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                    >
                      {b.ticket_type}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[hsl(181_100%_9%/0.07)] mb-4" />

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5">
                    {[
                      { label: "Phone", value: b.phone, icon: "call" },
                      { label: "City", value: b.city, icon: "location_on" },
                      { label: "Email", value: b.email, icon: "mail" },
                      { label: "Tickets", value: `${b.ticket_count} ticket${b.ticket_count !== 1 ? "s" : ""}`, icon: "local_activity" },
                    ].map((field) => (
                      <div key={field.label} className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(181_100%_9%/0.35)] mb-0.5">
                          {field.label}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs text-[hsl(181_100%_9%/0.35)] flex-shrink-0" style={{ fontSize: "13px" }}>
                            {field.icon}
                          </span>
                          <p className="text-sm font-semibold text-[hsl(181_100%_9%)] truncate">
                            {field.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => setSelectedBooking(b)}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-[hsl(181_100%_9%)] text-white hover:bg-[hsl(181_100%_12%)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-[hsl(181_100%_9%/0.15)]"
                  >
                    <span className="material-symbols-outlined text-base">receipt_long</span>
                    View Payment Details
                  </button>

                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && bookings.length > 0 && (
          <p className="text-xs text-[hsl(181_100%_9%/0.3)] text-center mt-6 font-semibold">
            {bookings.length} paid booking{bookings.length !== 1 ? "s" : ""}
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
