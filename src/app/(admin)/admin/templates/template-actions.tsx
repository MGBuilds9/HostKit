"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function TemplateDeleteButton({ id, apiPath }: { id: string; apiPath: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this template?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete template.");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={deleting}
      aria-label="Delete template"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
