import React from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}
  
interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogCloseProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

// Create a context to share the onOpenChange function
const DialogContext = React.createContext<{ onOpenChange: (open: boolean) => void } | null>(null);

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  const handleBackdropClick = () => {
    onOpenChange(false);
  };

  return (
    <DialogContext.Provider value={{ onOpenChange }}>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Backdrop - Ensure full viewport coverage with inline styles */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1
          }}
          onClick={handleBackdropClick}
        />
        {/* Dialog content */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );
};

export const DialogContent: React.FC<DialogContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 max-w-md w-full ${className}`}>
      {children}
    </div>
  );
};

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
};

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className = '' }) => {
  return (
    <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h2>
  );
};

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, className = '' }) => {
  return (
    <p className={`text-sm text-gray-600 mt-2 ${className}`}>
      {children}
    </p>
  );
};

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`mt-6 flex justify-end space-x-2 ${className}`}>
      {children}
    </div>
  );
}; 

export const DialogClose: React.FC<DialogCloseProps> = ({ children, className = '', asChild = false }) => {
  const context = React.useContext(DialogContext);

  if (!context) {
    console.error('DialogClose must be used within a Dialog component');
    return <>{children}</>;
  }

  const handleClick = () => {
    context.onOpenChange(false);
  };

  if (asChild && React.isValidElement(children)) {
    // Clone the child element and merge the onClick handler
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        // Call the original onClick if it exists
        if ((children as any).props.onClick) {
          (children as any).props.onClick(e);
        }
        handleClick();
      }
    });
  }

  // Default behavior: wrap children in a button
  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
};