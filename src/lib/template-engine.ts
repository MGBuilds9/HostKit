export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
    return variables[key] ?? "[missing]";
  });
}

export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+(?:\.\w+)*)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

export function buildVariablesFromProperty(
  property: Record<string, unknown>,
  ownerName?: string,
  guestName?: string,
  checkinDate?: string,
  checkoutDate?: string
): Record<string, string> {
  const vars: Record<string, string> = {};

  if (guestName) vars["guestName"] = guestName;
  if (checkinDate) vars["checkinDate"] = checkinDate;
  if (checkoutDate) vars["checkoutDate"] = checkoutDate;
  if (ownerName) vars["owner.name"] = ownerName;

  const fieldMap: Record<string, string> = {
    name: "property.name",
    addressStreet: "property.addressStreet",
    addressUnit: "property.addressUnit",
    addressCity: "property.addressCity",
    floor: "property.floor",
    wifiName: "property.wifiName",
    wifiPassword: "property.wifiPassword",
    parkingSpot: "property.parkingSpot",
    checkinTime: "property.checkinTime",
    checkoutTime: "property.checkoutTime",
    buzzerName: "property.buzzerName",
    thermostatDefault: "property.thermostat",
    hostPhone: "property.hostPhone",
    ownerPhone: "property.ownerPhone",
    slug: "property.slug",
  };

  for (const [field, varName] of Object.entries(fieldMap)) {
    const val = property[field];
    if (val != null) vars[varName] = String(val);
  }

  if (property.slug) {
    const base = process.env.NEXTAUTH_URL ?? "https://hostkit.mkgbuilds.com";
    vars["property.guideUrl"] = `${base}/g/${property.slug}`;
  }

  const parts = [
    property.addressStreet,
    property.addressUnit && `Unit ${property.addressUnit}`,
    property.addressCity,
    property.addressProvince,
    property.addressPostal
  ].filter(Boolean);
  vars["property.addressFull"] = parts.join(", ");

  if (property.checkinTime) {
    vars["property.checkinTime"] = formatTime(String(property.checkinTime));
  }
  if (property.checkoutTime) {
    vars["property.checkoutTime"] = formatTime(String(property.checkoutTime));
  }

  if (property.idLeadHours != null) {
    vars["property.idLeadHours"] = String(property.idLeadHours);
  }

  return vars;
}

function formatTime(time24: string): string {
  try {
    return new Date(`2000-01-01T${time24}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return time24;
  }
}
