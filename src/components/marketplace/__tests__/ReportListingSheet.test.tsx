import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReportListingSheet } from '@/components/marketplace/ReportListingSheet';

const renderSheet = async (onSubmit = jest.fn()) => {
  const utils = await render(
    <ReportListingSheet
      visible
      submitting={false}
      onClose={jest.fn()}
      onSubmit={onSubmit}
    />,
  );
  return { ...utils, onSubmit };
};

describe('ReportListingSheet', () => {
  it('does not submit until a reason is picked', async () => {
    const { getByTestId, onSubmit } = await renderSheet();

    await fireEvent.press(getByTestId('report-submit-button'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the picked reason label', async () => {
    const { getByTestId, onSubmit } = await renderSheet();

    await fireEvent.press(getByTestId('report-reason-Already sold'));
    await fireEvent.press(getByTestId('report-submit-button'));

    expect(onSubmit).toHaveBeenCalledWith('Already sold');
  });

  it('requires at least 10 characters of detail for "Other", and sends that text', async () => {
    const { getByTestId, onSubmit } = await renderSheet();

    await fireEvent.press(getByTestId('report-reason-Other'));
    await fireEvent.changeText(getByTestId('report-other-input'), 'too short');
    await fireEvent.press(getByTestId('report-submit-button'));
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(
      getByTestId('report-other-input'),
      '  Seller asked for advance payment  ',
    );
    await fireEvent.press(getByTestId('report-submit-button'));
    expect(onSubmit).toHaveBeenCalledWith('Seller asked for advance payment');
  });
});
