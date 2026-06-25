import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function AssessmentRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/documents");
  }, []);
  return null;
}
