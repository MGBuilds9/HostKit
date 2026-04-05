"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Statement {
  id: string;
  propertyId: string;
  propertyName: string;
  month: string;
  revenue: number | null;
  expenses: number | null;
  payout: number | null;
  status: string | null;
}

interface OwnerStatementTableProps {
  statements: Statement[];
  properties: { id: string; name: string }[];
}

function formatCurrency(cents: number | null): string {
  if (cents == null) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function statusVariant(status: string | null): "default" | "secondary" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "sent":
      return "secondary";
    default:
      return "outline";
  }
}

export function OwnerStatementTable({
  statements,
  properties,
}: OwnerStatementTableProps) {
  const [propertyFilter, setPropertyFilter] = useState("all");

  const filtered = useMemo(() => {
    if (propertyFilter === "all") return statements;
    return statements.filter((s) => s.propertyId === propertyFilter);
  }, [statements, propertyFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Statements</CardTitle>
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No statements found
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">
                    Month
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">
                    Property
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">
                    Revenue
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">
                    Expenses
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">
                    Payout
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {formatMonth(s.month)}
                    </td>
                    <td className="py-3 pr-4">{s.propertyName}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatCurrency(s.revenue)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatCurrency(s.expenses)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums font-medium">
                      {formatCurrency(s.payout)}
                    </td>
                    <td className="py-3">
                      <Badge variant={statusVariant(s.status)}>
                        {s.status ?? "draft"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
