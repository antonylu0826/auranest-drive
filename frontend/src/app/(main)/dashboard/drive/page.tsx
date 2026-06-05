import { redirect } from "next/navigation";

export default function DriveRedirect() {
  redirect("/dashboard/spaces");
}
