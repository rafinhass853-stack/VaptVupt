export const onlyDigits = (value: string) => value.replace(/\\D/g, "");

export function maskCPF(value: string) {
  const v = onlyDigits(value).slice(0, 11);
  return v.replace(/(\\d{3})(\\d)/, "$1.$2").replace(/(\\d{3})(\\d)/, "$1.$2").replace(/(\\d{3})(\\d{1,2})$/, "$1-$2");
}
export function maskPhone(value: string) {
  const v = onlyDigits(value).slice(0, 11);
  if (v.length <= 10) return v.replace(/(\\d{2})(\\d)/, "($1) $2").replace(/(\\d{4})(\\d)/, "$1-$2");
  return v.replace(/(\\d{2})(\\d)/, "($1) $2").replace(/(\\d{5})(\\d)/, "$1-$2");
}
export function maskPlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}
export function maskYear(value: string) {
  return onlyDigits(value).slice(0, 4);
}
