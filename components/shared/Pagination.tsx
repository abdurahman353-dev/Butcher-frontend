import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  perPage?: number;
  onPerPageChange?: (perPage: number) => void;
}

export function Pagination({
  currentPage,
  lastPage,
  total,
  from,
  to,
  onPageChange,
  perPage = 20,
  onPerPageChange,
}: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 text-xs text-zinc-500 border-t border-zinc-100">
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-semibold text-zinc-800">{from}</span> to{" "}
          <span className="font-semibold text-zinc-800">{to}</span> of{" "}
          <span className="font-semibold text-zinc-800">{total}</span> records
        </span>

        {onPerPageChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span>Per page:</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              aria-label="Records per page"
              className="bg-white border border-zinc-200 rounded-lg px-2 py-0.5 text-xs text-zinc-700 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
            let p = i + 1;
            if (lastPage > 5 && currentPage > 3) {
              p = currentPage - 3 + i;
              if (p > lastPage) p = lastPage - (4 - i);
            }
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === p
                    ? "bg-green-600 text-white font-bold shadow-xs"
                    : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-2xs"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
