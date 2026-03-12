import { redirect } from "next/navigation";

/**
 * /register is not publicly accessible.
 * Registration is only available through an invitation link sent to the user's
 * email. That link points to /accept-invite?token=<token>.
 *
 * Anyone who navigates here directly (bookmarks, manual URL, old links) is
 * silently redirected to /login.
 */
const RegisterPage = () => {
  redirect("/login");
};

export default RegisterPage;
