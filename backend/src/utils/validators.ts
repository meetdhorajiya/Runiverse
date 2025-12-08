export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPassword = (password: unknown): password is string => {
  return typeof password === "string" && password.length >= 6;
};

export const isValidUrl = (url: string): boolean => {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidImageMime = (mimetype: string): boolean => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  return allowed.includes(mimetype);
};

export const hasRequiredFields = (obj: Record<string, unknown> | null | undefined, fields: string[]): boolean => {
  if (!obj) {
    return false;
  }

  return fields.every((field) => obj[field] !== undefined && obj[field] !== null);
};
