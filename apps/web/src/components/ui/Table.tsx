import type React from "react"
import type { HTMLAttributes } from "react"
import { cn } from "../../utils/cn"

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode
}

const Table: React.FC<TableProps> = ({ className, children, ...props }) => {
  return (
    <div className="overflow-x-auto">
      <table className={cn("min-w-full divide-y divide-gray-200 dark:divide-gray-700", className)} {...props}>
        {children}
      </table>
    </div>
  )
}

const TableHeader: React.FC<TableProps> = ({ className, children, ...props }) => {
  return (
    <thead className={cn("bg-gray-50 dark:bg-gray-800", className)} {...props}>
      {children}
    </thead>
  )
}

const TableBody: React.FC<TableProps> = ({ className, children, ...props }) => {
  return (
    <tbody
      className={cn("bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700", className)}
      {...props}
    >
      {children}
    </tbody>
  )
}

const TableRow: React.FC<HTMLAttributes<HTMLTableRowElement>> = ({ className, children, ...props }) => {
  return (
    <tr className={cn("hover:bg-gray-50 dark:hover:bg-gray-800", className)} {...props}>
      {children}
    </tr>
  )
}

const TableHead: React.FC<HTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...props }) => {
  return (
    <th
      className={cn(
        "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

const TableCell: React.FC<HTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...props }) => {
  return (
    <td className={cn("px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white", className)} {...props}>
      {children}
    </td>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
