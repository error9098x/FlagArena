import type { ComponentProps } from "react";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectControl, type SelectControlProps } from "./SelectControl";
export function FormField({
  label,
  error,
  ...props
}: ComponentProps<typeof Input> & { label: string; error?: string }) {
  const id = props.id ?? props.name;
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
export function TextField({
  label,
  ...props
}: ComponentProps<typeof Textarea> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea {...props} id={id} />
    </Field>
  );
}
export function SelectField({
  label,
  options,
  ...props
}: SelectControlProps & {
  label: string;
  options: { value: string; label: string }[];
}) {
  const id = props.id ?? props.name;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <SelectControl {...props} id={id} options={options} />
    </Field>
  );
}
