/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /*
   * Empacota o servidor com só as dependências que ele de fato importa.
   *
   * Sem isto, a imagem de produção precisa carregar `node_modules` inteiro —
   * centenas de MB de coisa que só o build usa. Com `standalone`, o Next escreve
   * em `.next/standalone` um servidor pronto para `node server.js`.
   */
  output: "standalone",
};

export default nextConfig;
