import { trackMetaEvent } from './meta-pixel';

it('sends standard events only when the Meta Pixel is available', () => {
  const fbq = jest.fn();
  window.fbq = fbq;

  trackMetaEvent('CompleteRegistration');

  expect(fbq).toHaveBeenCalledWith('track', 'CompleteRegistration');
});
