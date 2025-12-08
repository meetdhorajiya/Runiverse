export const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
export const isValidPassword = (password) => {
    return typeof password === "string" && password.length >= 6;
};
export const isValidUrl = (url) => {
    try {
        // eslint-disable-next-line no-new
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
export const isValidImageMime = (mimetype) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    return allowed.includes(mimetype);
};
export const hasRequiredFields = (obj, fields) => {
    if (!obj) {
        return false;
    }
    return fields.every((field) => obj[field] !== undefined && obj[field] !== null);
};
