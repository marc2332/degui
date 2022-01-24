import { App } from "../../mod.ts";
import { dirname, join, fromFileUrl, toFileUrl } from "https://deno.land/std/path/mod.ts";
const __dirname = dirname(fromFileUrl(import.meta.url));

const getIndex = () => {
  const isDev = Deno.env.get("DEV") == "true";
  if (isDev) {
    return toFileUrl(`${join(__dirname, './renderer/src/index.html')}`).href;
  } else {
    return "https://rawcdn.githack.com/astrodon/astrodon/fdf9523e44f78c40290141f0288e0e1b468dc075/demo/index.html";
  }
};

const indexPath = getIndex();

const app = await App.new();

console.log(app.getDataPath())

await app.registerWindow({ title: "Fua", url: indexPath });

app.run();