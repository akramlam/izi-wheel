import React, { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

interface ImageUploadProps {
  onImageUpload: (url: string) => void;
  currentImageUrl?: string;
  imageType: 'banner' | 'background';
  title: string;
  description: string;
  recommendedSize: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  currentImageUrl,
  imageType,
  title,
  description,
  recommendedSize
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const [urlInput, setUrlInput] = useState(currentImageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Veuillez sélectionner un fichier image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La taille du fichier ne doit pas dépasser 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Get company ID for the API call
      const getValidCompanyId = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return null;
          
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/companies/validate-access`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.companyId;
          }
        } catch (error) {
          console.error('Error getting company ID:', error);
        }
        return null;
      };

      const companyId = await getValidCompanyId();
      if (!companyId) {
        throw new Error('Impossible de récupérer les informations de l\'entreprise');
      }

      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBaseUrl}/companies/${companyId}/wheels/upload-image?type=${imageType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      const result = await response.json();
      
      if (result.success) {
        setPreviewUrl(result.url);
        onImageUpload(result.url);
        setUrlInput(result.url);
      } else {
        throw new Error(result.error || 'Erreur de téléchargement');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Erreur de téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput) {
      setPreviewUrl(urlInput);
      onImageUpload(urlInput);
      setUploadError(null);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setUrlInput('');
    onImageUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const previewHeight = imageType === 'banner' ? 'h-20' : 'h-32';

  return (
    <div className="space-y-3">
      <Label>{title}</Label>
      
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-3">
        <Button
          type="button"
          variant={inputMode === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('url')}
        >
          URL
        </Button>
        <Button
          type="button"
          variant={inputMode === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMode('upload')}
        >
          Télécharger
        </Button>
      </div>

      {/* URL Input Mode */}
      {inputMode === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder={`https://example.com/votre-${imageType}.jpg`}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <Button
              type="button"
              onClick={handleUrlSubmit}
              size="sm"
            >
              Appliquer
            </Button>
          </div>
        </div>
      )}

      {/* File Upload Mode */}
      {inputMode === 'upload' && (
        <div className="space-y-2">
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {isUploading ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-sm text-gray-600">Téléchargement en cours...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Cliquez pour sélectionner une image ou glissez-déposez
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu'à 5MB</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {uploadError && (
        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
          {uploadError}
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-gray-500">{description} (recommandé: {recommendedSize})</p>

      {/* Image Preview */}
      {previewUrl && (
        <div className="mt-3 p-3 border rounded-lg bg-gray-50 relative">
          <div className="absolute top-2 right-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <img 
            src={previewUrl} 
            alt={`Aperçu ${imageType}`} 
            className={`w-full ${previewHeight} object-cover rounded`}
            onError={(e) => {
              setUploadError('Impossible de charger l\'image');
              setPreviewUrl(null);
            }}
          />
        </div>
      )}
    </div>
  );
}; 