import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { errorMessage } from "@/lib/api";
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{errorMessage(error)}</AlertDescription>
    </Alert>
  ) : null;
}
export function StatusNotice({ message }: { message?: string }) {
  return message ? (
    <Alert role="status">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null;
}
export function EmptyState({ text }: { text: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{text}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
export function Loading() {
  return (
    <span role="status" className="sr-only">
      Loading
    </span>
  );
}
