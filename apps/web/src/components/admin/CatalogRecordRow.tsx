"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { EQUIPMENT_LABELS, getEquipmentLabel } from "@gymory/shared";

type QuickEdit = {
  action: (machine: FormData, review: FormData) => Promise<{ ok: true } | { ok: false; reason: string }>;
  verified: boolean;
  verificationLabel: string;
  verificationStatus: string;
  labels: string[];
};

const quickCellClass = "min-w-0 break-words px-4 py-3 text-gray-600 [overflow-wrap:anywhere]";

export function CatalogRecordRow({ title, subtitle, thumbnail, summary, quickEdit, trailingSummary, children, locale, create = false, columns = 2, initiallyEditing = false }: {
  title: string; subtitle?: string | null; thumbnail?: ReactNode; summary?: ReactNode; quickEdit?: QuickEdit; trailingSummary?: ReactNode; children: ReactNode; locale: string; create?: boolean; columns?: number; initiallyEditing?: boolean;
}) {
  const [editing, setEditing] = useState(initiallyEditing);
  const formId = useId();
  const row = useRef<HTMLTableRowElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const chinese = locale === "zh-HK";
  function syncCheckboxes(input: EventTarget, destination: HTMLElement | null) {
    if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") return;
    if ((input.name !== "labels" && input.name !== "verify") || !destination) return;

    for (const checkbox of destination.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="${input.name}"]`
    )) {
      if (checkbox.value === input.value) checkbox.checked = input.checked;
    }
  }

  async function saveQuickFields(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickEdit || saving.current) return;

    const machine = editor.current?.querySelector<HTMLFormElement>('form[data-equipment-editor="equipment"]');
    const review = editor.current?.querySelector<HTMLFormElement>('form[data-equipment-editor="review"]');
    if (!machine || !review || !machine.reportValidity() || !review.reportValidity()) return;

    const machineData = new FormData(machine);
    const reviewData = new FormData(review);
    saving.current = true;
    setPending(true);
    setSaveError(undefined);
    try {
      const result = await quickEdit.action(machineData, reviewData);
      if (result.ok) setEditing(false);
      else setSaveError(result.reason);
    } catch {
      setSaveError("unknown");
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  const button = <button type="button" aria-expanded={editing} aria-controls={formId} disabled={pending}
    onClick={() => { setSaveError(undefined); setEditing(!editing); }}
    className="inline-flex min-h-10 items-center text-sm font-medium text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline">
    {editing ? (chinese ? "取消" : "Cancel") : create ? (chinese ? "新增" : "Add") : (chinese ? "編輯" : "Edit")}
  </button>;
  if (create) return <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-4">
    <div className="flex min-w-0 items-center justify-between gap-3"><h3 className="min-w-0 break-words font-medium text-gray-900">{title}</h3>{button}</div>
    <div id={formId}>{editing ? <div className="mt-4 min-w-0">{children}</div> : null}</div>
  </section>;
  return <>
    <tr ref={row} onChange={quickEdit ? (event) => syncCheckboxes(event.target, editor.current) : undefined} className="grid min-w-0 grid-cols-2 border-b border-gray-100 last:border-b-0 md:table-row">
      {thumbnail ? <td className="col-span-2 min-w-0 px-4 py-3 md:table-cell">{thumbnail}</td> : null}
      <td className="col-span-2 min-w-0 break-words px-4 py-3 font-medium text-gray-900 [overflow-wrap:anywhere]">
        {title}{subtitle ? <p className="mt-1 break-words text-xs font-normal text-gray-500">{subtitle}</p> : null}
      </td>
      {summary}
      {quickEdit ? <>
        <td className={quickCellClass}>
          {editing ? <input type="checkbox" name="verify" defaultChecked={quickEdit.verified}
            aria-label={quickEdit.verificationLabel} disabled={pending} className="h-4 w-4" /> : <>
            <span className="mb-1 block text-xs text-gray-500 md:hidden">{quickEdit.verificationLabel}</span>
            {quickEdit.verificationStatus}
          </>}
        </td>
        <td className={quickCellClass}>
          {editing ? <div className="min-w-0 space-y-1" role="group" aria-label="Labels">
              {EQUIPMENT_LABELS.map((label) => <label key={label} className="flex min-h-8 min-w-0 items-start gap-1">
                <input type="checkbox" name="labels" value={label}
                  defaultChecked={quickEdit.labels.includes(label)} disabled={pending} className="mt-1 h-4 w-4 shrink-0" />
                <span>{getEquipmentLabel(label, locale)}</span>
              </label>)}
          </div> : <>
            <span className="mb-1 block text-xs text-gray-500 md:hidden">Labels</span>
            {quickEdit.labels.map((label) => getEquipmentLabel(label, locale)).join(", ") || "—"}
          </>}
        </td>
      </> : null}
      {trailingSummary}
      <td className="min-w-0 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          {button}
          {editing && quickEdit ? <form id={`${formId}-quick`} onSubmit={saveQuickFields} className="min-w-0">
            <button type="submit" disabled={pending}
              className="min-h-10 break-words text-sm font-semibold text-blue-700 hover:underline disabled:opacity-50">
              {pending ? (chinese ? "儲存中…" : "Saving…") : (chinese ? "儲存" : "Save")}
            </button>
          </form> : null}
        </div>
        {saveError ? <p role="alert" className="break-words text-xs text-red-700 [overflow-wrap:anywhere]">
          {saveError === "stale"
            ? (chinese ? "資料已更新，請重新載入。" : "This record changed. Reload the page.")
            : saveError === "invalid"
              ? (chinese ? "請檢查必填欄位。如要確認，請填寫官方名稱。" : "Check required fields. An official name is required for verification.")
              : (chinese ? "儲存失敗，請再試。" : "Could not save. Try again.")}
        </p> : null}
      </td>
    </tr>
    {editing ? <tr className="block border-b border-gray-100 bg-gray-50 md:table-row"><td colSpan={columns} className="block min-w-0 p-3 md:table-cell"><div id={formId} ref={editor} onChange={quickEdit ? (event) => syncCheckboxes(event.target, row.current) : undefined}>
      <fieldset disabled={pending} className="min-w-0">{children}</fieldset>
    </div></td></tr> : <tr className="hidden"><td colSpan={columns}><div id={formId} /></td></tr>}
  </>;
}
