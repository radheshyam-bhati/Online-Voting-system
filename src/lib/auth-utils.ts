"use server";

import { hash, verify } from "@node-rs/bcrypt";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashValue: string): Promise<boolean> {
  return verify(password, hashValue);
}