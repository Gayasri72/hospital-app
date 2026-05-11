import { redirect } from "next/navigation";

export default function RegisterPatientRedirect() {
  redirect("/patients");
}
