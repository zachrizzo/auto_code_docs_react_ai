import React from "react";
import { use } from "react";
import ComponentClient from "@/components/component-client";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default function ClassPage({ params }: PageProps) {
  const { slug } = use(params);
  return <ComponentClient slug={slug} />;
}