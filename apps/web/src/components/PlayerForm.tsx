import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Mail, Phone, Calendar, User } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

// Define form schema
export const playerFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Le nom doit contenir au moins 2 caractères.',
  }),
  email: z.string().email({
    message: 'Veuillez entrer une adresse email valide.',
  }),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
});

export type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
};

export type PlayerFormData = z.infer<typeof playerFormSchema>;

interface PlayerFormProps {
  fields: FormField[];
  onSubmit: (data: PlayerFormData) => void;
  isSubmitting?: boolean;
}

export function PlayerForm({ fields, onSubmit, isSubmitting = false }: PlayerFormProps) {
  // Create form instance
  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      birthDate: '',
    },
  });

  // Filter fields that should be displayed
  const visibleFields = fields.filter(field => 
    ['name', 'email', 'phone', 'birthDate'].includes(field.name)
  );

  // Handle form submission
  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
  });

  // Mapping input types to icons
  const inputIcons: Record<string, React.ReactNode> = {
    name: <User className="h-5 w-5 text-gray-500" />,
    email: <Mail className="h-5 w-5 text-gray-500" />,
    phone: <Phone className="h-5 w-5 text-gray-500" />,
    birthDate: <Calendar className="h-5 w-5 text-gray-500" />,
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-2xl font-semibold text-center text-indigo-700 mb-6">
        Entrez vos coordonnées
      </h2>
      
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {visibleFields.map((field) => (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name as keyof PlayerFormData}
                render={({ field: formField }) => (
                  <FormItem className={field.name === 'email' || field.name === 'name' ? 'col-span-full' : ''}>
                    <FormLabel className="text-gray-600">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </FormLabel>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        {inputIcons[field.name]}
                      </div>
                      <FormControl>
                        <Input
                          type={field.type}
                          placeholder={`Votre ${field.label.toLowerCase()}`}
                          className={`
                            pl-10 py-3 h-auto bg-white rounded-lg border-gray-300 
                            text-gray-800 ring-offset-white focus-visible:ring-2 
                            focus-visible:ring-indigo-500 focus-visible:ring-offset-1
                            w-full
                          `}
                          required={field.required}
                          {...formField}
                        />
                      </FormControl>
                      <FormMessage className="text-sm mt-1" />
                    </div>
                  </FormItem>
                )}
              />
            ))}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full md:w-auto md:px-8 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-3 rounded-lg shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isSubmitting ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Chargement...
              </>
            ) : (
              "Tournez la roue !"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default PlayerForm; 