// src/app/page.tsx
import { redirect } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Home({ searchParams }: any) {
  const shop = searchParams?.shop as string | undefined;
  const host = searchParams?.host as string | undefined;

  if (shop) {
    redirect(`/api/auth?shop=${shop}${host ? `&host=${host}` : ""}`);
  } else if (host) {
    redirect(`/api/auth?host=${host}`);
  } else {
    redirect(`/api/auth`);
  }
}
