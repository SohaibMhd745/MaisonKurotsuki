const format = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function dateLongue(iso: string | Date): string {
  return format.format(typeof iso === "string" ? new Date(iso) : iso);
}
