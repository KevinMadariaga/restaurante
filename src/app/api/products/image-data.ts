import { HttpError } from "@/lib/http";

export function decodeImage(dataUrl: string) {
  const [head, b64] = dataUrl.split(",");
  const mime = head.slice(5, head.indexOf(";"));
  const data = Buffer.from(b64, "base64");
  if (data.length > 1_000_000) throw new HttpError(413, "La imagen supera 1 MB");
  return { data, mime };
}
