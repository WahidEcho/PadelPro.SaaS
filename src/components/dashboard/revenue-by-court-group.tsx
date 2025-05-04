
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueByGroup } from "@/types/supabase";

interface RevenueByCourtGroupProps {
  isLoading: boolean;
  revenueByGroup: RevenueByGroup[];
}

export function RevenueByCourtGroup({ isLoading, revenueByGroup }: RevenueByCourtGroupProps) {
  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Court Group</CardTitle>
          <CardDescription>
            Revenue breakdown by court categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p>Loading revenue data...</p>
            </div>
          ) : revenueByGroup.length > 0 ? (
            <div className="space-y-4">
              {revenueByGroup.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                  <span className="font-medium">{item.group_name}</span>
                  <span className="text-xl font-bold">${parseFloat(item.total_revenue.toString()).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p>No revenue data available for the selected period.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
