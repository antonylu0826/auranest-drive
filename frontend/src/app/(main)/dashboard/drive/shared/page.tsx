import { redirect } from "next/navigation";

export default function SharedRedirect() {
  redirect("/dashboard/spaces");
}
