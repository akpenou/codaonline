import { CodaOnline } from "../coda-online";

export async function GET(request: Request) {
  console.log(request.headers);
  const email = request.headers.get("email");
  const password = request.headers.get("password");
  console.log({ email, password });

  if (!email || !password) {
    throw new Error("email - password is missing");
  }
  const codaonline = new CodaOnline({
    email,
    password,
  });

  const accessToken = await codaonline.getAccessToken();

  return Response.json({
    accessToken,
  });
}
