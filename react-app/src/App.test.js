import { render, screen } from '@testing-library/react';
import App from './App';

test('renders components', () => {
  render(<App />);
  const textElement = screen.getByText(/Drag elements from the left/i);
  expect(textElement).toBeInTheDocument();
});
