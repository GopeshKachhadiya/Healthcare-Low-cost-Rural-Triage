/**
 * Central API endpoint configuration.
 *
 * Override defaults at build/deploy time via Vite environment variables:
 *
 *   VITE_API_BASE_URL      — Patient Orchestrator (default: http://localhost:9000)
 *   VITE_CV_API_BASE_URL   — CV/ML screening service (default: http://localhost:8005)
 *   VITE_A1_URL            — Appointment Manager agent (default: http://localhost:8011)
 *   VITE_HOSPITAL_AI_URL   — Hospital-side AI prediction service (default: http://localhost:8003)
 *
 * Create a `.env.local` file (gitignored) or set these in your hosting provider
 * (Vercel, Netlify, Render, etc.) to point to your deployed backend.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:9000";

export const CV_API_BASE_URL: string =
  (import.meta.env.VITE_CV_API_BASE_URL as string) || "http://localhost:8005";

export const A1_URL: string =
  (import.meta.env.VITE_A1_URL as string) || "http://localhost:8011";

export const HOSPITAL_AI_URL: string =
  (import.meta.env.VITE_HOSPITAL_AI_URL as string) || "http://localhost:8003";
