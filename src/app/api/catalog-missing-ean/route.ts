import { type NextRequest } from "next/server";

import _ from "lodash";
import { Shopify } from "../shopify";

export async function GET(request: NextRequest) {
  const accessToken = request.headers.get("access-token");
  if (!accessToken) {
    throw new Error("Header 'access-token' is missing");
  }

  const searchParams = request.nextUrl.searchParams;
  const fields = searchParams.get("fields");

  const shopify = new Shopify(accessToken);
  const products = await shopify.getCatalog({
    status: "active",
    fields: fields ?? "",
  });
  const GLFProducts = await shopify.getCatalog({
    collection_id: "600837161285",
    fields: fields ?? "",
  });

  const variants = _.uniqBy(
    _.flatten(
      [...products, ...GLFProducts].map(({ variants, ...product }) =>
        variants.map((variant: object) => ({ ...product, variant }))
      )
    ),
    "variant.id"
  ).filter(
    ({ variant }) =>
      !variant?.barcode || variant?.barcode === "" || variant?.barcode === " "
  );

  return Response.json(variants.slice(0, 50));
}
