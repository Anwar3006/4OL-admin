import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
  },
  {
    rules: {
      "@next/next/no-assign-module-variable": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "jsx-a11y/alt-text": "warn",
      "react/display-name": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "coverage/**",
      "redesign/**",
      "tsconfig.tsbuildinfo",
      "next-env.d.ts",
    ],
  },
];

export default config;
