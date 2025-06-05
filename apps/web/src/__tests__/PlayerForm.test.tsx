import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerForm, { FormField } from '../components/PlayerForm';

// Mock fields for testing
const mockFields: FormField[] = [
  { name: 'name', label: 'Nom', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Téléphone', type: 'tel', required: false },
  { name: 'birthDate', label: 'Date de naissance', type: 'date', required: false },
];

describe('PlayerForm', () => {
  const mockSubmit = jest.fn();

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it('renders correctly with all fields', () => {
    render(<PlayerForm fields={mockFields} onSubmit={mockSubmit} />);
    
    // Check if all fields are rendered
    expect(screen.getByLabelText(/Nom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Téléphone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date de naissance/i)).toBeInTheDocument();
    
    // Check if the submit button is rendered
    expect(screen.getByRole('button', { name: /Récupérer mon prix/i })).toBeInTheDocument();
  });

  it('displays validation errors for invalid inputs', async () => {
    render(<PlayerForm fields={mockFields} onSubmit={mockSubmit} />);
    
    // Try to submit with empty fields
    fireEvent.click(screen.getByRole('button', { name: /Récupérer mon prix/i }));
    
    // Wait for validation messages
    await waitFor(() => {
      expect(screen.getByText(/Le nom doit contenir au moins 2 caractères/i)).toBeInTheDocument();
      expect(screen.getByText(/Veuillez entrer une adresse email valide/i)).toBeInTheDocument();
    });
    
    // Submit should not be called
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits the form with valid data', async () => {
    render(<PlayerForm fields={mockFields} onSubmit={mockSubmit} />);
    
    // Fill the required fields
    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Récupérer mon prix/i }));
    
    // Wait for the submission
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '',
        birthDate: '',
      });
    });
  });

  it('shows loading state when isSubmitting is true', () => {
    render(<PlayerForm fields={mockFields} onSubmit={mockSubmit} isSubmitting={true} />);
    
    // Check for loading indicator
    expect(screen.getByText(/Chargement/i)).toBeInTheDocument();
    
    // Button should be disabled
    expect(screen.getByRole('button')).toBeDisabled();
  });
}); 