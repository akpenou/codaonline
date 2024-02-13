import puppeteer from "puppeteer";
import FormData from "form-data";
import fetch, { Response } from "node-fetch";
import { sleep } from "./utils";

interface Product {
  gtin: string;
  prefix: string;
  mpn: string;
  sku: string;
  brand: string;
  subBrand: string;
  productNames: ProductName[];
  description: string;
  webLink: string;
  completionLevel: number;
  companyId: number;
  targetMarket: string[];
  codeGpc: string;
  isPrivate: boolean;
  category: string;
  netContents: NetContent[];
  adhereToTheSectoralAgreement: boolean;
  vbGs1CompletionLevel: number;
  imagesAddedByUrl: any[]; // Replace `any` with a more specific type if you know the structure of the objects in this array
  productResellerType: string;
}

interface ProductName {
  value: string;
  lang: string;
}

interface NetContent {
  netContent: string;
  measurementUnitCode: string;
}

export class CodaOnline {
  email?: string;
  password?: string;
  accessToken?: string;

  constructor(args: {
    email?: string;
    password?: string;
    accessToken?: string;
  }) {
    const { email, password, accessToken } = args;
    if (!(email && password) && !accessToken) {
      throw new Error("You should indicate email/password or access token");
    }

    this.email = email;
    this.password = password;
    this.accessToken = accessToken;
  }

  async throwIfRequestError(response: Response) {
    const res = response.clone();
    if (!res.ok) {
      throw new Error(
        `HTTP error!\nstatus: ${res.status}\nmessage: ${await res.text()}`
      );
    }

    return false;
  }

  async getAccessToken(
    email: string | undefined = this.email,
    password: string | undefined = this.password
  ) {
    if (!(email && password)) {
      throw new Error("email/password is missing");
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
    const page = await browser.newPage();

    // Go to the website
    await page.goto("https://codeonline-gtin.gs1.fr/");
    try {
      await page.waitForSelector("#onetrust-consent-sdk");
      await page.click("#onetrust-accept-btn-handler");
      await sleep(1000);
    } catch (error) {
      console.log("no cookies");
    }

    // Fill the form
    await page.waitForSelector("input#Email", { visible: true });
    await page.type("input#Email", email);
    await page.click("button#connexion_button");

    await page.waitForSelector("input#password-field", { visible: true });
    await page.type("input#password-field", password);

    await sleep(1000);

    await page.click(".gs1-page-content button#SubmitPassword");
    try {
      await page.waitForNavigation({ timeout: 60_000 });
    } catch (error) {
      console.log("long navigation");
    }

    try {
      await page.waitForSelector("app main dashboard", { timeout: 60_000 });
    } catch (error) {
      console.log("no dashboard");
    }

    // Extract jwtToken from cookies
    const cookies = await page.cookies();
    const jwtCookie = cookies.find((cookie) => cookie.name === "jwtToken");

    // Extract jwtToken from local storage
    const jwtLocalStorage = await page.evaluate(() => {
      return localStorage.getItem("jwtToken");
    });

    // Close the browser
    await browser.close();

    if (jwtLocalStorage) {
      const accessToken: string = JSON.parse(jwtLocalStorage);

      if (!accessToken) {
        throw new Error("jwtToken not found");
      }

      this.accessToken = accessToken;
      return accessToken;
    }

    if (!jwtCookie) {
      throw new Error("jwtToken not found");
    }

    return jwtCookie?.value;
  }

  async getCodeEAN() {
    if (!this.accessToken) {
      this.accessToken = await this.getAccessToken();
    }

    const url = "https://api.codeonline.fr/api/company/nextGtin?prefix=3666355";
    const options = {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        Authorization: `Bearer ${this.accessToken}`,
      },
    };

    return fetch(url, options).then(async (response) => {
      this.throwIfRequestError(response);

      const data = JSON.parse(await response.text());
      return data;
    });
  }

  async createEAN(data: {
    gtin: string;
    brand: string;
    productName: string;
    description: string;

    sku: string;
    mpn?: string;
    subBrand?: string;
  }) {
    if (!this.accessToken) {
      this.accessToken = await this.getAccessToken();
    }

    const formData = new FormData();

    const companyId = 975232958;
    const codeGPC = "10001355";
    const category = "Assortiments de Vêtements d’une Pièce";

    // const codeGPC = "10001333";
    // const category = "Robes";

    const dataPayload: Product = {
      gtin: data.gtin, // "3666355054241",
      prefix: data.gtin.slice(0, 8), // "3666355"
      mpn: data.mpn || "", // "toto",
      sku: data.sku, // "8698982924613--",
      brand: data.brand, // "DEMO",
      subBrand: data.subBrand || "", // "nono",
      productNames: [{ value: data.productName, lang: "fr" }], // [{ value: "DEMO", lang: "fr" }],
      description: data.description, // "<p>Boots en daim - IRO</p>\n<p>Taille : 38</p>\n<p>État : Très bon état</p>\n<p>Packaging : Aucun</p>",
      webLink: "",
      completionLevel: 0,
      companyId: companyId,
      targetMarket: ["250"],
      codeGpc: codeGPC,
      isPrivate: false,
      category: category,
      netContents: [{ netContent: "1", measurementUnitCode: "H87" }],
      adhereToTheSectoralAgreement: true,
      vbGs1CompletionLevel: 5,
      imagesAddedByUrl: [],
      productResellerType: "OWN_BRAND",
    };

    formData.append("form", JSON.stringify(dataPayload));

    const url = "https://api.codeonline.fr/api/products";
    const options = {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    };

    return fetch(url, options).then(async (response) => {
      this.throwIfRequestError(response);

      const data = await response.json();
      return data;
    });
  }
}
