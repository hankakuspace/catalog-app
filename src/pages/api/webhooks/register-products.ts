// src/pages/api/webhooks/register-products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { GraphQLClient, gql } from "graphql-request";
import { sessionStorage } from "@/lib/shopify";

type WebhookTopic = "PRODUCTS_CREATE" | "PRODUCTS_UPDATE" | "PRODUCTS_DELETE";

type ExistingWebhookSubscription = {
  id: string;
  topic: WebhookTopic | string;
  endpoint?: {
    __typename?: string;
    callbackUrl?: string;
  } | null;
};

type WebhookSubscriptionsResponse = {
  webhookSubscriptions: {
    edges: {
      node: ExistingWebhookSubscription;
    }[];
  };
};

type WebhookSubscriptionCreateResponse = {
  webhookSubscriptionCreate: {
    webhookSubscription: {
      id: string;
      topic: string;
      endpoint?: {
        __typename?: string;
        callbackUrl?: string;
      } | null;
    } | null;
    userErrors: {
      field: string[] | null;
      message: string;
    }[];
  };
};

const SHOP_DOMAIN = "and-collection-a.myshopify.com";
const CALLBACK_URL =
  "https://catalog-app-swart.vercel.app/api/webhooks/products";

const WEBHOOK_TOPICS: WebhookTopic[] = [
  "PRODUCTS_CREATE",
  "PRODUCTS_UPDATE",
  "PRODUCTS_DELETE",
];

async function getClient(shop: string) {
  const session = await sessionStorage.loadSession(`offline_${shop}`);

  if (!session?.accessToken) {
    throw new Error("Offline session not found");
  }

  return new GraphQLClient(
    `https://${session.shop}/admin/api/2025-07/graphql.json`,
    {
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
      },
    },
  );
}

async function getExistingSubscriptions(client: GraphQLClient) {
  const query = gql`
    query ExistingWebhookSubscriptions {
      webhookSubscriptions(first: 100) {
        edges {
          node {
            id
            topic
            endpoint {
              __typename
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
          }
        }
      }
    }
  `;

  const data = await client.request<WebhookSubscriptionsResponse>(query);

  return data.webhookSubscriptions.edges.map((edge) => edge.node);
}

function hasExistingSubscription(
  subscriptions: ExistingWebhookSubscription[],
  topic: WebhookTopic,
) {
  return subscriptions.some((subscription) => {
    return (
      subscription.topic === topic &&
      subscription.endpoint?.__typename === "WebhookHttpEndpoint" &&
      subscription.endpoint.callbackUrl === CALLBACK_URL
    );
  });
}

async function createWebhookSubscription(
  client: GraphQLClient,
  topic: WebhookTopic,
) {
  const mutation = gql`
    mutation CreateWebhookSubscription(
      $topic: WebhookSubscriptionTopic!
      $callbackUrl: URL!
    ) {
      webhookSubscriptionCreate(
        topic: $topic
        webhookSubscription: {
          callbackUrl: $callbackUrl
          format: JSON
        }
      ) {
        webhookSubscription {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await client.request<WebhookSubscriptionCreateResponse>(
    mutation,
    {
      topic,
      callbackUrl: CALLBACK_URL,
    },
  );

  const result = data.webhookSubscriptionCreate;

  if (result.userErrors.length > 0) {
    return {
      topic,
      created: false,
      errors: result.userErrors,
    };
  }

  return {
    topic,
    created: true,
    webhookSubscription: result.webhookSubscription,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const client = await getClient(SHOP_DOMAIN);
    const existingSubscriptions = await getExistingSubscriptions(client);

    const results = [];

    for (const topic of WEBHOOK_TOPICS) {
      if (hasExistingSubscription(existingSubscriptions, topic)) {
        results.push({
          topic,
          created: false,
          skipped: true,
          reason: "Already registered",
        });
        continue;
      }

      const result = await createWebhookSubscription(client, topic);
      results.push(result);
    }

    return res.status(200).json({
      ok: true,
      shop: SHOP_DOMAIN,
      callbackUrl: CALLBACK_URL,
      results,
    });
  } catch (err) {
    console.error("❌ product webhook register error:", err);

    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }

    return res.status(500).json({ error: String(err) });
  }
}
