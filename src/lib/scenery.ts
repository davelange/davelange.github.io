import Zdog, { TAU } from "zdog";
import { theme } from "./theme";

const currentTheme = document.documentElement.classList.contains("dark")
  ? "dark"
  : "light";

const colors = {
  background: "#e2e8f0",
  starsOnDark: "#fff",
  starsOnLight: "#94a3b8",
  primary1: "#3730a3",
  primary2: "#4338ca",
  secondary: "#831843",
  secondary2: "#9d174d",
};

function randomNegativeOrPositive(max: number) {
  return Math.ceil(Math.random() * max) * (Math.round(Math.random()) ? 1 : -1);
}

function getRandomPositions(amount: number) {
  return new Array(amount).fill(0).map(() => ({
    x: randomNegativeOrPositive(400),
    y: randomNegativeOrPositive(200),
    speed: Math.random() / 200,
  }));
}

// Shapes
let illo = new Zdog.Illustration({
  element: ".zdog-canvas",
  dragRotate: true,
});

let planet = new Zdog.Anchor({
  addTo: illo,
});

let moonBase = new Zdog.Anchor({
  addTo: illo,
});

let hemisphere1 = new Zdog.Hemisphere({
  addTo: planet,
  diameter: 140,
  stroke: false,
  color: colors.primary1,
  backface: colors.primary2,
});

let hemisphere2 = new Zdog.Hemisphere({
  addTo: planet,
  diameter: 140,
  stroke: false,
  color: colors.primary2,
  rotate: new Zdog.Vector({ y: TAU / 2 }),
});

let moon1 = new Zdog.Hemisphere({
  addTo: moonBase,
  diameter: 60,
  color: colors.secondary,
  translate: { x: 80, y: -20, z: -80 },
  backface: colors.secondary2,
});

let moon2 = moon1.copy({
  rotate: new Zdog.Vector({ y: TAU / 2 }),
  color: colors.secondary2,
});

let stars: { anchor: Zdog.Anchor; ellipse: Zdog.Ellipse; speed: number }[] = [];

getRandomPositions(12).forEach((star) => {
  let anchor = new Zdog.Anchor({
    addTo: illo,
  });

  let ellipse = new Zdog.Ellipse({
    addTo: anchor,
    diameter: 1,
    stroke: 6,
    backface: true,
    fill: true,
    color: currentTheme === "dark" ? colors.starsOnDark : colors.starsOnLight,
    translate: { x: star.x, y: star.y },
  });

  stars.push({
    anchor,
    ellipse,
    speed: star.speed,
  });
});

// Loop fn
function animate() {
  planet.rotate.y += 0.005;
  moonBase.rotate.y += 0.01;

  stars.map((star) => (star.anchor.rotate.y += star.speed));

  illo.updateRenderGraph();

  requestAnimationFrame(animate);
}

// Render
export function initScenery() {
  if (window.innerWidth < 500) {
    illo.setSize(300, 300 / 1.5);
    illo.zoom = 0.9;
    illo.dragRotate = false;
  }

  animate();
}

theme.subs.push((theme) => {
  let color = theme === "dark" ? colors.starsOnDark : colors.starsOnLight;
  stars.map((star) => {
    star.ellipse.color = color;
  });
});
