import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";

interface CleanerHeaderProps {
  cleaner: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean | null;
  };
}

export function CleanerHeader({ cleaner }: CleanerHeaderProps) {
  return (
    <>
      <Link
        href="/admin/cleaners"
        className="text-sm text-primary hover:underline mb-4 block"
      >
        &larr; Back to Cleaners
      </Link>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{cleaner.fullName}</h1>
          <div className="mt-1 space-y-0.5">
            {cleaner.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${cleaner.email}`} className="hover:underline">
                  {cleaner.email}
                </a>
              </p>
            )}
            {cleaner.phone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <a href={`tel:${cleaner.phone}`} className="hover:underline">
                  {cleaner.phone}
                </a>
              </p>
            )}
          </div>
        </div>
        <Badge variant={cleaner.isActive !== false ? "default" : "secondary"}>
          {cleaner.isActive !== false ? "Active" : "Inactive"}
        </Badge>
      </div>
    </>
  );
}
