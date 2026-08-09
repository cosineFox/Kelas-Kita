export class ConfigurationError extends Error {
  constructor(name) {
    super(`Missing or invalid server configuration: ${name}`);
    this.name = "ConfigurationError";
    this.code = "service_not_configured";
  }
}

export const requireEnv = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new ConfigurationError(name);
  return value;
};

export const isProduction = () => process.env.VERCEL_ENV === "production";
