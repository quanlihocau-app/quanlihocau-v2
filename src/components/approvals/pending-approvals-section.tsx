"use client";

import { useEffect, useState } from "react";

interface ApprovalItem {
  id: string;
  type: string;
  status: string;
  requestedByName: string | null;
  note: string;
  payload: string;
  createdAt: string;
}

export function PendingApprovalsSection() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/approvals?status=PENDING")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setApprovals(data.approvals || []);
        }
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleReview = async (id: string, action: "APPROVE" | "REJECT") => {
    if (!confirm(`Bạn có chắc chắn muốn ${action === "APPROVE" ? "PHÊ DUYỆT" : "TỪ CHỐI"} yêu cầu này?`)) {
      return;
    }
    setActionLoading(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setApprovals((prev) => prev.filter((item) => item.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Thao tác thất bại");
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || approvals.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-amber-200">
        <div className="flex items-center gap-2 text-amber-900 font-semibold">
          <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
          <span>Yêu cầu nhân viên gửi chờ duyệt ({approvals.length})</span>
        </div>
        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
          Dành riêng cho Chủ hồ
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {approvals.map((item) => {
          let details: { amountVnd?: number; description?: string; quantity?: number; reason?: string } = {};
          try {
            details = JSON.parse(item.payload);
          } catch {}

          return (
            <div
              key={item.id}
              className="rounded-xl bg-white p-3.5 shadow-xs border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {item.type === "EXPENSE"
                      ? "Lập phiếu chi"
                      : item.type === "INVENTORY_OUT"
                      ? "Xuất kho"
                      : item.type}
                  </span>
                  <span className="text-xs text-slate-500">
                    Bởi: <b>{item.requestedByName || "Nhân viên"}</b> • {new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800">
                  Lý do / Ghi chú: <span className="text-amber-900 font-normal">"{item.note}"</span>
                </p>
                {item.type === "EXPENSE" && (
                  <p className="text-xs text-slate-600">
                    Số tiền: <b className="text-red-600 font-semibold">{Number(details.amountVnd || 0).toLocaleString("vi-VN")}đ</b> • Nội dung: {details.description}
                  </p>
                )}
                {item.type === "INVENTORY_OUT" && (
                  <p className="text-xs text-slate-600">
                    Số lượng xuất: <b className="text-red-600 font-semibold">{details.quantity}</b> • Lý do xuất: {details.reason}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  disabled={actionLoading === item.id}
                  onClick={() => handleReview(item.id, "REJECT")}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition active:scale-95"
                >
                  ✕ Từ chối
                </button>
                <button
                  type="button"
                  disabled={actionLoading === item.id}
                  onClick={() => handleReview(item.id, "APPROVE")}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition active:scale-95"
                >
                  ✓ Duyệt ngay
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
