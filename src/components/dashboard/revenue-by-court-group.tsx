import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueByGroup } from "@/types/supabase";
import { useLanguage } from "@/contexts/language-context";

interface RevenueByCourtGroupProps {
  isLoading: boolean;
  revenueByGroup: RevenueByGroup[];
}

export function RevenueByCourtGroup({ isLoading, revenueByGroup }: RevenueByCourtGroupProps) {
  const { t } = useLanguage();
  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("revenue_by_court_group")}</CardTitle>
          <CardDescription>
            {t("revenue_breakdown")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p>{t("loading_revenue_data")}</p>
            </div>
          ) : revenueByGroup.length > 0 ? (
            <div className="space-y-4">
              {revenueByGroup.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                  <span className="font-medium">{t(item.group_name.toLowerCase()) || item.group_name}</span>
                  <span className="text-xl font-bold">£{Math.round(parseFloat(item.total_revenue.toString()))}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p>{t("no_revenue_data")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
