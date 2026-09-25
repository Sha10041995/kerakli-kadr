// Verification levels (mirrors public.verification_level in SQL):
// 0 unverified, 1 phone, 2 identity, 3 certificate, 4 company verified.

export type VerificationFlags = {
  phoneVerified?: boolean | null;
  identityVerified?: boolean | null;
  certificateVerified?: boolean | null;
  companyVerified?: boolean | null;
};

export function verificationLevel(f: VerificationFlags): 0 | 1 | 2 | 3 | 4 {
  if (f.companyVerified) return 4;
  if (f.certificateVerified) return 3;
  if (f.identityVerified) return 2;
  if (f.phoneVerified) return 1;
  return 0;
}

export function verificationBadges(f: VerificationFlags): string[] {
  const out: string[] = [];
  if (f.phoneVerified) out.push("Telefon tasdiqlangan");
  if (f.identityVerified) out.push("Shaxs tasdiqlangan");
  if (f.certificateVerified) out.push("Sertifikat tasdiqlangan");
  if (f.companyVerified) out.push("Kompaniya tasdiqlangan");
  return out;
}
