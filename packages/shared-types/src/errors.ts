export type ErrorCode =
  | "UNAUTHENTICATED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "INVALID_ARGUMENT"
  | "FAILED_PRECONDITION"
  | "ALREADY_EXISTS"
  | "DEADLINE_EXCEEDED"
  | "INTERNAL"
  | "UNAVAILABLE";

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}

export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err
  );
}