import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Mail, Phone } from "lucide-react";

interface OwnerCardProps {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  propertyCount: number;
}

export function OwnerCard({ id, name, email, phone, propertyCount }: OwnerCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Link href={`/admin/owners/${id}`} className="font-semibold hover:underline text-lg">
            {name}
          </Link>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {propertyCount} {propertyCount === 1 ? "property" : "properties"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{email}</span>
        </div>
        {phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{phone}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
