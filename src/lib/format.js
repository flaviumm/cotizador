export function money(value) {
  const formatted = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
  // Replace non-breaking space with regular space
  return formatted.replace(/ /g, " ");
}
