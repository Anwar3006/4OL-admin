import LoginForm from "../_components/LoginForm";

const LoginPage = () => {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 h-[98vh] overflow-y-scroll">
        <div className="flex justify-center gap-2 md:justify-start items-end">
          <a href="/register" className="flex items-center gap-2 ">
            <div className="p-2 text-primary-foreground flex size-full items-center justify-center rounded-xl shadow-sm border border-muted">
              <img
                src="/assets/images/all-img/logo.png"
                alt="Logo"
                className="w-10 rounded-md "
              />
            </div>
          </a>
          <span className="text-sm font-medium underline underline-offset-3">
            4 Our Life.
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </div>

      <div className="bg-emerald-500 relative hidden lg:block h-full">
        <img
          src="/assets/images/all-img/AuthImage.png"
          alt="placeholder"
          className="absolute inset-0 h-full w-full object-contain dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
};

export default LoginPage;
