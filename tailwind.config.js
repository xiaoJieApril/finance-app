/** @type {import('tailwindcss').Config} */
module.exports = function (api) {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ["nativewind/babel"], // 新增這一行
  };
};
