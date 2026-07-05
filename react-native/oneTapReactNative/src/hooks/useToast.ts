import Toast from 'react-native-toast-message';
import { TOAST_DURATION_MS } from '@/config/constants';

type ToastType = 'success' | 'error' | 'info';

interface ShowOptions {
  title: string;
  message?: string;
  duration?: number;
}

const show = (type: ToastType, options: ShowOptions) => {
  Toast.show({
    type,
    text1: options.title,
    text2: options.message,
    position: 'top',
    visibilityTime: options.duration ?? TOAST_DURATION_MS,
    topOffset: 60,
  });
};

export const useToast = () => ({
  success: (opts: ShowOptions) => show('success', opts),
  error: (opts: ShowOptions) => show('error', opts),
  info: (opts: ShowOptions) => show('info', opts),
  hide: () => Toast.hide(),
});
