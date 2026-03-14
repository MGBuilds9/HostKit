import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toPascalCase(str: string): string {
  return str.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
}
