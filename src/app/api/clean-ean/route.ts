import { type NextRequest } from "next/server";
import _ from "lodash";

import { Shopify } from "../shopify";
import { sleep } from "../utils";

export async function POST(request: NextRequest) {
  const accessToken = request.headers.get("access-token");
  if (!accessToken) {
    throw new Error("Header 'access-token' is missing");
  }

  const shopify = new Shopify(accessToken);

  const products = await shopify.getCatalog({
    status: "active",
  });

  const GLFProducts = await shopify.getCatalog({
    collection_id: "600837161285",
  });

  const shopifyVariants = _.flatten(
    products.map(({ variants, ...product }) =>
      variants.map((variant: object) => ({ ...product, variant }))
    )
  );
  const glfVariants = _.flatten(
    GLFProducts.map(({ variants, ...product }) =>
      variants.map((variant: object) => ({ ...product, variant }))
    )
  );
  const glfVariantsIds = glfVariants.map(({ variant }: any) => variant?.id);

  const variants = shopifyVariants.filter(
    ({ variant }) => !glfVariantsIds.includes(variant?.id) && variant?.barcode
  );

  console.log({
    variants: variants.length,
    // variant: variants?.[0],
    // product: shopifyVariants?.[0],
    // glfVariant: glfVariants?.[0],
  });

  // let index = 0;
  // let length = variants.length;
  // for (const variant of variants) {
  //   index += 1;
  //   await shopify.addCodeEAN(variant.variant.id, "");
  //   await sleep(80);
  //   console.log(`Processed ${index} of ${length}`);
  //   // break;
  // }

  return Response.json({ response: "ok!" });
}
