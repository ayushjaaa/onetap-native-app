import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

export type NormalizedError = {
  status: number;
  message: string;
  isNetworkError: boolean;
  isAuthError: boolean;
  isServerError: boolean;
};

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_MESSAGE = 'Check your internet connection and try again.';
const SERVER_MESSAGE =
  "Something's not right on our end. Please try again shortly.";

export const mapApiError = (
  err: FetchBaseQueryError | SerializedError | undefined,
): NormalizedError => {
  if (!err) {
    return {
      status: 0,
      message: FALLBACK_MESSAGE,
      isNetworkError: false,
      isAuthError: false,
      isServerError: false,
    };
  }

  // FetchBaseQueryError
  if ('status' in err) {
    const status = err.status;

    // Network / fetch errors
    if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') {
      return {
        status: 0,
        message: NETWORK_MESSAGE,
        isNetworkError: true,
        isAuthError: false,
        isServerError: false,
      };
    }

    if (status === 'PARSING_ERROR' || status === 'CUSTOM_ERROR') {
      return {
        status: 0,
        message: FALLBACK_MESSAGE,
        isNetworkError: false,
        isAuthError: false,
        isServerError: false,
      };
    }

    const numericStatus = typeof status === 'number' ? status : 0;
    const data = err.data as { message?: string } | undefined;
    const backendMessage = data?.message;

    if (numericStatus >= 500) {
      return {
        status: numericStatus,
        message: backendMessage || SERVER_MESSAGE,
        isNetworkError: false,
        isAuthError: false,
        isServerError: true,
      };
    }

    return {
      status: numericStatus,
      message: backendMessage || FALLBACK_MESSAGE,
      isNetworkError: false,
      isAuthError: numericStatus === 401,
      isServerError: false,
    };
  }

  // SerializedError fallback
  return {
    status: 0,
    message: err.message || FALLBACK_MESSAGE,
    isNetworkError: false,
    isAuthError: false,
    isServerError: false,
  };
};
