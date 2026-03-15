// Центральный конфиг API — всё в одном месте
// Чтобы сменить сервер — меняй только здесь или через .env.local

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
