import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUserSchema,
  updateUserSchema,
  type PageDto,
  type UserDto,
} from "@flagarena/shared";
import { readApi, writeApi } from "@/lib/api";
import { label } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormField, SelectField } from "@/components/FormField";
import { ErrorNotice, Loading, StatusNotice } from "@/components/Feedback";
import { Pagination } from "@/components/Pagination";
import { UserAvatar } from "@/components/UserAvatar";

export function UserManagement() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const query = useQuery({
    queryKey: ["users", page],
    queryFn: () => readApi<PageDto<UserDto>>("/admin/users", { page }),
  });
  return (
    <>
      <h1>Users</h1>
      <CreateUserForm />
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Loading />
      ) : (
        <div className="data-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <UserAvatar id={user.id} name={user.username} />
                      {user.username}
                    </span>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{label(user.role)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {user.isSuspended
                        ? "Suspended"
                        : user.mustChangePassword
                          ? "Password change required"
                          : user.isVerified
                            ? "Active"
                            : "Unverified"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(user)}
                    >
                      Manage<span className="sr-only"> {user.username}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {query.data && (
        <Pagination
          page={page}
          total={query.data.total}
          limit={query.data.limit}
          onChange={setPage}
        />
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {editing?.username}</DialogTitle>
            <DialogDescription>
              Role and status changes end this user's sessions.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <EditUserForm
              key={editing.id}
              user={editing}
              onSaved={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function CreateUserForm() {
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      writeApi<{ id: string; temporaryPassword: string }>(
        "post",
        "/admin/users",
        createUserSchema.parse(Object.fromEntries(form)),
      ),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["users"] }),
  });
  return (
    <section className="panel">
      <h2>Create account</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(new FormData(e.currentTarget));
        }}
      >
        <FieldGroup className="filter-fields">
          <FormField
            label="Display name"
            name="username"
            minLength={3}
            maxLength={32}
            required
          />
          <FormField label="Email" name="email" type="email" required />
          <SelectField
            label="Role"
            name="role"
            options={[
              { value: "author", label: "Challenge Author" },
              { value: "admin", label: "Admin" },
              { value: "player", label: "Player" },
            ]}
          />
          <Button disabled={mutation.isPending}>Create account</Button>
        </FieldGroup>
        <ErrorNotice error={mutation.error} />
      </form>
      <Dialog
        open={!!mutation.data}
        onOpenChange={(open) => {
          if (!open) mutation.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>
              Save this password now. It is shown once and must be replaced at
              first login.
            </DialogDescription>
          </DialogHeader>
          <output className="secret-output">
            {mutation.data?.temporaryPassword}
          </output>
          <Button onClick={() => mutation.reset()}>Close</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function EditUserForm({
  user,
  onSaved,
}: {
  user: UserDto;
  onSaved: () => void;
}) {
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      writeApi(
        "patch",
        `/admin/users/${user.id}`,
        updateUserSchema.parse({
          ...Object.fromEntries(form),
          isSuspended: form.get("isSuspended") === "on",
        }),
      ),
    onSuccess: async () => {
      await cache.invalidateQueries();
      onSaved();
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(new FormData(e.currentTarget));
      }}
    >
      <FieldGroup>
        <SelectField
          label="Role"
          name="role"
          id="edit-role"
          defaultValue={user.role}
          options={["player", "author", "admin"].map((value) => ({
            value,
            label: label(value),
          }))}
        />
        <Field orientation="horizontal">
          <Switch
            name="isSuspended"
            id="suspend-user"
            defaultChecked={user.isSuspended}
          />
          <FieldLabel htmlFor="suspend-user">Suspend account</FieldLabel>
        </Field>
        <FormField
          label="Reason"
          name="reason"
          id="edit-reason"
          minLength={3}
          required
        />
        <ErrorNotice error={mutation.error} />
        <StatusNotice message={mutation.data?.message} />
        <Button disabled={mutation.isPending}>Save changes</Button>
      </FieldGroup>
    </form>
  );
}
