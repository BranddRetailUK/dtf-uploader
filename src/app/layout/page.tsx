import { LayoutV2Studio } from "@/components/layout-v2-studio";
import { requireUser } from "@/lib/auth";
import { getLayoutsForUser } from "@/lib/layouts";

export default async function LayoutV2Page() {
  const user = await requireUser();
  const initialLayouts = await getLayoutsForUser(user.id);

  return <LayoutV2Studio initialLayout={initialLayouts[0] ?? null} userId={user.id} />;
}
