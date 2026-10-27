// src/lib/shopify.ts

import "@shopify/shopify-api/adapters/node";
import { sanitizeRichText } from "./richText";
import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac, timingSafeEqual } from "node:crypto";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { Firestore } from "@google-cloud/firestore";
import { SessionStorage } from "@shopify/shopify-app-session-storage";

// =======================================
// 🔥 Firestore 初期化（admin SDK と同じ認証情報を使用）
// =======================================
const firestore = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

// =======================================
// ✅ Shopify セッション保存用：Firestore保存可能なplain objectへ変換
// =======================================
function serializeSession(session: any) {
  const plainSession =
    typeof session.toObject === "function"
      ? session.toObject()
      : {
          id: session.id,
          shop: session.shop,
          state: session.state,
          isOnline: session.isOnline,
          scope: session.scope,
          accessToken: session.accessToken,
          expires: session.expires,
          onlineAccessInfo: session.onlineAccessInfo,
        };

  return JSON.parse(JSON.stringify(plainSession));
}

// =======================================
// ✅ Shopify セッションストレージ Firestore 実装
// =======================================

class FirestoreSessionStorageAdapter implements SessionStorage {
  private collectionName: string;

  constructor(
    private firestore: Firestore,
    collectionName: string,
  ) {
    this.collectionName = collectionName;
  }

  async storeSession(session: any): Promise<boolean> {
    const plainSession = serializeSession(session);

    await this.firestore
      .collection(this.collectionName)
      .doc(plainSession.id)
      .set(plainSession);

    console.log("🔥 Firestore storeSession success:", plainSession.id);

    return true;
  }

  async loadSession(id: string): Promise<any | undefined> {
    const doc = await this.firestore
      .collection(this.collectionName)
      .doc(id)
      .get();
    return doc.exists ? doc.data() : undefined;
  }

  async deleteSession(id: string): Promise<boolean> {
    await this.firestore.collection(this.collectionName).doc(id).delete();
    return true;
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    const batch = this.firestore.batch();

    ids.forEach((id) =>
      batch.delete(this.firestore.collection(this.collectionName).doc(id)),
    );

    await batch.commit();

    return true;
  }

  async findSessionsByShop(shop: string): Promise<any[]> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where("shop", "==", shop)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }
}

const sessionStorage = new FirestoreSessionStorageAdapter(
  firestore,
  "shopify_sessions_catalog_app",
);

// =======================================
// ✅ Shopify API 設定
// =======================================
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: "catalog-app-swart.vercel.app",
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: true,
  sessionStorage,
});

export { shopify, sessionStorage };

// Never propagate SDK errors: InvalidJwtError includes the raw bearer token.
export async function requireAdminShop(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || "");
    if (!match) throw new Error("Unauthorized");
    const claims = await shopify.session.decodeSessionToken(match[1]);
    const now = Math.floor(Date.now() / 1000);
    if (![claims.exp, claims.nbf, claims.iat].every(Number.isFinite) ||
        claims.exp <= now || claims.nbf > now || claims.iat > now ||
        claims.exp <= claims.iat || [claims.sub, claims.sid, claims.jti].some((value) => typeof value !== "string" || !value)) {
      throw new Error("Unauthorized");
    }
    const dest = new URL(claims.dest);
    if (dest.protocol !== "https:" || dest.port || dest.username || dest.password ||
        !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(dest.hostname) ||
        !["", "/"].includes(dest.pathname) || dest.search || dest.hash ||
        claims.iss !== `${dest.origin}/admin`) throw new Error("Unauthorized");
    for (const supplied of [req.query.shop, req.body?.shop]) {
      if (supplied !== undefined && supplied !== dest.hostname) {
        res.status(403).json({ error: "Forbidden" });
        return null;
      }
    }
    return dest.hostname;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
}

export function ownsCatalog(data: FirebaseFirestore.DocumentData | undefined, shop: string): boolean {
  return data?.shop === shop;
}

export function managementCatalog(data: FirebaseFirestore.DocumentData) {
  const fields = ["title", "label", "leadText", "products", "shop", "columnCount", "passwordEnabled", "expiresAt", "createdAt", "updatedAt", "previewUrl"];
  const safe = Object.fromEntries(fields.filter((key) => Object.hasOwn(data, key)).map((key) => [key, data[key]]));
  if (Object.hasOwn(safe, "leadText")) safe.leadText = sanitizeRichText(safe.leadText);
  return { ...safe, usernameConfigured: Boolean(data.username), passwordConfigured: Boolean(data.password) };
}

function previewKey(purpose: string): Buffer {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) throw new Error("Preview signing unavailable");
  return createHmac("sha256", secret).update(`catalog-app:preview:v1:${purpose}`).digest();
}

function credentialVersion(data: FirebaseFirestore.DocumentData): string {
  const values = [data.username, data.password];
  // Preserve the exact legacy fingerprint until credentials first change.
  if (data.previewAuthRevision !== undefined) {
    if (typeof data.previewAuthRevision !== "string" || !/^[a-f0-9]{64}$/.test(data.previewAuthRevision)) {
      throw new Error("Invalid preview revision");
    }
    values.push(data.previewAuthRevision);
  }
  return createHmac("sha256", previewKey("credentials"))
    .update(JSON.stringify(values)).digest("base64url");
}

export function previewAttemptKey(id: string, source: string): string {
  return createHmac("sha256", previewKey("login-attempts"))
    .update(JSON.stringify([id, source])).digest("hex");
}

export function issuePreviewToken(id: string, data: FirebaseFirestore.DocumentData): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ id, iat, exp: iat + 8 * 60 * 60, version: credentialVersion(data) })).toString("base64url");
  const signature = createHmac("sha256", previewKey("view-token")).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPreviewToken(token: string, id: string, data: FirebaseFirestore.DocumentData): boolean {
  try {
    if (token.length > 4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const expected = createHmac("sha256", previewKey("view-token")).update(parts[0]).digest();
    const received = Buffer.from(parts[1], "base64url");
    if (received.toString("base64url") !== parts[1] || expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    return payload.id === id && payload.version === credentialVersion(data) &&
      Number.isInteger(payload.exp) && Number.isInteger(payload.iat) &&
      payload.iat <= now && payload.exp > now && payload.exp - payload.iat === 8 * 60 * 60;
  } catch {
    return false;
  }
}

export function previewCredentialsMatch(data: FirebaseFirestore.DocumentData, username: unknown, password: unknown): boolean {
  if (typeof username !== "string" || typeof password !== "string") return false;
  const hash = (value: unknown) => createHmac("sha256", previewKey("login")).update(JSON.stringify(value)).digest();
  const userMatches = timingSafeEqual(hash(username), hash(data.username));
  const passMatches = timingSafeEqual(hash(password), hash(data.password));
  return userMatches && passMatches;
}

export function publicCatalog(id: string, data: FirebaseFirestore.DocumentData) {
  const productFields = ["id", "title", "price", "customPrice", "imageUrl", "imageUrls", "artist", "year", "dimensions", "medium", "frame", "material", "size", "technique", "certificate", "onlineStoreUrl", "availabilityStatus", "editionTotal"];
  return {
    id, title: data.title || "", leadText: sanitizeRichText(data.leadText), columnCount: data.columnCount || 3,
    expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate().toISOString() : data.expiresAt || null,
    products: (Array.isArray(data.products) ? data.products : []).map((product: Record<string, unknown>) =>
      Object.fromEntries(productFields.filter((key) => Object.hasOwn(product, key)).map((key) => [key, product[key]]))),
  };
}
