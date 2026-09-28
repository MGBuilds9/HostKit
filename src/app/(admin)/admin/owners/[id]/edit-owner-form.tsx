"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createOwnerSchema } from "@/lib/validators";

const formSchema = createOwnerSchema.omit({ userId: true });
type FormValues = z.infer<typeof formSchema>;

interface EditOwnerFormProps {
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  propertyCount: number;
}

export function EditOwnerForm({ owner, propertyCount }: EditOwnerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: owner.name,
      email: owner.email,
      phone: owner.phone ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    try {
      const res = await fetch(`/api/owners/${owner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast({ title: "Owner updated" });
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        const msg =
          typeof json?.error === "string"
            ? json.error
            : json?.error?.formErrors?.[0] ?? "Failed to update owner.";
        setError("root", { message: msg });
      }
    } catch {
      setError("root", { message: "Network error. Please try again." });
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/owners/${owner.id}`, { method: "DELETE" });

      if (res.ok) {
        setDeleteOpen(false);
        toast({ title: "Owner deleted" });
        router.push("/admin/owners");
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        const msg =
          typeof json?.error === "string"
            ? json.error
            : "Failed to delete owner. Please try again.";
        setDeleteError(msg);
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function handleDeleteOpenChange(open: boolean) {
    setDeleteOpen(open);
    if (!open) setDeleteError(null);
  }

  return (
    <div className="max-w-lg">
      <Link
        href="/admin/owners"
        className="text-sm text-primary hover:underline mb-4 block"
      >
        &larr; Back to Owners
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold">{owner.name}</h1>
        <Badge variant="secondary" className="shrink-0">
          {propertyCount} {propertyCount === 1 ? "property" : "properties"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Owner</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="Jane Smith" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this owner. Owners with linked properties cannot be
            deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete Owner</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {owner.name}?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. The owner record will be permanently
                  removed.
                </DialogDescription>
              </DialogHeader>
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete Owner"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
