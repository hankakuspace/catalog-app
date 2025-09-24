// src/app/page.tsx
import { redirect } from "next/navigation";

interface HomeProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function Home({ searchParams }: HomeProps) {
  const shop = (searchParams?.shop as string | undefined) || undefined;
  const host = (searchParams?.host as string | undefined) || undefined;

  if (shop) {
    redirect(`/api/auth?shop=${shop}${host ? `&host=${host}` : ""}`);
  } else if (host) {
    redirect(`/api/auth?host=${host}`);
  } else {
    redirect(`/api/auth`);
  }
}
