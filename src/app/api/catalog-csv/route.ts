import { type NextRequest } from "next/server";

import fs from "fs";
import _ from "lodash";
import Papa from "papaparse";

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
  );

  const dataCSV = variants.map(csvMapper);
  const csv = Papa.unparse(dataCSV);
  fs.writeFileSync("/Users/akpenou/startup/codaonline/data/history.csv", csv);

  return Response.json(variants);
}

const csvMapper = (data: any) => {
  const res = {
    sku: data?.variant?.id,
    title: data?.title,
    variantId: data?.variant?.id,
    vendor: data?.vendor,
    created_at: data?.variant?.created_at,
    updated_at: data?.variant?.updated_at,
    published_at: data?.published_at,
    tags: data?.tags,
    status: data?.status,
    price: data?.variant?.price,
    barcode: data?.variant?.barcode,
  };

  return res;
};
