import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Plus, Edit, Trash2, Play, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

const WheelManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wheels, setWheels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [wheelToDelete, setWheelToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = user?.role === 'SUPER' || user?.role === 'ADMIN';

  useEffect(() => {
    fetchWheels();
  }, []);

  const fetchWheels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getWheels();
      setWheels(response.data.wheels || []);
    } catch (error) {
      console.error('Error fetching wheels:', error);
      setError('Failed to load wheels. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWheel = () => {
    navigate('/wheels/new');
  };

  const handleEditWheel = (wheelId: string) => {
    navigate(`/wheels/${wheelId}`);
  };

  const confirmDelete = (wheelId: string) => {
    setWheelToDelete(wheelId);
    setShowDeleteModal(true);
  };

  const handleDeleteWheel = async () => {
    if (!wheelToDelete) return;

    try {
      setIsDeleting(true);
      await api.deleteWheel(wheelToDelete);
      // Remove the deleted wheel from state
      setWheels(wheels.filter(wheel => wheel.id !== wheelToDelete));
      setShowDeleteModal(false);
      setWheelToDelete(null);
    } catch (error) {
      console.error('Error deleting wheel:', error);
      setError('Failed to delete wheel. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (wheelId: string, currentState: boolean) => {
    try {
      await api.updateWheel(wheelId, { isActive: !currentState });
      // Update local state
      setWheels(
        wheels.map(wheel => 
          wheel.id === wheelId ? { ...wheel, isActive: !currentState } : wheel
        )
      );
    } catch (error) {
      console.error('Error toggling wheel status:', error);
      setError('Failed to update wheel status. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header section */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wheel Campaigns</h1>
          <p className="text-gray-600">
            Create and manage your prize wheels.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleCreateWheel}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Wheel
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Wheels list */}
      {wheels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <Play className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No wheels</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new wheel campaign.</p>
          {canEdit && (
            <button
              onClick={handleCreateWheel}
              className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              New Wheel
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Mode
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Slots
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Plays
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {wheels.map((wheel) => (
                  <tr key={wheel.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {wheel.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        wheel.mode === 'ALL_WIN' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {wheel.mode === 'ALL_WIN' ? 'All Win' : 'Random Win'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {canEdit ? (
                        <button 
                          onClick={() => handleToggleActive(wheel.id, wheel.isActive)}
                          className="flex items-center text-sm font-medium"
                          title={wheel.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {wheel.isActive ? (
                            <>
                              <ToggleRight className="mr-1 h-5 w-5 text-green-500" />
                              <span className="text-green-600">Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="mr-1 h-5 w-5 text-gray-400" />
                              <span className="text-gray-500">Inactive</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          wheel.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {wheel.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {wheel._count?.slots || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {wheel._count?.plays || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditWheel(wheel.id)}
                          className="rounded p-1 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-900"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => confirmDelete(wheel.id)}
                            className="rounded p-1 text-red-600 hover:bg-red-100 hover:text-red-900"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                      Delete Wheel
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this wheel? All associated data will be permanently removed.
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button 
                  type="button" 
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteWheel}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
                <button 
                  type="button" 
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WheelManager;