import AdminSecurityLayer from "@/components/security/AdminSecurityLayer";

/**
 * Dashboard route-group layout (Gap Analysis Part AK).
 *
 * Created to mount the anti screen-reading security layer once for every
 * admin page instead of touching each page. It wraps — never replaces —
 * page content: individual pages keep rendering their own shell/sidebar.
 * AdminSecurityLayer itself renders a fragment, so no extra DOM ancestor
 * is introduced between body and page content (the DashCode template's
 * fixed elements are untouched).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminSecurityLayer>{children}</AdminSecurityLayer>;
}
