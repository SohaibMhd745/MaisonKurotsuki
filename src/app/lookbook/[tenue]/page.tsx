import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Lookbook } from "@/components/lookbook/Lookbook";
import { collectionsPubliques, tenuesPubliees } from "@/lib/donnees";
import { urlPortrait } from "@/lib/fichiers";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const tenues = await tenuesPubliees();
  return tenues.map((t) => ({ tenue: t.slug }));
}

type Params = { params: Promise<{ tenue: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tenue: slug } = await params;
  const tenue = (await tenuesPubliees()).find((t) => t.slug === slug);
  if (!tenue) return { title: "Le Lookbook" };
  const image = urlPortrait(tenue);
  return {
    title: tenue.nom,
    description: tenue.details || `${tenue.nom}, une tenue de la Maison Kurotsuki.`,
    openGraph: image ? { images: [{ url: image, width: 600, height: 1200, alt: tenue.nom }] } : undefined,
  };
}

export default async function PageLookbook({ params }: Params) {
  const { tenue: slug } = await params;
  const [tenues, collections] = await Promise.all([tenuesPubliees(), collectionsPubliques()]);
  if (!tenues.some((t) => t.slug === slug)) notFound();
  return (
    <Suspense fallback={<Lookbook tenues={tenues} collections={collections} slug={slug} statique />}>
      <Lookbook tenues={tenues} collections={collections} slug={slug} />
    </Suspense>
  );
}
