"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { saveEquipmentEditor } from "@/app/[locale]/admin/equipment/actions";

export function EquipmentEditor({ children, locale }: { children: ReactNode; locale: string }) {
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string }>();
  const zh = locale === "zh-HK";

  async function submit(event: FormEvent<HTMLFieldSetElement>) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const section = form.dataset.equipmentEditor;
    if (section !== "equipment" && section !== "review") return;
    event.preventDefault();
    if (saving.current) return;

    const data = new FormData(form);
    saving.current = true;
    setPending(true);
    setNotice(undefined);
    try {
      const result = await saveEquipmentEditor(section, data);
      if (result.ok) {
        const text = section === "equipment"
          ? (zh ? "已儲存器材資料。" : "Equipment details saved.")
          : (zh ? "已儲存核對結果。" : "Review saved.");
        setNotice({ ok: true, text });
      } else {
        const text = result.reason === "stale"
          ? (zh ? "資料已更新。請重新載入並核對最新資料。" : "This record changed. Reload and review the latest data.")
          : result.reason === "invalid"
            ? (zh ? "請檢查必填欄位及輸入格式。" : "Check the required fields and input formats.")
            : (zh ? "儲存失敗，請再試一次。" : "Could not save. Try again.");
        setNotice({ ok: false, text });
      }
    } catch {
      setNotice({ ok: false, text: zh ? "儲存失敗，請再試一次。" : "Could not save. Try again." });
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return (
    <fieldset onSubmit={submit} disabled={pending} aria-busy={pending} className="min-w-0 space-y-4">
      {children}
      {pending || notice ? <p role={notice?.ok === false ? "alert" : "status"} className="break-words text-sm">
        {pending ? (zh ? "儲存中…" : "Saving…") : notice?.text}
      </p> : null}
    </fieldset>
  );
}
