
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Dummy data - later will be replaced with actual data
const data = [
  { name: "Jan", revenue: 4000, expenses: 2400 },
  { name: "Feb", revenue: 3000, expenses: 1398 },
  { name: "Mar", revenue: 2000, expenses: 9800 },
  { name: "Apr", revenue: 2780, expenses: 3908 },
  { name: "May", revenue: 1890, expenses: 4800 },
  { name: "Jun", revenue: 2390, expenses: 3800 },
];

export function RevenueChart() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Revenue vs Expenses</CardTitle>
        <CardDescription>
          Monthly comparison of revenue and expenses
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`$${value}`, undefined]}
                labelFormatter={(value) => `Month: ${value}`}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#9b87f5" name="Revenue" />
              <Bar dataKey="expenses" fill="#ea384c" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
