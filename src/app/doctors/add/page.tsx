import { redirect } from "next/navigation";

export default function AddDoctorRedirect() {
  redirect("/doctors");
}
