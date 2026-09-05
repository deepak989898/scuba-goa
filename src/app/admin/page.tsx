import { redirect } from "next/navigation";

/** Admin home — land on bookings. */
export default function AdminHomePage() {
  redirect("/admin/bookings");
}
