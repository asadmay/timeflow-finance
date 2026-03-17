// Load .env files at module initialization time (before any other imports)
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export function loadEnv() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const loadEnvFile = (filePath: string) => {
    try {
      if (!existsSync(filePath)) {
        console.debug(`[env] File not found: ${filePath}`);
        return;
      }
      
      console.debug(`[env] Loading: ${filePath}`);
      const lines = readFileSync(filePath, "utf-8").split("\n");
      let count = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
        
        if (!process.env[key]) {
          process.env[key] = val;
          count++;
        }
      }
      
      console.debug(`[env] Loaded ${count} variables from ${filePath}`);
    } catch (err: any) {
      console.warn(`[env] Failed to load ${filePath}:`, err.message);
    }
  };

  // Load .env.local first (development overrides), then .env (shared)
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  loadEnvFile(resolve(process.cwd(), ".env"));
  
  // Verify DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error("[env] DATABASE_URL environment variable is not set!");
    console.error("[env] Please create .env.local or .env file with DATABASE_URL");
  }
}

// Load immediately on import
loadEnv();
