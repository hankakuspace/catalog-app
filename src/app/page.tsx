// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const shop = searchParams.shop;
  const host = searchParams.host;

  if (shop) {
    redirect(`/api/auth?shop=${shop}${host ? `&host=${host}` : ""}`);
  } else if (host) {
    redirect(`/api/auth?host=${host}`);
  } else {
    redirect(`/api/auth`);
  }
}
