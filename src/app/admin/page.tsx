import { redirect } from "next/navigation";

/** Dashboard removed — sidebar covers everything. Land on Command Center. */
export default function AdminHomePage() {
  redirect("/admin/command-center");
}
