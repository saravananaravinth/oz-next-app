// oz-next-app/src/lib/errors.ts
export class AppError extends Error {
  public readonly code: string;
  public readonly details: unknown;

  public constructor(
    message: string,
    code: string,
    details?: unknown,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends AppError {
  public constructor(
    message = "Network request failed.",
    code = "network_error",
    cause?: unknown,
  ) {
    super(message, code, undefined, cause);
    this.name = "NetworkError";
  }
}
