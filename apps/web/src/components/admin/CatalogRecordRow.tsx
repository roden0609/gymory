"use client";

import { useId, useState, type ReactNode } from "react";

export function CatalogRecordRow({ title, subtitle, summary, children, locale, create = false, columns = 2 }: {
  title: string; subtitle?: string | null; summary?: ReactNode; children: ReactNode; locale: string; create?: boolean; columns?: number;
}) {
  const [editing, setEditing] = useState(false);
  const formId = useId();
  const chinese = locale === "zh-HK";
  const button = <button type="button" aria-expanded={editing} aria-controls={formId} onClick={() => setEditing(!editing)}
    className="inline-flex min-h-10 items-center text-sm font-medium text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline">
    {editing ? (chinese ? "取消" : "Cancel") : create ? (chinese ? "新增" : "Add") : (chinese ? "編輯" : "Edit")}
  </button>;
  if (create) return <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-4">
    <div className="flex min-w-0 items-center justify-between gap-3"><h3 className="min-w-0 break-words font-medium text-gray-900">{title}</h3>{button}</div>
    <div id={formId}>{editing ? <div className="mt-4 min-w-0">{children}</div> : null}</div>
  </section>;
  return <>
    <tr className="grid min-w-0 grid-cols-2 border-b border-gray-100 last:border-b-0 md:table-row">
      <td className="col-span-2 min-w-0 break-words px-4 py-3 font-medium text-gray-900 [overflow-wrap:anywhere]">
        {title}{subtitle ? <p className="mt-1 break-words text-xs font-normal text-gray-500">{subtitle}</p> : null}
      </td>
      {summary}
      <td className="min-w-0 px-4 py-3">{button}</td>
    </tr>
    {editing ? <tr className="block border-b border-gray-100 bg-gray-50 md:table-row"><td colSpan={columns} className="block min-w-0 p-3 md:table-cell"><div id={formId}>{children}</div></td></tr> : <tr className="hidden"><td colSpan={columns}><div id={formId} /></td></tr>}
  </>;
}
