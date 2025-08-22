import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// Simple component for testing
const SimpleCard = ({ title, description }: { title: string; description: string }) => (
  <View testID="card-container">
    <Text testID="card-title">{title}</Text>
    <Text testID="card-description">{description}</Text>
  </View>
);

describe('SimpleCard Component', () => {
  it('should render correctly', () => {
    const { getByTestId } = render(
      <SimpleCard title="Test Title" description="Test Description" />
    );
    
    expect(getByTestId('card-container')).toBeTruthy();
    expect(getByTestId('card-title')).toBeTruthy();
    expect(getByTestId('card-description')).toBeTruthy();
  });

  it('should display the correct text', () => {
    const { getByText } = render(
      <SimpleCard title="True Crime Documentary" description="A fascinating case study" />
    );
    
    expect(getByText('True Crime Documentary')).toBeTruthy();
    expect(getByText('A fascinating case study')).toBeTruthy();
  });

  it('should handle empty strings', () => {
    const { getByTestId } = render(
      <SimpleCard title="" description="" />
    );
    
    expect(getByTestId('card-title')).toBeTruthy();
    expect(getByTestId('card-description')).toBeTruthy();
  });

  it('should handle long text', () => {
    const longTitle = 'This is a very long title that might overflow the container and needs to be handled properly';
    const longDescription = 'This is an extremely long description that contains multiple sentences. It describes a complex true crime case with many details and should be rendered correctly regardless of length.';
    
    const { getByText } = render(
      <SimpleCard title={longTitle} description={longDescription} />
    );
    
    expect(getByText(longTitle)).toBeTruthy();
    expect(getByText(longDescription)).toBeTruthy();
  });
});