import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export type SelectControlProps = {
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
};
export function SelectControl({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  id,
  className,
  ...props
}: SelectControlProps) {
  const [local, setLocal] = useState(defaultValue ?? options[0]?.value ?? "");
  const selected = value ?? local;
  // Radix reserves the empty string for placeholders; keep form values unchanged.
  return (
    <>
      <Select
        value={selected || "__all__"}
        onValueChange={(v) => {
          const next = v === "__all__" ? "" : v;
          setLocal(next);
          onValueChange?.(next);
        }}
        disabled={props.disabled}
        required={props.required}
      >
        <SelectTrigger
          id={id}
          aria-label={props["aria-label"]}
          className={className}
        >
          <SelectValue>
            {options.find((o) => o.value === selected)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value || "__all__"}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {name && (
        <input
          type="hidden"
          name={name}
          value={selected}
          disabled={props.disabled}
        />
      )}
    </>
  );
}
