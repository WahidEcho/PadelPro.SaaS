import React from "react";
import { DateRange } from "react-day-picker";
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker";
import { useLanguage } from "@/contexts/language-context";
import LevelsLogo from '../../pics/levelslogo.png';

interface DashboardPageHeaderProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DashboardPageHeader({ date, setDate }: DashboardPageHeaderProps) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between space-y-2">
      <div className="flex items-center gap-4">
        <img src={LevelsLogo} alt="Levels FC Logo" className="h-16 w-auto rounded-2xl shadow -ml-4" />
        <h2 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h2>
      </div>
      <div className="flex items-center space-x-2">
        <CalendarDateRangePicker date={date} setDate={setDate} />
      </div>
    </div>
  );
}
