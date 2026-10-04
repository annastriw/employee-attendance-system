const bytes = (value: string) => new TextEncoder().encode(value).length;

export function passwordChangeError(current: string, replacement: string, confirmation: string): string | null {
  if (!current || bytes(current) > 72 || Array.from(replacement).length < 12 || bytes(replacement) > 72) {
    return 'Isi password saat ini dan gunakan password baru minimal 12 karakter, maksimal 72 byte.';
  }
  if (replacement === current) return 'Gunakan password baru yang berbeda dari password saat ini.';
  if (replacement !== confirmation) return 'Konfirmasi password belum sama.';
  return null;
}
