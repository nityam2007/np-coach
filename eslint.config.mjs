import next from "eslint-config-next";

/** eslint-config-next v16 ships a flat-config array — use it directly. */
const eslintConfig = [
  ...next,
  { ignores: [".next/**", "node_modules/**", "directus/**"] },
];

export default eslintConfig;
