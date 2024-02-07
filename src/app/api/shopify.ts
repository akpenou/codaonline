import fetch from "node-fetch";

export class Shopify {
  apiKey: string;
  domain: string;
  apiVerison: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.domain = "personal-seller-dev-iidi.myshopify.com";
    this.apiVerison = "2023-10";
  }

  async fetchAPI<T = unknown>(
    path: string,
    options?: {
      method?: string;
      params?: { [key: string]: string | number };
      data?: object;
    }
  ) {
    const reqURL = new URL(`https://${this.domain}/admin/api/2023-10${path}`);
    for (const [key, value] of Object.entries(options?.params ?? {})) {
      reqURL.searchParams.append(key, String(value));
    }

    console.log({ ...options });

    const response = await fetch(reqURL, {
      method: options?.method ?? "GET",
      headers: {
        "X-Shopify-Access-Token": this.apiKey,
        "Content-Type": "application/json",
      },
      // params: params,
      body: options?.data ? JSON.stringify(options?.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error!\nstatus: ${
          response.status
        }\nmessage: ${await response.text()}`
      );
    }

    return {
      data: (await response.json()) as T,
      headers: response.headers,
    };
  }

  async fetch<T = unknown>(
    url: string,
    options?: {
      method?: string;
      params?: { [key: string]: string | number };
      data?: object;
    }
  ) {
    const reqURL = new URL(url);
    for (const [key, value] of Object.entries(options?.params ?? {})) {
      reqURL.searchParams.append(key, String(value));
    }

    const response = await fetch(reqURL, {
      method: options?.method ?? "GET",
      headers: {
        "X-Shopify-Access-Token": this.apiKey,
      },
      // params: params,
      body: options?.data ? JSON.stringify(options?.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error!\nstatus: ${
          response.status
        }\nmessage: ${await response.json()}`
      );
    }

    return {
      data: (await response.json()) as T,
      headers: response.headers,
    };
  }

  async getCatalog(options?: { [key: string]: string | number }) {
    type Products = { products: any[] };
    let products: any[] = [];

    let { data, headers } = await this.fetchAPI<Products>("/products.json", {
      params: { limit: 250, ...options },
    });

    products = products.concat(data?.products);

    while (headers.get("link")) {
      console.log({ len: products.length });
      const nextPageURL = headers
        .get("link")
        ?.match(/<(?<nextPage>[^>]+)>;\s*rel="next"/)?.groups?.nextPage;

      if (!nextPageURL) {
        break;
      }

      const res = await this.fetch<Products>(nextPageURL);

      data = res.data;
      headers = res.headers;
      products = products.concat(data?.products);
    }

    return [...products];
  }

  async addCodeEAN(variantId: string, codeEAN: string) {
    const { data: variant } = await this.fetchAPI(
      `/variants/${variantId}.json`,
      {
        method: "PUT",
        data: {
          variant: {
            id: parseInt(variantId),
            barcode: codeEAN,
          },
        },
      }
    );

    return variant as { variant: any };
  }
}
