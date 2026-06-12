import Hashids from "hashids";

const salt = process.env.HASHIDS_SALT || "flc-secret-salt-2026";
const minLength = process.env.HASHIDS_MIN_LENGTH
  ? parseInt(process.env.HASHIDS_MIN_LENGTH, 10)
  : 6;

export const hashids = new Hashids(salt, minLength);

export function encodeId(id: number): string {
  return hashids.encode(id);
}

export function decodeId(hash: string): number | null {
  const decoded = hashids.decode(hash);
  if (decoded.length === 0) {
    return null;
  }
  return Number(decoded[0]);
}
