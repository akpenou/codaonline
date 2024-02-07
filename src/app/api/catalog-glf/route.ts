import _ from "lodash";
import { Shopify } from "../shopify";

export async function GET(request: Request) {
  const accessToken = request.headers.get("access-token");
  if (!accessToken) {
    throw new Error("Header 'access-token' is missing");
  }

  const shopify = new Shopify(accessToken);
  const GLFProducts = await shopify.getCatalog({
    collection_id: "600837161285",
  });

  const variants = _.uniqBy(
    _.flatten(
      GLFProducts.map(({ variants, images, ...product }) =>
        variants.map((variant: object) => ({ ...product, variant }))
      )
    ),
    "variant.id"
  );

  console.log(`send ${variants.length} items`);

  return Response.json(variants);
}
