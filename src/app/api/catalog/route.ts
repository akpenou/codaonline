import { type NextRequest } from "next/server";

import { z } from "zod";
import _ from "lodash";

import { Shopify } from "../shopify";
import { CodaOnline } from "../coda-online";

export async function GET(request: NextRequest) {
  console.log(request.headers);
  const email = request.headers.get("email") || "personalsellerparis@gmail.com";
  const password = request.headers.get("password") || "GS1gs123!";
  console.log({ email, password });

  if (!email || !password) {
    throw new Error("email - password is missing");
  }
  const codaonline = new CodaOnline({
    email,
    password,
  });

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
  );

  return Response.json(variants);
}

export async function POST(request: Request) {
  const accessToken = request.headers.get("access-token");
  if (!accessToken) {
    throw new Error("Header 'access-token' is missing");
  }

  const { variantId, codeEAN } = z
    .object({
      variantId: z.union([z.number(), z.string()]),
      codeEAN: z.union([z.number(), z.string()]),
    })
    .parse(await request.json());

  const shopify = new Shopify(accessToken);
  const { variant } = await shopify.addCodeEAN(
    String(variantId),
    String(codeEAN)
  );

  return Response.json(variant);
}
