"use client";

import { useState } from "react";
import { removeGymMachine } from "@/app/[locale]/admin/gyms/[id]/equipment/actions";

export function AdminRemoveGymMachineForm({ locale, gymId, machineId, machineName }: {
  locale: string;
  gymId: string;
  machineId: string;
  machineName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isChinese = locale === "zh-HK";

  return (
    <>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={() => setIsOpen(true)} className="min-h-10 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
          {isChinese ? "移除器械" : "Remove machine"}
        </button>
      </div>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">
              {isChinese ? "移除呢部器械？" : "Remove this machine?"}
            </h3>
            <p className="mt-2 break-words text-sm text-gray-600">
              {isChinese
                ? `你將會由呢間 gym 移除 ${machineName} 嘅 inventory 記錄。`
                : `This removes the ${machineName} inventory record from the gym.`}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="min-h-10 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {isChinese ? "取消" : "Cancel"}
              </button>
              <form action={removeGymMachine}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="gym_id" value={gymId} />
                <input type="hidden" name="equipment_id" value={machineId} />
                <button type="submit" className="min-h-10 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
                  {isChinese ? "確認移除" : "Remove machine"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
