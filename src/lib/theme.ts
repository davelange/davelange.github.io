type Theme = {
  subs: ((theme: "dark" | "light") => void)[];
  toggle: () => void;
};

function toggleTheme() {
  document.documentElement.classList.toggle("dark");
  const newTheme = document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
  window.localStorage.setItem("theme", newTheme);

  return newTheme;
}

export const theme: Theme = {
  subs: [],
  toggle() {
    const theme = toggleTheme();

    this.subs.forEach((fn) => fn(theme));
  },
};
