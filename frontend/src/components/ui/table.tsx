"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function syncDataLabels(table: HTMLTableElement) {
  const headers = Array.from(
    table.querySelectorAll<HTMLTableCellElement>('thead th')
  )
  const labels = headers.map(h => h.textContent?.trim() ?? '')
  const rows = table.querySelectorAll<HTMLTableRowElement>('tbody tr')
  rows.forEach(row => {
    const cells = Array.from(
      row.querySelectorAll<HTMLTableCellElement>(':scope > td')
    )
    // Skip rows that span all columns (e.g. "no data" placeholders)
    if (cells.length === 1 && cells[0].colSpan > 1) {
      cells[0].setAttribute('data-fullspan', '')
      cells[0].removeAttribute('data-label')
      return
    }
    cells.forEach((cell, idx) => {
      cell.removeAttribute('data-fullspan')
      const label = labels[idx] ?? ''
      if (label && cell.getAttribute('data-label') !== label) {
        cell.setAttribute('data-label', label)
      } else if (!label) {
        cell.removeAttribute('data-label')
      }
    })
  })
}

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const ref = React.useRef<HTMLTableElement>(null)

  React.useEffect(() => {
    const table = ref.current
    if (!table) return
    syncDataLabels(table)
    const observer = new MutationObserver(() => syncDataLabels(table))
    observer.observe(table, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])

  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        ref={ref}
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
