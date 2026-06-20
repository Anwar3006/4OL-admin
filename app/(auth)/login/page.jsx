import LoginForm from "../_components/LoginForm";
import Image from "next/image";
import Link from "next/link";

const LoginPage = () => {
  return (
    // Changed to min-h-dvh for better mobile browser support
    <div className="grid min-h-dvh lg:grid-cols-2 bg-background">
      
      {/* Left Column: Form Container */}
      <div className="flex flex-col p-6 md:p-10 h-full overflow-y-auto">
        <div className="flex items-center">
          {/* Switched to Next.js Link component */}
          <Link href="/login" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex items-center justify-center p-1.5 rounded-xl shadow-sm bg-card">
              {/* Switched to Next.js Image component */}
              <Image
                src="/assets/images/all-img/logo.png"
                alt="4 Our Life Logo"
                width={36}
                height={36}
                className="rounded-md"
                priority
              />
            </div>
            <span className="text-sm font-bold tracking-tight">
              4 Our Life.
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center mt-12 lg:mt-0">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Right Column: Feature Graphic */}
      <div className="relative hidden lg:block bg-[#57CE83] overflow-hidden">
        <Image
          src="/assets/images/all-img/4 Our Life.png"
          alt="4 Our Life Platform Preview"
          fill
          className="object-contain p-12 dark:brightness-[0.8] dark:grayscale-[0.2] transition-all"
          priority
        />
      </div>
    </div>
  );
};

export default LoginPage;