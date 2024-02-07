import { z } from "zod";
import { CodaOnline } from "../coda-online";
import { sleep } from "../utils";

export async function POST(request: Request) {
  const accessToken = request.headers.get("access-token");
  const data = await request.json();

  if (!accessToken) {
    throw new Error("Header 'access-token' is missing");
  }

  const codaonline = new CodaOnline({
    accessToken,
  });

  const productSchema = z.object({
    sku: z.union([z.number(), z.string()]),
    brand: z.string(),
    productName: z.string(),
    description: z.string(),
  });

  const errors: any[] = [];
  let products = z.union([productSchema, z.array(productSchema)]).parse(data);
  if (!Array.isArray(products)) {
    products = [products];
  }

  console.log({ errors, products });

  const createdProducts = [];

  for (const product of products) {
    console.log({ product });
    try {
      const codeEAN = await codaonline.getCodeEAN();
      console.log({ codeEAN });
      const payload = {
        gtin: codeEAN,
        ...product,
        sku: String(product.sku),
      };
      console.log({ payload });
      const createdProduct = await codaonline.createEAN(payload);

      createdProducts.push(createdProduct);
    } catch (err) {
      console.log(err);
      errors.push({ product, err });
    }
  }

  return Response.json({ createdProducts, errors });
}
