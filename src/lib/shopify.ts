export async function fetchProducts(session: Session) {
  try {
    const client = new shopify.clients.Graphql({ session });

    const query = `
      {
        products(first: 10) {
          edges {
            node {
              id
              title
              handle
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await client.query<{
      data: {
        products: {
          edges: { node: { id: string; title: string; handle: string } }[];
        };
      };
    }>({
      data: query,
    });

    return response.body.data.products.edges.map((edge) => edge.node) ?? [];
  } catch (error) {
    console.error("❌ fetchProducts error:", error);
    throw error;
  }
}
