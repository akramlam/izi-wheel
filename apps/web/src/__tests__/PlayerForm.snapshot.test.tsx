import React from 'react';
import { render } from '@testing-library/react';
import PlayerForm, { FormField } from '../components/PlayerForm';

// Mock fields for testing
const mockFields: FormField[] = [
  { name: 'name', label: 'Nom', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Téléphone', type: 'tel', required: false },
  { name: 'birthDate', label: 'Date de naissance', type: 'date', required: false },
];

describe('PlayerForm Snapshots', () => {
  it('renders correctly', () => {
    const { container } = render(
      <PlayerForm 
        fields={mockFields} 
        onSubmit={() => {}} 
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders correctly in loading state', () => {
    const { container } = render(
      <PlayerForm 
        fields={mockFields} 
        onSubmit={() => {}} 
        isSubmitting={true}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with only required fields', () => {
    const { container } = render(
      <PlayerForm 
        fields={mockFields.filter(field => field.required)} 
        onSubmit={() => {}} 
      />
    );
    expect(container).toMatchSnapshot();
  });
}); 