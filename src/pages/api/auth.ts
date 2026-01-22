// src/pages/api/auth.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify";

export const config = {
  runtime: "nodejs",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const shop = req.query.shop as string;

  if (!shop) {
    return res.status(400).send("Missing shop parameter");
  }

  await shopify.auth.begin({
    shop,
    callbackPath: "/api/auth/callback",
    isOnline: false, // offline token
    rawRequest: req,
    rawResponse: res,
  });
}
