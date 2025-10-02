// jq version configuration
export interface JQVersionConfig {
  version: string;
  revision: string;
  sha256: string;
}

let cachedVersionConfig: JQVersionConfig | null = null;

// Get the jq version configuration from public/jq-version.json
export async function getJQVersionConfig(): Promise<JQVersionConfig> {
  if (cachedVersionConfig) {
    return cachedVersionConfig;
  }
  
  try {
    const response = await fetch('/jq-version.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch version config: ${response.status}`);
    }
    cachedVersionConfig = await response.json();
    return cachedVersionConfig;
  } catch (error) {
    console.warn('Failed to load jq version config, using fallback:', error);
    // Fallback to current version if fetch fails
    cachedVersionConfig = {
      version: "1.8.1",
      revision: "jq-1.8.1", 
      sha256: "sha256-R+tW0biyJrZqF8965ZbplJNDKr7vdrm7ndaccH7c4Ds="
    };
    return cachedVersionConfig;
  }
}

// Get versioned filename (convert dots to dashes)
export async function getVersionedFilename(basename: string): Promise<string> {
  const config = await getJQVersionConfig();
  const versionSuffix = config.version.replace(/\./g, '-');
  const [name, ext] = basename.split('.');
  return `${name}_${versionSuffix}.${ext}`;
}