export function isValidEmail(value: string) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value.trim()); }
export function isValidCPF(value: string) {
  const cpf = value.replace(/\\D/g, "");
  if (cpf.length !== 11 || /^(\\d)\\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}
export function isValidPhone(value: string) { const d=value.replace(/\\D/g,""); return d.length===10 || d.length===11; }
export function isValidPlate(value: string) { return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(value.replace(/[^A-Z0-9]/gi,"").toUpperCase()); }
export function slugify(value: string) { return value.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
