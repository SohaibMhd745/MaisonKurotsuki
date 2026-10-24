import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditeurTierList } from "@/components/jury/EditeurTierList";
import { collectionsPubliques, tenuesPubliees, tierList, tierLists } from "@/lib/donnees";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await tierLists()).map((tl) => ({ id: tl.id }));
}

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const tl = await tierList((await params).id);
  return { title: tl?.titre ?? "Le Jury" };
}

export default async function PageTierList({ params }: Params) {
  const { id } = await params;
  const [tl, tenues, collections] = await Promise.all([tierList(id), tenuesPubliees(), collectionsPubliques()]);
  if (!tl) notFound();
  return <EditeurTierList initiale={tl} tenuesInitiales={tenues} collections={collections} />;
}
