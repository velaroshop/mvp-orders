// Server only. Public own pages are cached (ISR): after any change, refresh every kind of public page route.
import { revalidatePath } from "next/cache";

export function refreshPublicPages() {
  revalidatePath("/p/[slug]", "page");
  revalidatePath("/legal/[org]/[slug]", "page");
  revalidatePath("/sites/[host]/[[...path]]", "page");
}
