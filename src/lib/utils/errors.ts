import { AxiosError } from "axios";

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return (
      error.response?.data?.message ??
      error.message ??
      "Something went wrong"
    );
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (error instanceof AxiosError) {
    return error.response?.data?.code;
  }
  return undefined;
}
