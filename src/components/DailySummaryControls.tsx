"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function DailySummaryControls({ defaultDate }: { defaultDate: string }) {
  return (
    <div className="flex items-center gap-2">
      <form method="get" className="flex items-center gap-2">
        <input
          type="date"
          name="date"
          defaultValue={defaultDate}
          className="h-9 rounded-xl border border-line bg-field px-3 text-xs"
          aria-label="Summary date"
        />
        <Button type="submit" variant="primary" size="sm" className="h-9 px-3 text-xs">
          Show
        </Button>
      </form>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => window.print()}
        className="h-9 px-3 text-xs"
      >
        <Printer className="h-3.5 w-3.5" /> Print Summary
      </Button>
    </div>
  );
}
