import React from "react";
import { Badge, Group } from "@mantine/core";

interface QuickFiltersProps {
  onFilter: (filter: string) => void;
  activeFilter?: string;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({ onFilter, activeFilter }) => {
  const filters = [
    { id: "all", label: "All", color: "gray" },
    { id: "high_pay", label: ">$0.50", color: "green" },
    { id: "very_high_pay", label: ">$1.00", color: "teal" },
    { id: "new_requester", label: "New", color: "blue" },
    { id: "short", label: "<1 min", color: "orange" },
    { id: "masters", label: "Masters", color: "violet" },
  ];

  return (
    <Group gap={4} p="xs" style={{ flexWrap: "wrap" }}>
      {filters.map((filter) => (
        <Badge
          key={filter.id}
          variant={activeFilter === filter.id ? "filled" : "outline"}
          color={filter.color}
          style={{ cursor: "pointer" }}
          onClick={() => onFilter(filter.id)}
        >
          {filter.label}
        </Badge>
      ))}
    </Group>
  );
};

export const applyQuickFilter = (
  hits: any[],
  filterId: string,
  blockedRequesters: string[]
): any[] => {
  return hits.filter((hit) => {
    if (blockedRequesters.includes(hit.requester_id)) return false;

    switch (filterId) {
      case "all":
        return true;
      case "high_pay":
        return hit.monetary_reward?.amount_in_dollars > 0.5;
      case "very_high_pay":
        return hit.monetary_reward?.amount_in_dollars > 1.0;
      case "new_requester":
        return hit.requester_name && hit.requester_name.includes("NEW");
      case "short":
        return (hit.assignment_duration_in_seconds || 0) < 60;
      case "masters":
        return hit.qualifications?.master_required === true;
      default:
        return true;
    }
  });
};
