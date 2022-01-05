import { Plug } from "https://deno.land/x/plug/mod.ts";
import { join } from "https://deno.land/std/path/mod.ts";
import { writeBinary } from "./utils.ts";

if (Deno.build.os === "windows") {
  const mod = Deno.dlopen("kernel32.dll", {
    FreeConsole: {
      parameters: [],
      result: "void",
    },
  });
  mod.symbols.FreeConsole();
}

async function getLibraryLocation(): Promise<string> {
  if (Deno.env.get("DEV") == "false") {
    const name = "astrodon";
    const dir = join(
      Deno.env.get("APPDATA") || Deno.env.get("HOME") || Deno.cwd(),
      name,
    );
    await writeBinary(dir);
    const libPath = await Deno.realPath(join(dir, "lib"));
    return libPath;
  } else {
    const libPath = await Deno.realPath("./target/debug/");
    return libPath;
  }
}

interface WindowConfig {
  title: string;
  url: string;
}

interface AppConfig {
  windows: WindowConfig[];
}

export class App<S extends Record<string, Deno.ForeignFunction>> {
  private windows: WindowConfig[];
  private lib: Deno.DynamicLibrary<S>;
  private app_ptr: Deno.UnsafePointer | undefined;

  constructor(lib: Deno.DynamicLibrary<S>, windows: WindowConfig[]) {
    this.windows = windows;
    this.lib = lib;
  }

  public static async withWindows(windows: WindowConfig[]) {
    const libPath = await getLibraryLocation();

    const options: Plug.Options = {
      name: "astrodon",
      url: libPath,
      policy: Plug.CachePolicy.NONE,
    };

    const library = await Plug.prepare(options, {
      create_app: { parameters: ["pointer", "usize"], result: "pointer" },
      run_app: { parameters: ["pointer"], result: "pointer" },
      send_message: {
        parameters: ["pointer", "usize", "pointer"],
        result: "pointer",
      },
    });

    return new App(library, windows);
  }

  public run(): void {
    const config: AppConfig = {
      windows: this.windows,
    };

    this.app_ptr = this.lib.symbols.create_app(
      ...encode(config),
    ) as Deno.UnsafePointer;
    this.app_ptr = this.lib.symbols.run_app(this.app_ptr) as Deno.UnsafePointer;
  }

  public send(msg: string): void {
    this.app_ptr = this.lib.symbols.send_message(
      ...encode(msg),
      this.app_ptr,
    ) as Deno.UnsafePointer;
  }
}

function encode(val: unknown): [Uint8Array, number] {
  const objectStr = JSON.stringify(val);
  const buf = new TextEncoder().encode(objectStr);
  return [buf, buf.length];
}