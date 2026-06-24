import { useEffect, useState } from "react";

import { apiGet } from "@/src/api";
import MyApplications from "../my-applications";
import AdminLeads from "../admin/leads";

export default function ApplicationsTab() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    apiGet<any>("/auth/me")
      .then((me: any) => setIsAdmin(me?.role && me.role !== "user"))
      .catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) return null;
  if (isAdmin) return <AdminLeads />;
  return <MyApplications />;
}
