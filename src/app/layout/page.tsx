import { LayoutV2Studio } from "@/components/layout-v2-studio";
import { requireUser } from "@/lib/auth";

export default async function LayoutV2Page() {
  await requireUser();

  return <LayoutV2Studio />;
}
