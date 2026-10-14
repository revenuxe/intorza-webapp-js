import { classifySpeechTurn, thinkingConfigForModel } from './turn-policy';
describe('conservative speech turn policy', () => {
  it.each(['hmm', 'um uh hmm', 'हम्म', 'अं उम्म', '...'])('ignores non-answer %s', text => {
    expect(classifySpeechTurn(text)).not.toBe('answer');
  });
  it.each(['हाँ', 'हां', 'haan', 'yes', 'no', 'six feet', 'साढ़े छह फीट', 'hmm 1200 per square foot'])('preserves meaningful answer %s', text => {
    expect(classifySpeechTurn(text)).toBe('answer');
  });
  it('rejects an exact long question echo without treating a short answer as echo', () => {
    expect(classifySpeechTurn('Who is this quotation for?', 'Who is this quotation for?')).toBe('echo');
    expect(classifySpeechTurn('Rahul', 'Who is this quotation for?')).toBe('answer');
  });
  it('uses low thinking for known Gemini 3 Flash models without configuring unknown models', () => {
    expect(thinkingConfigForModel('gemini-3.8-flash')).toEqual({ thinkingConfig: { thinkingLevel: 'LOW' } });
    expect(thinkingConfigForModel('gemini-2.0-flash')).toEqual({});
    expect(thinkingConfigForModel('custom-model')).toEqual({});
  });
});
