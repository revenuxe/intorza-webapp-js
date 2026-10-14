export function prepareVoiceAudio(player: HTMLAudioElement) {
  player.preload = 'auto'; player.muted = false; player.volume = 1;
  player.setAttribute('playsinline', '');
  player.setAttribute('webkit-playsinline', '');
}

// Avoid depending on AbortSignal.any/timeout in older mobile WebViews/Safari.
export function timedVoiceRequest(parent: AbortSignal, milliseconds: number) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (parent.aborted) cancel(); else parent.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, milliseconds);
  return { signal: controller.signal, dispose: () => { clearTimeout(timer); parent.removeEventListener('abort', cancel); } };
}
