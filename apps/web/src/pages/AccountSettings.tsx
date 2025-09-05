import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/use-toast";
import { User, Mail, Save, ArrowLeft } from "lucide-react";

const AccountSettings = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
    });
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.getProfile();
                const userData = response.data.user;
                setUserData(userData);
                setFormData({
                    name: userData.name || "",
                    email: userData.email || "",
                });
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            // Simuler un appel API pour mettre à jour le profil
            // Dans une implémentation réelle, vous auriez un endpoint API pour cela
            await api.updateUser(user?.id || "", formData);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            toast({
                title: "Succès",
                description: "Vos paramètres ont été mis à jour avec succès"
            });

            // Actualiser les données utilisateur
            await refreshUser();
            
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de mettre à jour vos paramètres"
            });
        } finally {
            setIsSaving(false);
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
        <div className="container mx-auto p-4">
            <div className="mb-6 flex items-center">
                <button 
                    onClick={() => navigate('/profile')}
                    className="mr-3 rounded-full p-2 hover:bg-gray-100"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Paramètres du compte</h1>
            </div>
            
            <div className="rounded-2xl bg-white p-6 shadow">
                <form onSubmit={handleSubmit}>
                    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                                <User className="mr-2 inline-block h-4 w-4 align-text-bottom" />
                                Nom d'utilisateur
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Votre nom"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                                <Mail className="mr-2 inline-block h-4 w-4 align-text-bottom" />
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="votre@email.com"
                                disabled
                            />
                            <p className="mt-1 text-xs text-gray-500">L'email ne peut pas être modifié</p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700 focus:outline-none ${
                                isSaving ? "cursor-not-allowed opacity-70" : ""
                            }`}
                        >
                            {isSaving ? (
                                <>
                                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Enregistrement...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Enregistrer les modifications
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccountSettings; 