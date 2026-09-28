import type { ComponentProps } from "react";
import { Select } from "@/components/ui/form";
import type { CategoryWithProfessions } from "@/features/catalog/queries";

export function ProfessionSelect({
  catalog,
  placeholder,
  ...props
}: ComponentProps<"select"> & { catalog: CategoryWithProfessions[]; placeholder: string }) {
  return (
    <Select {...props}>
      <option value="">{placeholder}</option>
      {catalog.map((c) => (
        <optgroup key={c.id} label={c.name}>
          {c.professions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
