
import React from "react";
import { DateRange } from "react-day-picker";
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker";

interface DashboardHeaderProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DashboardHeader({ date, setDate }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between space-y-2">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      <div className="flex items-center space-x-2">
        <CalendarDateRangePicker date={date} setDate={setDate} />
      </div>
    </div>
  );
}
