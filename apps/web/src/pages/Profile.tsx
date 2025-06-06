import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/use-toast";
import { User, Shield, Mail, Building, CreditCard, Clock, Settings, Key } from "lucide-react";

const Profile = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const avatarUrl = user ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user.email || 'user') + '&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50' : '';

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.getProfile();
                setUserData(response.data.user);
                setIsLoading(false);
            } catch (error) {
                setError("Erreur lors du chargement du profil");
                setIsLoading(false);
                toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: "Impossible de charger les informations du profil"
                });
            }
        };

        fetchUserData();
    }, [user?.id, toast]);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
            </div>
        );
    }

    const profileData = userData || user;

    if (!profileData) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="text-xl font-bold text-red-500">Profil non disponible</div>
                <button 
                    onClick={() => navigate('/dashboard')} 
                    className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                >
                    Retour au tableau de bord
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-[#f3f0f9] p-2 sm:p-4 md:p-6">
            <div className="mx-auto max-w-4xl">
                <h1 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold text-gray-900">Mon Profil</h1>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Profile Card */}
                    <div className="lg:col-span-1">
                        <div className="flex flex-col items-center rounded-2xl bg-white p-4 sm:p-6 shadow">
                            <div className="mb-3 sm:mb-4 h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-full border-4 border-indigo-100 shadow-lg">
                                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{profileData.email?.split('@')[0]}</h2>
                            <p className="text-sm sm:text-base text-gray-500">{profileData.email}</p>
                            
                            <div className="mt-3 sm:mt-4 flex w-full flex-col space-y-2">
                                <div className="rounded-lg bg-indigo-50 p-2 sm:p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs sm:text-sm text-gray-500">Rôle</span>
                                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 sm:px-3 sm:py-1 text-xs font-medium text-indigo-800">
                                            {profileData.role === 'SUPER' ? 'Super Admin' : 
                                            profileData.role === 'ADMIN' ? 'Administrateur' : 'Sous-administrateur'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="rounded-lg bg-green-50 p-2 sm:p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs sm:text-sm text-gray-500">Statut Premium</span>
                                        <span className={`rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-xs font-medium ${
                                            profileData.isPaid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {profileData.isPaid ? 'Premium' : 'Standard'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                className="mt-6 w-full rounded-lg bg-indigo-600 py-2 text-white hover:bg-indigo-700"
                                onClick={() => navigate('/change-password')}
                            >
                                Changer le mot de passe
                            </button>
                        </div>
                    </div>
                    
                    {/* Détails du profil */}
                    <div className="lg:col-span-2 rounded-2xl bg-white p-4 sm:p-6 shadow">
                        <h3 className="mb-3 sm:mb-4 text-lg font-semibold text-gray-900">Informations du compte</h3>
                        
                        <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
                                <div className="mb-1.5 sm:mb-2 flex items-center">
                                    <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                                    <span className="font-medium text-sm sm:text-base text-gray-700">Nom d'utilisateur</span>
                                </div>
                                <p className="text-sm sm:text-base text-gray-600">{profileData.name || profileData.email?.split('@')[0] || 'Non défini'}</p>
                            </div>
                            
                            <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
                                <div className="mb-1.5 sm:mb-2 flex items-center">
                                    <Mail className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                                    <span className="font-medium text-sm sm:text-base text-gray-700">Email</span>
                                </div>
                                <p className="text-sm sm:text-base text-gray-600 break-words">{profileData.email}</p>
                            </div>
                            
                            <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
                                <div className="mb-1.5 sm:mb-2 flex items-center">
                                    <Shield className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                                    <span className="font-medium text-sm sm:text-base text-gray-700">Rôle</span>
                                </div>
                                <p className="text-sm sm:text-base text-gray-600">{
                                    profileData.role === 'SUPER' ? 'Super Administrateur' : 
                                    profileData.role === 'ADMIN' ? 'Administrateur' : 'Sous-administrateur'
                                }</p>
                            </div>
                            
                            {profileData.companyId && (
                                <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
                                    <div className="mb-1.5 sm:mb-2 flex items-center">
                                        <Building className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                                        <span className="font-medium text-sm sm:text-base text-gray-700">Entreprise</span>
                                    </div>
                                    <p className="text-sm sm:text-base text-gray-600">ID: {profileData.companyId}</p>
                                </div>
                            )}
                            
                            <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
                                <div className="mb-1.5 sm:mb-2 flex items-center">
                                    <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                                    <span className="font-medium text-sm sm:text-base text-gray-700">Type de compte</span>
                                </div>
                                <p className="text-sm sm:text-base text-gray-600">{profileData.isPaid ? 'Premium' : 'Standard'}</p>
                            </div>
                            
                            <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
                                <div className="mb-1.5 sm:mb-2 flex items-center">
                                    <Clock className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                                    <span className="font-medium text-sm sm:text-base text-gray-700">ID Utilisateur</span>
                                </div>
                                <p className="text-xs sm:text-sm font-mono text-gray-600 break-all">{profileData.id}</p>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-200 pt-3 sm:pt-4">
                            <h4 className="mb-2 text-sm sm:text-base font-medium text-gray-700">Actions</h4>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button 
                                    className="flex items-center justify-center sm:justify-start rounded-lg border border-gray-300 px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => navigate('/account-settings')}
                                >
                                    <Settings className="mr-2 h-4 w-4" /> Paramètres du compte
                                </button>
                                <button 
                                    className="flex items-center justify-center sm:justify-start rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-sm text-white hover:bg-indigo-700 transition"
                                    onClick={() => navigate('/change-password')}
                                >
                                    <Key className="mr-2 h-4 w-4" /> Changer le mot de passe
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
