"use client";
import { useState } from "react";
import { submitReport, REPORT_REASONS } from "@/app/actions/reports";

type Reason = (typeof REPORT_REASONS)[number];

export default function ReportButton({
  targetKind,
  targetId,
}: {
  targetKind: "post" | "thread";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>(REPORT_REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await submitReport({
      targetKind,
      targetId,
      reason,
      note: note.trim() || null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-bark-soft hover:text-clay-deep"
      >
        🚩 Report
      </button>
    );
  }

  if (done) {
    return (
      <p className="rounded-2xl border-2 border-leaf/40 bg-leaf/10 px-4 py-3 text-sm text-forest-deep">
        Thanks — a moderator will take a look.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-clay/40 bg-white p-4">
      <p className="text-sm font-semibold text-bark">Report this {targetKind}</p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as Reason)}
        className="w-full rounded-2xl border-2 border-cream-deep bg-white px-4 py-2 text-sm"
      >
        {REPORT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="More detail (optional)"
        className="w-full rounded-2xl border-2 border-cream-deep bg-white px-4 py-2 text-sm focus:border-forest focus:outline-none"
      />
      {error && <p className="text-sm text-clay-deep">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="flex-1 rounded-full bg-clay px-4 py-2 text-sm font-bold text-cream transition hover:bg-clay-deep disabled:opacity-60"
        >
          {busy ? "Sending..." : "Send report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="flex-1 rounded-full border-2 border-cream-deep bg-white px-4 py-2 text-sm font-semibold text-bark"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
