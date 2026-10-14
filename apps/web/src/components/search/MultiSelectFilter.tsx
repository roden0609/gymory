"use client";

import { useEffect, useId, useRef, useState } from "react";

// Keep the active dropdown open when a selection changes the landing-page route.
let openFilterKey: string | null = null;
let focusedOption: { filterKey: string; value: string } | null = null;

type Option = { value: string; label: string };

export function MultiSelectFilter({ filterKey, label, placeholder, hint, options, selected, onChange }: {
  filterKey: string;
  label: string;
  placeholder: string;
  hint?: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(() => openFilterKey === filterKey);
  const [values, setValues] = useState(selected);
  const selectedKey = selected.join(",");
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeCallback = useRef(onChange);
  changeCallback.current = onChange;

  const close = () => {
    if (openFilterKey === filterKey) openFilterKey = null;
    setOpen(false);
  };

  useEffect(() => {
    if (updateTimer.current === null) setValues(selectedKey ? selectedKey.split(",") : []);
  }, [selectedKey]);

  useEffect(() => () => {
    if (updateTimer.current !== null) clearTimeout(updateTimer.current);
  }, []);

  const toggle = (value: string, checked: boolean) => {
    focusedOption = { filterKey, value };
    const next = checked ? [...values, value] : values.filter((item) => item !== value);
    setValues(next);
    if (updateTimer.current !== null) clearTimeout(updateTimer.current);
    // Immediate checkbox feedback; batch rapid clicks into one results update.
    updateTimer.current = setTimeout(() => {
      updateTimer.current = null;
      changeCallback.current(next);
    }, 180);
  };

  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const labels = options.filter((item) => values.includes(item.value)).map((item) => item.label);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) {
        if (openFilterKey === filterKey) openFilterKey = null;
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (openFilterKey === filterKey) openFilterKey = null;
      setOpen(false);
      button.current?.focus({ preventScroll: true });
    };
    if (focusedOption?.filterKey === filterKey) {
      const focusedValue = focusedOption.value;
      const input = Array.from(wrapper.current?.querySelectorAll<HTMLInputElement>("input") ?? [])
        .find((item) => item.value === focusedValue);
      input?.focus({ preventScroll: true });
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterKey, open]);

  return (
    <div ref={wrapper} className="relative w-full min-w-0 max-w-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      >
      <button ref={button} type="button" aria-label={label} aria-expanded={open} aria-controls={panelId}
        onClick={() => {
          openFilterKey = open ? null : filterKey;
          setOpen((current) => !current);
        }}
        className="flex min-h-9 w-full min-w-0 max-w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-left text-sm text-gray-900">
        <span className="min-w-0 flex-1 truncate" title={labels.join(", ")}>{labels.length ? labels.join(", ") : placeholder}</span>
        {labels.length > 0 && <span className="shrink-0 rounded-full bg-gray-100 px-2 text-xs">{labels.length}</span>}
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-gray-600">
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div id={panelId} className="absolute inset-x-0 top-full z-40 mt-1 min-w-0 max-w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto p-3">
            {hint && <p className="mb-2 break-words text-xs text-gray-500">{hint}</p>}
            {options.map((item) => (
              <label key={item.value} className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" value={item.value} checked={values.includes(item.value)}
                  onChange={(event) => toggle(item.value, event.target.checked)}
                  className="h-4 w-4 shrink-0 accent-gray-900" />
                <span className="min-w-0 break-words">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
